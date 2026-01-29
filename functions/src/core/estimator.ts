import * as logger from 'firebase-functions/logger';

import { CurationEstimate, PlaylistConfig } from '@smart-spotify-curator/shared';

import { SpotifyService } from '../services/spotify-service';
import { TrackCleaner } from './track-cleaner';

/**
 * Estimates the result of a curation run without making changes.
 * Used for the pre-flight confirmation modal.
 */
export class CurationEstimator {
  private trackCleaner = new TrackCleaner();

  /**
   * Calculates what the curation will do.
   * @param config Playlist configuration
   * @param spotifyService Spotify service for fetching current state
   */
  public async estimate(
    config: PlaylistConfig,
    spotifyService: SpotifyService
  ): Promise<CurationEstimate> {
    const playlistId = config.id.replace('spotify:playlist:', '');

    logger.info(`Estimating curation for playlist: ${config.name}`, { playlistId });

    // 1. Fetch current tracks
    const currentTracks = await spotifyService.getPlaylistTracks(playlistId);
    const currentCount = currentTracks.length;

    const vipUris = config.mandatoryTracks.map((m) => m.uri);

    // 2. Use TrackCleaner for logic consistency
    const { survivingTracks, removedTracks } = this.trackCleaner.processCurrentTracks(
      currentTracks,
      config,
      vipUris
    );

    const duplicatesToRemove = removedTracks.filter((t) => t.reason === 'duplicate').length;
    const agedOutTracks = removedTracks.filter((t) => t.reason === 'expired').length;
    const artistLimitRemoved = removedTracks.filter((t) => t.reason === 'artist_limit').length;

    const survivingUris = new Set(survivingTracks.map((t) => t.uri));

    // 3. Calculate additions
    let mandatoryToAdd = 0;
    for (const mandatory of config.mandatoryTracks) {
      if (!survivingUris.has(mandatory.uri)) {
        mandatoryToAdd++;
      }
    }

    const aiTracksToAdd = config.aiGeneration.enabled ? config.aiGeneration.tracksToAdd : 0;

    // 4. Size Limit (Aggressive cleanup if over target)
    // The predicted final should account for the target limit.
    const target = config.settings.targetTotalTracks;
    const preLimitCount = survivingUris.size + mandatoryToAdd + aiTracksToAdd;
    const sizeLimitRemoved = Math.max(0, preLimitCount - target);
    const predictedFinal = Math.min(preLimitCount, target);

    return {
      currentTracks: currentCount,
      duplicatesToRemove,
      agedOutTracks,
      artistLimitRemoved,
      sizeLimitRemoved,
      mandatoryToAdd,
      aiTracksToAdd,
      predictedFinal
    };
  }
}
