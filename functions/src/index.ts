import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import * as logger from 'firebase-functions/logger';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
// Load environment variables from root .env for local development
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { ConfigService } from './services/config-service';
import { AiService } from './services/ai-service';
import { SpotifyService } from './services/spotify-service';
import { PlaylistOrchestrator } from './core/orchestrator';
import { TrackCleaner } from './core/track-cleaner';
import { SlotManager } from './core/slot-manager';
import { FirestoreLogger } from './services/firestore-logger';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { db } from './config/firebase';

import { onCall, HttpsError } from 'firebase-functions/v2/https';

// --- Token Management Helpers ---

/**
 * Retrieves an authorized SpotifyService for a user, reusing cached access tokens if valid.
 */
async function getAuthorizedSpotifyService(uid: string): Promise<{
  service: SpotifyService;
  originalRefreshToken: string;
}> {
  const userSecretSnap = await db.doc(`users/${uid}/secrets/spotify`).get();
  if (!userSecretSnap.exists) {
    throw new HttpsError('failed-precondition', 'Please link your Spotify account first.');
  }

  const data = userSecretSnap.data() || {};
  const { refreshToken, accessToken, expiresAt } = data;

  if (!refreshToken) {
    throw new HttpsError('failed-precondition', 'Spotify refresh token missing.');
  }

  const spotifyService = SpotifyService.createForUser(refreshToken);

  // If we have a cached access token, use it to avoid unnecessary refresh
  if (accessToken && expiresAt) {
    const expiresAtEpoch = new Date(expiresAt).getTime();
    const now = Date.now();
    // Only use if it has more than 5 mins left
    if (now + 5 * 60 * 1000 < expiresAtEpoch) {
      spotifyService.setAccessToken(accessToken, (expiresAtEpoch - now) / 1000);
    }
  }

  return { service: spotifyService, originalRefreshToken: refreshToken };
}

/**
 * Persists any updated tokens (including rotated refresh tokens) back to Firestore.
 */
async function persistSpotifyTokens(
  uid: string,
  service: SpotifyService,
  originalRefreshToken: string
) {
  const newRefreshToken = service.getRefreshToken();
  const newAccessToken = service.getAccessToken();
  const newExpiresAt = service.getTokenExpirationEpoch();

  const updates: {
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: string;
    updatedAt?: string;
  } = {};
  // Only update if refresh token actually rotated
  if (newRefreshToken && newRefreshToken !== originalRefreshToken) {
    updates.refreshToken = newRefreshToken;
  }
  // Always update access token cache if available/fresh
  if (newAccessToken) {
    updates.accessToken = newAccessToken;
    updates.expiresAt = new Date(newExpiresAt).toISOString();
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    try {
      await db.doc(`users/${uid}/secrets/spotify`).set(updates, { merge: true });
      logger.info(`Persisted updated Spotify tokens for user ${uid}`);
    } catch (e) {
      logger.error(`Failed to persist updated Spotify tokens for user ${uid}`, e);
    }
  }
}

// Shared logic for both onRequest (Cron/HTTP) and onCall (Web App)
export async function runOrchestrator(playlistId?: string, callerUid?: string) {
  const configService = new ConfigService();
  let configs: PlaylistConfig[] = [];

  try {
    if (playlistId) {
      const config = await configService.getPlaylistConfig(playlistId);
      if (!config) {
        logger.warn(`Playlist config not found for ID: ${playlistId}`);
        return { message: 'Playlist not found.', results: [] };
      }
      configs = [config];
    } else {
      configs = await configService.getEnabledPlaylists();
      // SECURITY: If called by a user, only process THEIR playlists
      if (callerUid) {
        configs = configs.filter((c) => c.ownerId === callerUid);
      }
      if (configs.length === 0) {
        logger.info('No enabled playlists found to update.');
        return { message: 'No enabled playlists found.', results: [] };
      }
    }
  } catch (e) {
    logger.error('Failed to load configuration from Firestore', e);
    throw new Error('Configuration Back-end Error: ' + (e as Error).message);
  }

  // 1. Stateless Services
  const aiService = new AiService();
  const trackCleaner = new TrackCleaner();
  const slotManager = new SlotManager();
  const firestoreLogger = new FirestoreLogger();

  const results = [];

  for (const playlistConfig of configs) {
    try {
      // 2. Multi-Tenancy Check
      if (!playlistConfig.ownerId) {
        throw new Error(`Playlist ${playlistConfig.name} is orphaned (no ownerId).`);
      }

      // 3. Fetch User's Spotify Token & Create Orchestrator
      const { service: spotifyService, originalRefreshToken } = await getAuthorizedSpotifyService(
        playlistConfig.ownerId
      );

      // 4. Create Orchestrator (handles Spotify auth internally)
      const orchestrator = new PlaylistOrchestrator(
        aiService,
        trackCleaner,
        slotManager,
        firestoreLogger
      );

      // 5. Execute
      await orchestrator.curatePlaylist(playlistConfig);

      // 6. Persist any token updates (Important for rotation)
      await persistSpotifyTokens(playlistConfig.ownerId, spotifyService, originalRefreshToken);

      results.push({ name: playlistConfig.name, status: 'success' });
    } catch (error) {
      const errMsg = (error as Error).message;
      logger.error(`Error processing playlist ${playlistConfig.name}`, error);

      // Handle Critical Auth Failures (Revoked access, deleted account)
      if (
        (errMsg.includes('invalid_grant') || errMsg.includes('unauthorized')) &&
        playlistConfig.ownerId
      ) {
        await db
          .doc(`users/${playlistConfig.ownerId}/secrets/spotify`)
          .set({ status: 'invalid', error: errMsg }, { merge: true });

        await firestoreLogger.logActivity(
          playlistConfig.ownerId,
          'error',
          'Spotify connection lost. Please re-link your account in the Dashboard.',
          { playlistId: playlistConfig.id, error: errMsg }
        );
      } else if (playlistConfig.ownerId) {
        // Log other errors as well
        await firestoreLogger.logActivity(
          playlistConfig.ownerId,
          'error',
          `Failed to curate "${playlistConfig.name}"`,
          { playlistId: playlistConfig.id, error: errMsg }
        );
      }

      results.push({
        name: playlistConfig.name,
        status: 'error',
        error: errMsg
      });
    }

    // Rate Limit Defense: Wait 2s between playlists to avoid spiking the API
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { message: 'Playlist update completed', results };
}

export const updatePlaylists = onRequest(
  {
    timeoutSeconds: 540,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (_request, response) => {
    logger.info('Received request to update playlists (HTTP).');
    try {
      const result = await runOrchestrator();
      response.json(result);
    } catch (e) {
      response.status(500).send((e as Error).message);
    }
  }
);

export const triggerCuration = onCall(
  {
    timeoutSeconds: 540,
    cors: true, // Explicitly enable CORS
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { playlistId } = request.data || {};

    logger.info(`Received triggerCuration from user ${uid}`, { playlistId });

    // SECURITY: If specific playlist requested, verify ownership
    if (playlistId) {
      const configService = new ConfigService();
      const config = await configService.getPlaylistConfig(playlistId);
      if (!config) {
        throw new HttpsError('not-found', 'Playlist not found.');
      }
      if (config.ownerId !== uid) {
        throw new HttpsError('permission-denied', 'You do not own this playlist.');
      }
    }

    try {
      return await runOrchestrator(playlistId, uid);
    } catch (e) {
      logger.error('Orchestrator execution failed', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);

export const searchSpotify = onCall(
  {
    timeoutSeconds: 30,
    cors: true, // Explicitly enable CORS
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { query, type, limit } = request.data;
    if (!query || !type) {
      throw new HttpsError('invalid-argument', 'Missing query or type.');
    }

    // Validate type
    const validTypes = ['track', 'playlist', 'artist'];
    let searchTypes: ('track' | 'playlist' | 'artist')[] = [];
    if (Array.isArray(type)) {
      searchTypes = type;
    } else {
      if (validTypes.includes(type)) {
        searchTypes = [type];
      } else {
        throw new HttpsError('invalid-argument', 'Invalid type.');
      }
    }

    try {
      // Create user-specific service using the robust helper
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      const results = await spotifyService.search(query, searchTypes, limit || 20);

      // Persist any token updates (Important for rotation)
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      // FILTER: For playlists, only return user-owned ones
      if (searchTypes.includes('playlist')) {
        // Get user's Spotify profile to check ownership
        const userProfile = await spotifyService.getMe();
        const userId = userProfile.id;

        const filteredResults = results.filter((result) => {
          if (result.type === 'playlist') {
            // Only include playlists owned by this user
            return result.ownerId === userId;
          }
          return true; // Keep tracks and artists as-is
        });

        return { results: filteredResults };
      }

      return { results };
    } catch (e) {
      logger.error('Search failed', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);
export { exchangeSpotifyToken } from './controllers/auth-controller';
