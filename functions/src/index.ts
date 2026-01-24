import { setGlobalOptions } from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables from root .env ONLY for local development
// In Cloud Functions, credentials are automatically provided
const isLocalDevelopment = !process.env.FUNCTION_TARGET && !process.env.K_SERVICE;
if (isLocalDevelopment) {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { ConfigService } from './services/config-service';
import { AiService } from './services/ai-service';
import { SpotifyService, SearchResult } from './services/spotify-service';
import { PlaylistOrchestrator } from './core/orchestrator';
import { SlotManager } from './core/slot-manager';
import { FirestoreLogger } from './services/firestore-logger';
import { PlaylistConfig, OrchestrationResult } from '@smart-spotify-curator/shared';
import { db } from './config/firebase';

import { onCall, HttpsError } from 'firebase-functions/v2/https';

// --- Token Management Helpers ---

/**
 * Gets an authorized Spotify service for a given user, reusing cached access tokens if valid.
 * @param uid - The Firebase User ID
 * @returns Object containing the initialized SpotifyService and the original RefreshToken
 * @throws HttpsError if not linked or token missing
 */
export async function getAuthorizedSpotifyService(uid: string) {
  const secretsRef = db.doc(`users/${uid}/secrets/spotify`);
  const secretSnap = await secretsRef.get();

  if (!secretSnap.exists) {
    throw new HttpsError('not-found', 'Spotify not linked');
  }

  const data = secretSnap.data();
  const refreshToken = data?.refreshToken;
  if (!refreshToken) {
    throw new HttpsError('not-found', 'Spotify refresh token missing');
  }

  // Create Spotify Service
  const spotifyService = new SpotifyService(refreshToken);

  // Check if we have a cached access token that's still valid (not expiring within 5 minutes)
  const cachedAccessToken = data?.accessToken;
  const cachedExpiresAt = data?.expiresAt;
  if (cachedAccessToken && cachedExpiresAt) {
    const expiresAtDate = new Date(cachedExpiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAtDate > fiveMinutesFromNow) {
      // Token is still valid, reuse it
      const expiresInSeconds = Math.floor((expiresAtDate.getTime() - now.getTime()) / 1000);
      spotifyService.setTokens(cachedAccessToken, refreshToken, expiresInSeconds);
    }
  }

  return { service: spotifyService, originalRefreshToken: refreshToken };
}

/**
 * Persists any updated tokens (including rotated refresh tokens) back to Firestore.
 * @param uid - The Firebase User ID
 * @param service - The SpotifyService instance containing potentially updated tokens
 * @param originalRefreshToken - The original refresh token to check for rotation
 */
export async function persistSpotifyTokens(
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

// Shared logic for both HTTP and onCall (Web App)
export async function runOrchestrator(
  config: PlaylistConfig,
  callerUid: string,
  callerName?: string,
  dryRunOverride?: boolean
): Promise<OrchestrationResult> {
  // SECURITY VERIFICATION (Deep check)
  if (config.ownerId !== callerUid) {
    logger.warn(
      `User ${callerUid} attempted to run playlist ${config.id} owned by ${config.ownerId}`
    );
    throw new Error('Permission denied. You do not own this playlist.');
  }

  // 1. Stateless Services
  const aiService = new AiService();
  const slotManager = new SlotManager();
  const firestoreLogger = new FirestoreLogger();

  const results: OrchestrationResult['results'] = [];

  // Single Playlist Execution
  const playlistConfig = config;

  // Apply Dry Run Override if present
  if (dryRunOverride !== undefined) {
    playlistConfig.dryRun = dryRunOverride;
  }

  try {
    // 3. Fetch User's Spotify Token & Create Orchestrator
    const { service: spotifyService, originalRefreshToken } = await getAuthorizedSpotifyService(
      playlistConfig.ownerId!
    );

    // 4. Create Orchestrator (handles Spotify auth internally)
    const orchestrator = new PlaylistOrchestrator(aiService, slotManager, firestoreLogger);

    // 5. Execute
    await orchestrator.curatePlaylist(playlistConfig, spotifyService, callerName);

    // 6. Persist any token updates (Important for rotation)
    await persistSpotifyTokens(playlistConfig.ownerId!, spotifyService, originalRefreshToken);

    results.push({ name: playlistConfig.name || 'Unnamed Playlist', status: 'success' });
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

      await db.doc(`users/${playlistConfig.ownerId}`).update({
        'spotifyProfile.status': 'invalid',
        'spotifyProfile.authError': errMsg
      });
    }

    results.push({
      name: playlistConfig.name || 'Unnamed Playlist',
      status: 'error',
      error: errMsg
    });

    if (playlistConfig.ownerId) {
      await firestoreLogger.logActivity(
        playlistConfig.ownerId,
        'error',
        `Failed to curate "${playlistConfig.name || 'Untitled Playlist'}"`,
        {
          playlistId: playlistConfig.id,
          playlistName: playlistConfig.name,
          error: errMsg,
          dryRun: !!dryRunOverride,
          triggeredBy: callerName
        }
      );
    }
  }

  return { message: 'Playlist update completed', results };
}

export const triggerCuration = onCall(
  {
    timeoutSeconds: 540,
    memory: '512MiB', // Increased as per Developer Guide for AI & Large Playlists
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    // 1. Auth Check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to curate playlists.');
    }

    const uid = request.auth.uid;
    const { playlistId, dryRun } = request.data || {};

    if (!playlistId) {
      throw new HttpsError('invalid-argument', 'Missing playlistId. Please select a playlist.');
    }

    logger.info(`Received triggerCuration from user ${uid}`, { playlistId, dryRun });

    // 2. Load and Verify Config
    const configService = new ConfigService();
    let config: PlaylistConfig | null = null;

    try {
      config = await configService.getPlaylistConfig(playlistId);
    } catch (e) {
      logger.error('Config fetch failed', e);
      throw new HttpsError(
        'internal',
        `Failed to load playlist configuration: ${(e as Error).message}`
      );
    }

    if (!config) {
      throw new HttpsError(
        'not-found',
        'The requested playlist configuration was not found in our database.'
      );
    }

    if (config.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Security Alert: You do not have permission to curate this playlist.'
      );
    }

    // 2.5 Fetch Caller Name
    let callerName = '';
    try {
      const userSnap = await db.doc(`users/${uid}`).get();
      const userData = userSnap.data();
      callerName = userData?.spotifyProfile?.displayName || userData?.displayName || 'User';
    } catch (e) {
      logger.warn(`Failed to fetch caller name for ${uid}`, e);
    }

    // 3. Execute Orchestration
    try {
      return await runOrchestrator(config, uid, callerName, dryRun);
    } catch (e) {
      logger.error('Orchestrator reached terminal error', {
        uid,
        playlistId,
        error: e instanceof Error ? { message: e.message, stack: e.stack } : e
      });

      // Map common errors to friendly messages
      const msg = (e as Error).message;
      if (msg.includes('rate limit')) {
        throw new HttpsError(
          'resource-exhausted',
          'Spotify is limiting our requests. Please try again in a few minutes.'
        );
      }
      if (msg.includes('quota')) {
        throw new HttpsError(
          'resource-exhausted',
          'AI generation quota exceeded. Try a different model or wait.'
        );
      }

      throw new HttpsError('internal', `Curation failed: ${msg}`);
    }
  }
);

// --- Estimation for Pre-Flight Modal ---
import { CurationEstimator, CurationEstimate } from './core/estimator';

export const estimateCuration = onCall(
  {
    timeoutSeconds: 30,
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request): Promise<CurationEstimate> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { playlistId } = request.data;

    if (!playlistId) {
      throw new HttpsError('invalid-argument', 'Missing playlistId.');
    }

    // Validate ownership
    const configService = new ConfigService();
    const config = await configService.getPlaylistConfig(playlistId);
    if (!config) {
      throw new HttpsError('not-found', 'Playlist not found.');
    }
    if (config.ownerId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this playlist.');
    }

    try {
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      const estimator = new CurationEstimator();
      const estimate = await estimator.estimate(config, spotifyService);

      // Persist any token updates
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      return estimate;
    } catch (e) {
      logger.error('Estimation failed', {
        uid,
        playlistId,
        error: e instanceof Error ? { message: e.message, stack: e.stack } : e
      });
      throw new HttpsError('internal', e instanceof Error ? e.message : 'Unknown error');
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

      let results: SearchResult[];

      if (searchTypes.includes('playlist')) {
        // Optimized Service-level search (Parallel fetching + Owned filter)
        results = await spotifyService.searchUserPlaylists(query, limit || 20);
      } else {
        // For tracks/artists, global search is appropriate
        results = await spotifyService.search(query, searchTypes, limit || 20);
      }

      // Persist any token updates (Important for rotation)
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      return { results };
    } catch (e) {
      logger.error('Search failed', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);

export const getTrackDetails = onCall(
  {
    timeoutSeconds: 30,
    cors: true,
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
    const { trackUri } = request.data;

    if (!trackUri || !trackUri.startsWith('spotify:track:')) {
      throw new HttpsError('invalid-argument', 'Invalid track URI.');
    }

    try {
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      // Use getTrackMetadata to fetch complete track details including album art
      const trackData = await spotifyService.getTrackMetadata(trackUri);

      // Persist any token updates
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      if (!trackData) {
        throw new HttpsError('not-found', 'Track not found.');
      }

      return trackData;
    } catch (e) {
      logger.error('Failed to fetch track details', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);

export { exchangeSpotifyToken } from './controllers/auth-controller';
export { getPlaylistMetrics } from './controllers/playlist-controller';
