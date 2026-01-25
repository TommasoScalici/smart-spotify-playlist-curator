import { SpotifyService } from '../services/spotify-service';
import { PlaylistConfig, CurationEstimate } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

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

    // 1. Fetch current tracks
    const currentTracks = await spotifyService.getPlaylistTracks(playlistId);
    const currentCount = currentTracks.length;

    const { curationRules } = config;
    const now = Date.now();
    const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;
    const vipUris = new Set(config.mandatoryTracks.map((m) => m.uri));

    let duplicatesToRemove = 0;
    let agedOutTracks = 0;
    let artistLimitRemoved = 0;

    const seenUris = new Set<string>();
    const seenSignatures = new Set<string>();
    const artistCounts: Record<string, number> = {};

    const survivingUris = new Set<string>();

    // 2. Simulate Filter Loop (Exact match of Orchestrator.ts)
    for (const item of currentTracks) {
      const normalizedName = item.name.trim().toLowerCase();
      const normalizedArtist = item.artist.trim().toLowerCase();
      const normalizedAlbum = item.album.trim().toLowerCase();
      const signature = `${normalizedName}:${normalizedArtist}:${normalizedAlbum}`;

      // 2a. Deduplication
      if (
        curationRules.removeDuplicates &&
        (seenUris.has(item.uri) || seenSignatures.has(signature))
      ) {
        duplicatesToRemove++;
        continue;
      }
      seenUris.add(item.uri);
      seenSignatures.add(signature);

      // 2b. Age Check
      const addedAt = new Date(item.addedAt).getTime();
      const age = now - addedAt;
      if (!vipUris.has(item.uri) && age > maxAgeMs) {
        agedOutTracks++;
        continue;
      }

      // 2c. Artist Limit
      if (!vipUris.has(item.uri)) {
        const primaryArtist = item.artist.split(',')[0].trim().toLowerCase();
        const isVarious = primaryArtist === 'various artists';

        if (!isVarious) {
          const count = artistCounts[primaryArtist] || 0;
          if (count >= curationRules.maxTracksPerArtist) {
            artistLimitRemoved++;
            continue;
          }
          artistCounts[primaryArtist] = count + 1;
        }
      }

      survivingUris.add(item.uri);
    }

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
