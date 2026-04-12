import { OrchestrationResult, PlaylistConfig } from '@smart-spotify-curator/shared';
import { getPlaylistDocId } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { ServiceFactory } from '../admin/factory.js';
import { db, FieldValue } from '../admin/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from './auth-service.js';
import { CurationSession } from './engine/curation-session.js';

export class CurationUseCase {
  /**
   * Executes the orchestration securely by managing locks and tokens.
   */
  public async execute(
    config: PlaylistConfig,
    callerUid: string,
    callerName?: string,
    planId?: string
  ): Promise<OrchestrationResult> {
    if (config.ownerId !== callerUid) {
      logger.warn(
        `User ${callerUid} attempted to run playlist ${config.id} owned by ${config.ownerId}`
      );
      throw new Error('Permission denied. You do not own this playlist.');
    }

    const results: OrchestrationResult['results'] = [];
    const deterministicId = getPlaylistDocId(config.id);
    const playlistRef = db.doc(`users/${config.ownerId}/playlists/${deterministicId}`);

    // CONCURRENCY LOCK
    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(playlistRef);
        if (!doc.exists) {
          throw new Error('CONFIG_NOT_FOUND');
        }

        const data = doc.data();
        if (data?.curationLockTimestamp) {
          let lockTime: number;

          if (typeof data.curationLockTimestamp === 'string') {
            lockTime = new Date(data.curationLockTimestamp).getTime();
          } else if (data.curationLockTimestamp.toMillis) {
            lockTime = data.curationLockTimestamp.toMillis();
          } else {
            lockTime = 0;
          }

          const now = Date.now();
          if (now - lockTime < 600_000) {
            throw new Error('CONCURRENCY_ABORT');
          } else {
            logger.warn(`Stale curation lock detected for ${config.name}. Stealing lock.`);
          }
        }

        transaction.update(playlistRef, { curationLockTimestamp: FieldValue.serverTimestamp() });
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'CONCURRENCY_ABORT') {
        logger.warn(`Concurrency block: Playlist ${config.name} is already being curated.`);
        throw new Error(
          'This playlist is currently being curated by another process. Please wait.',
          { cause: err }
        );
      }
      if (err instanceof Error && err.message === 'CONFIG_NOT_FOUND') {
        throw new Error('Playlist configuration document not found.', { cause: err });
      }
      throw err;
    }

    try {
      const { originalRefreshToken, service: spotifyService } = await getAuthorizedSpotifyService(
        config.ownerId
      );

      const orchestrator = ServiceFactory.createOrchestrator();

      if (planId) {
        const planRef = db.doc(`users/${callerUid}/curationPlans/${planId}`);
        const planSnap = await planRef.get();

        if (!planSnap.exists) {
          throw new Error('Curation plan not found or expired. Please run estimation again.');
        }

        const session = planSnap.data() as CurationSession;
        if (session?.config?.id !== config.id) {
          throw new Error('Plan does not match target playlist.');
        }

        if (session) {
          session.ownerName = callerName;
          await orchestrator.executePlan(session, spotifyService);
          await planRef.delete();
        }
      } else {
        await orchestrator.curatePlaylist(config, spotifyService, callerName);
      }

      await persistSpotifyTokens(config.ownerId, spotifyService, originalRefreshToken);
      results.push({ name: config.name, status: 'success' });
    } catch (error) {
      const errMsg = (error as Error).message;
      logger.error(`Error processing playlist ${config.name}`, error);

      if ((errMsg.includes('invalid_grant') || errMsg.includes('unauthorized')) && config.ownerId) {
        await db
          .doc(`users/${config.ownerId}/secrets/spotify`)
          .set({ error: errMsg, status: 'invalid' }, { merge: true });
        await db.doc(`users/${config.ownerId}`).update({
          'spotifyProfile.authError': errMsg,
          'spotifyProfile.status': 'invalid'
        });
      }

      results.push({ error: errMsg, name: config.name || 'Unnamed Playlist', status: 'error' });
    } finally {
      try {
        await playlistRef.update({ curationLockTimestamp: null });
      } catch (e) {
        logger.error(`Failed to release lock for playlist ${config.name}`, e);
      }
    }

    return { message: 'Playlist update completed', results };
  }
}
