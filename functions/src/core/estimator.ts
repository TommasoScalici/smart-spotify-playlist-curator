import { SpotifyService } from '../services/spotify-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

export interface CurationEstimate {
  currentTracks: number;
  duplicatesToRemove: number;
  agedOutTracks: number;
  mandatoryToAdd: number;
  aiTracksToAdd: number;
  predictedFinal: number;
}

/**
 * Estimates the result of a curation run without making changes.
 * Used for the pre-flight confirmation modal.
 */
export class CurationEstimator {
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

    // Fetch current tracks
    const currentTracks = await spotifyService.getPlaylistTracks(playlistId);
    const currentCount = currentTracks.length;

    // Calculate duplicates
    let duplicatesToRemove = 0;
    if (config.curationRules.removeDuplicates) {
      const seen = new Set<string>();
      for (const track of currentTracks) {
        if (seen.has(track.uri)) {
          duplicatesToRemove++;
        } else {
          seen.add(track.uri);
        }
      }
    }

    // Calculate aged-out tracks
    let agedOutTracks = 0;
    const now = new Date();
    const maxAgeDays = config.curationRules.maxTrackAgeDays;
    const vipUris = new Set(config.mandatoryTracks.map((m) => m.uri));

    for (const track of currentTracks) {
      if (vipUris.has(track.uri)) continue; // VIPs are protected
      const addedAt = new Date(track.addedAt);
      const ageInMs = now.getTime() - addedAt.getTime();
      const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
      if (ageInDays > maxAgeDays) {
        agedOutTracks++;
      }
    }

    // Calculate mandatory tracks to add
    let mandatoryToAdd = 0;
    const currentUris = new Set(currentTracks.map((t) => t.uri));
    for (const mandatory of config.mandatoryTracks) {
      if (!currentUris.has(mandatory.uri)) {
        mandatoryToAdd++;
      }
    }

    // AI tracks to add (if enabled)
    const aiTracksToAdd = config.aiGeneration.enabled ? config.aiGeneration.tracksToAdd : 0;

    // Predicted final count
    const predictedFinal =
      currentCount - duplicatesToRemove - agedOutTracks + mandatoryToAdd + aiTracksToAdd;

    return {
      currentTracks: currentCount,
      duplicatesToRemove,
      agedOutTracks,
      mandatoryToAdd,
      aiTracksToAdd,
      predictedFinal
    };
  }
}
