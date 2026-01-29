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

import { db } from './config/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from './services/auth-service.js';

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import type { PlaylistConfig, OrchestrationResult } from '@smart-spotify-curator/shared';
import type { SearchResult } from './services/spotify-service.js';

// Helpers moved to ./services/auth-service.ts

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

  // Move imports into the function or use lazy initialization to speed up cloud-init
  const { AiService } = await import('./services/ai-service.js');
  const { PlaylistOrchestrator } = await import('./core/orchestrator.js');
  const { SlotManager } = await import('./core/slot-manager.js');
  const { TrackCleaner } = await import('./core/track-cleaner.js');
  const { FirestoreLogger } = await import('./services/firestore-logger.js');

  // 1. Stateless Services
  const aiService = new AiService();
  const slotManager = new SlotManager();
  const trackCleaner = new TrackCleaner();
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
    const orchestrator = new PlaylistOrchestrator(
      aiService,
      slotManager,
      trackCleaner,
      firestoreLogger
    );

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

    // Note: Orchestrator already logs the error state internally using currentLogId.
    // We do NOT need to log it again here, as that creates a duplicate "New Log" entry
    // instead of updating the existing "Running" one.
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
    const { ConfigService } = await import('./services/config-service.js');
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
import type { CurationEstimate } from '@smart-spotify-curator/shared';

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
    const { ConfigService } = await import('./services/config-service.js');
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

      const { CurationEstimator } = await import('./core/estimator.js');
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
        results = (await spotifyService.searchUserPlaylists(query, limit || 20)) as SearchResult[];
      } else {
        // For tracks/artists, global search is appropriate
        results = (await spotifyService.search(query, searchTypes, limit || 20)) as SearchResult[];
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
