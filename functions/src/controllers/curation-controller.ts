import type {
  CurationEstimate,
  EstimateCurationRequest,
  OrchestrationResult,
  PlaylistConfig,
  TriggerCurationRequest
} from '@smart-spotify-curator/shared';

import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

import { db } from '../config/firebase.js';
import { CurationSession } from '../core/curation/curation-session.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';

export async function estimateCurationHandler(
  request: CallableRequest<EstimateCurationRequest>
): Promise<CurationEstimate> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { EstimateCurationRequestSchema } = await import('@smart-spotify-curator/shared');
  const parseResult = EstimateCurationRequestSchema.safeParse(request.data);

  if (!parseResult.success) {
    throw new HttpsError(
      'invalid-argument',
      `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  const uid = request.auth.uid;
  const { playlistId } = parseResult.data;

  // Load Services
  const { AiService } = await import('../services/ai-service.js');
  const { SlotManager } = await import('../core/slot-manager.js');
  const { TrackCleaner } = await import('../core/track-cleaner.js');
  const { FirestoreLogger } = await import('../services/firestore-logger.js');
  const { ConfigService } = await import('../services/config-service.js');

  const configService = new ConfigService();
  const config = await configService.getPlaylistConfig(playlistId);

  if (!config) {
    throw new HttpsError('not-found', 'Playlist not found.');
  }
  if (config.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'You do not own this playlist.');
  }

  try {
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    // Instantiate Core Services
    const aiService = new AiService();
    const slotManager = new SlotManager();
    const trackCleaner = new TrackCleaner();
    const firestoreLogger = new FirestoreLogger();

    const { PlaylistOrchestrator } = await import('../core/orchestrator.js');
    const orchestrator = new PlaylistOrchestrator(
      aiService,
      slotManager,
      trackCleaner,
      firestoreLogger
    );

    const { CurationEstimator } = await import('../core/estimator.js');
    const estimator = new CurationEstimator(orchestrator);

    const estimate = await estimator.estimate(config, spotifyService, uid);

    // Persist any token updates
    await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

    return estimate;
  } catch (e) {
    logger.error('Estimation failed', {
      error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
      playlistId,
      uid
    });
    throw new HttpsError('internal', e instanceof Error ? e.message : 'Unknown error');
  }
}

// Shared logic for both HTTP and onCall (Web App)
export async function runOrchestrator(
  config: PlaylistConfig,
  callerUid: string,
  callerName?: string,
  planId?: string
): Promise<OrchestrationResult> {
  // SECURITY VERIFICATION (Deep check)
  if (config.ownerId !== callerUid) {
    logger.warn(
      `User ${callerUid} attempted to run playlist ${config.id} owned by ${config.ownerId}`
    );
    throw new Error('Permission denied. You do not own this playlist.');
  }

  // Move imports into the function or use lazy initialization to speed up cloud-init
  const { AiService } = await import('../services/ai-service.js');
  const { PlaylistOrchestrator } = await import('../core/orchestrator.js');
  const { SlotManager } = await import('../core/slot-manager.js');
  const { TrackCleaner } = await import('../core/track-cleaner.js');
  const { FirestoreLogger } = await import('../services/firestore-logger.js');

  // 1. Stateless Services
  const aiService = new AiService();
  const slotManager = new SlotManager();
  const trackCleaner = new TrackCleaner();
  const firestoreLogger = new FirestoreLogger();

  const results: OrchestrationResult['results'] = [];

  // Single Playlist Execution
  // const playlistConfig = config; // Removed redundant alias

  try {
    // 3. Fetch User's Spotify Token & Create Orchestrator
    const { originalRefreshToken, service: spotifyService } = await getAuthorizedSpotifyService(
      config.ownerId
    );

    // 4. Create Orchestrator (handles Spotify auth internally)
    const orchestrator = new PlaylistOrchestrator(
      aiService,
      slotManager,
      trackCleaner,
      firestoreLogger
    );

    // 5. Execute
    if (planId) {
      const planRef = db.doc(`users/${callerUid}/curationPlans/${planId}`);
      const planSnap = await planRef.get();

      if (!planSnap.exists) {
        throw new Error('Curation plan not found or expired. Please run estimation again.');
      }

      const session = planSnap.data() as CurationSession;
      // Ensure session belongs to this playlist
      if (session?.config?.id !== config.id) {
        throw new Error('Plan does not match target playlist.');
      }

      if (session) {
        await orchestrator.executePlan(session, spotifyService);
        await planRef.delete();
      }
    } else {
      await orchestrator.curatePlaylist(config, spotifyService, callerName);
    }

    // 6. Persist any token updates (Important for rotation)
    await persistSpotifyTokens(config.ownerId, spotifyService, originalRefreshToken);

    results.push({ name: config.name, status: 'success' });
  } catch (error) {
    const errMsg = (error as Error).message;
    logger.error(`Error processing playlist ${config.name}`, error);

    // Handle Critical Auth Failures (Revoked access, deleted account)
    if ((errMsg.includes('invalid_grant') || errMsg.includes('unauthorized')) && config.ownerId) {
      await db
        .doc(`users/${config.ownerId}/secrets/spotify`)
        .set({ error: errMsg, status: 'invalid' }, { merge: true });

      await db.doc(`users/${config.ownerId}`).update({
        'spotifyProfile.authError': errMsg,
        'spotifyProfile.status': 'invalid'
      });
    }

    results.push({
      error: errMsg,
      name: config.name || 'Unnamed Playlist',
      status: 'error'
    });

    // Note: Orchestrator already logs the error state internally using currentLogId.
    // We do NOT need to log it again here, as that creates a duplicate "New Log" entry
    // instead of updating the existing "Running" one.
  }

  return { message: 'Playlist update completed', results };
}

export async function triggerCurationHandler(request: CallableRequest<TriggerCurationRequest>) {
  // 1. Auth Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to curate playlists.');
  }

  const { TriggerCurationRequestSchema } = await import('@smart-spotify-curator/shared');
  const parseResult = TriggerCurationRequestSchema.safeParse(request.data);

  if (!parseResult.success) {
    throw new HttpsError(
      'invalid-argument',
      `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  const { planId, playlistId } = parseResult.data;
  const uid = request.auth.uid;

  logger.info(`Received triggerCuration from user ${uid}`, {
    planId,
    playlistId
  });

  // 2. Load and Verify Config
  const { ConfigService } = await import('../services/config-service.js');
  const configService = new ConfigService();
  let config: null | PlaylistConfig;

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
    return await runOrchestrator(config, uid, callerName, planId);
  } catch (e) {
    logger.error('Orchestrator reached terminal error', {
      error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
      playlistId,
      uid
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
