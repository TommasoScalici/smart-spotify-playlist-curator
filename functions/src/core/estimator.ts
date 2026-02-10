import { CurationEstimate, PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../config/firebase';
import { SpotifyService } from '../services/spotify-service';
import { PlaylistOrchestrator } from './orchestrator';

/**
 * Estimates the result of a curation run without making changes.
 * Uses the Orchestrator to generate a real plan, saves it, and returns the preview.
 */
export class CurationEstimator {
  constructor(private orchestrator: PlaylistOrchestrator) {}

  /**
   * Calculates what the curation will do and persists the plan.
   */
  public async estimate(
    config: PlaylistConfig,
    spotifyService: SpotifyService,
    uid: string
  ): Promise<CurationEstimate> {
    const playlistId = config.id.replace('spotify:playlist:', '');
    logger.info(`Estimating curation (Pre-flight) for: ${config.name}`, { playlistId });

    // 1. Generate the Plan (Full simulation)
    const session = await this.orchestrator.createPlan(
      config,
      spotifyService,
      'Pre-Flight',
      undefined
    );

    // 2. Validate/Sanitize Session for Storage
    const planId = uuidv4();
    const planRef = db.doc(`users/${uid}/curationPlans/${planId}`);

    // Save Plan
    // Ensure we don't save huge recursive objects. Session is mostly data properly typed.
    await planRef.set({
      ...session,
      createdAt: Date.now(),
      status: 'pending' // pending confirmation
    });

    // 3. Map to CurationEstimate
    const { config: sessionConfig, diff, newAiTracks } = session;

    if (!diff) {
      throw new Error('Plan creation failed to generate a diff.');
    }

    const duplicatesToRemove = diff.removed.filter((t) => t.reason === 'duplicate').length;
    const agedOutTracks = diff.removed.filter((t) => t.reason === 'expired').length;
    const artistLimitRemoved = diff.removed.filter((t) => t.reason === 'artist_limit').length;
    const sizeLimitRemoved = diff.removed.filter((t) => t.reason === 'size_limit').length;

    const aiUris = new Set(newAiTracks.map((t) => t.uri));
    const mandatoryUris = new Set(sessionConfig.mandatoryTracks.map((t) => t.uri));

    let aiAddedCount = 0;
    let mandatoryAddedCount = 0;

    for (const added of diff.added) {
      if (aiUris.has(added.uri)) aiAddedCount++;
      if (mandatoryUris.has(added.uri)) mandatoryAddedCount++;
    }

    const annotatedAdded = diff.added.map((added) => {
      let source: 'ai' | 'mandatory' | undefined;
      if (aiUris.has(added.uri)) source = 'ai';
      else if (mandatoryUris.has(added.uri)) source = 'mandatory';
      return { ...added, source };
    });

    return {
      added: annotatedAdded,
      agedOutTracks,
      aiTracksToAdd: aiAddedCount,
      artistLimitRemoved,
      currentTracks: session.currentTracks.length,
      duplicatesToRemove,
      mandatoryToAdd: mandatoryAddedCount,
      planId, // Return the Plan ID
      predictedFinal: session.finalTrackList.length,
      removed: diff.removed,
      sizeLimitRemoved
    };
  }
}
