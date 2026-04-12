import type {
  CurationEstimate,
  EstimateCurationRequest,
  PlaylistConfig,
  TriggerCurationRequest
} from '@smart-spotify-curator/shared';

import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

import { ServiceFactory } from '../admin/factory.js';
import { db } from '../admin/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../core/auth-service.js';
import { CurationUseCase } from '../core/curation-usecase.js';

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

  const configService = ServiceFactory.getConfigService();
  const config = await configService.getPlaylistConfig(playlistId);

  if (!config) {
    throw new HttpsError('not-found', 'Playlist not found.');
  }
  if (config.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'You do not own this playlist.');
  }

  let callerName = '';
  try {
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data();
    callerName = userData?.spotifyProfile?.displayName || userData?.displayName || 'User';
  } catch (e) {
    logger.warn(`Failed to fetch caller name for ${uid}`, e);
  }

  try {
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    const estimator = ServiceFactory.createEstimator();
    const estimate = await estimator.estimate(config, spotifyService, uid, callerName);

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

export async function triggerCurationHandler(request: CallableRequest<TriggerCurationRequest>) {
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

  logger.info(`Received triggerCuration from user ${uid}`, { planId, playlistId });

  const configService = ServiceFactory.getConfigService();
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

  let callerName = '';
  try {
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data();
    callerName = userData?.spotifyProfile?.displayName || userData?.displayName || 'User';
  } catch (e) {
    logger.warn(`Failed to fetch caller name for ${uid}`, e);
  }

  try {
    const useCase = new CurationUseCase();
    return await useCase.execute(config, uid, callerName, planId);
  } catch (e) {
    logger.error('Orchestrator reached terminal error', {
      error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
      playlistId,
      uid
    });

    const msg = (e as Error).message;
    if (msg.includes('currently being curated')) {
      throw new HttpsError('aborted', msg);
    }
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
