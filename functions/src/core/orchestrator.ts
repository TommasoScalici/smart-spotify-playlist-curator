import { SpotifyService } from "../services/spotify-service";
import { AiService } from "../services/ai-service";
import { TrackCleaner } from "./track-cleaner";
import { SlotManager } from "./slot-manager";
import { PlaylistConfig, TrackWithMeta } from "../types";
import * as logger from "firebase-functions/logger";

export class PlaylistOrchestrator {
  constructor(
    private spotifyService: SpotifyService,
    private aiService: AiService,
    private trackCleaner: TrackCleaner,
    private slotManager: SlotManager,
  ) { }

  public async curatePlaylist(
    config: PlaylistConfig,
    runId?: string,
  ): Promise<void> {
    const { settings, dryRun } = config;
    const targetTotal = settings.targetTotalTracks;

    logger.info(`Starting curation for playlist: ${config.name}`, {
      playlistId: config.id,
      dryRun,
      runId,
    });

    // Sanitize ID (handle spotify:playlist: prefix)
    const playlistId = config.id.replace("spotify:playlist:", "");

    // 1. Fetch Current State
    const currentTracks =
      await this.spotifyService.getPlaylistTracks(playlistId);

    // Map to format expected by cleaner
    const cleanerInput = currentTracks.map((t) => ({
      track: {
        uri: t.uri,
        name: t.name,
        artists: [{ name: t.artist.split(", ")[0] }],
      },
      added_at: t.addedAt,
    }));

    const vipUris = config.mandatoryTracks.map((m) => m.uri);
    const currentSize = currentTracks.length;

    let keptTracks: TrackWithMeta[] = [];
    let tracksToRemove: string[] = [];
    let slotsNeeded = 0;

    // 2. Logic Paths
    if (currentSize === 0) {
      // Path 1: Empty Playlist
      const result = this.trackCleaner.processCurrentTracks(
        cleanerInput,
        config,
        vipUris,
      );
      keptTracks = result.keptTracks;
      slotsNeeded = result.slotsNeeded;
    } else if (currentSize < targetTotal) {
      // Path 2: Under Target (Standard Fill)
      const result = this.trackCleaner.processCurrentTracks(
        cleanerInput,
        config,
        vipUris,
      );
      keptTracks = result.keptTracks;
      tracksToRemove = result.tracksToRemove;
      slotsNeeded = result.slotsNeeded;
    } else {
      // Path 3: Over Target (Aggressive Cleanup)
      // Force a 15-track gap to allow fresh rotation
      const aggressiveTarget = Math.max(0, targetTotal - 15);
      const result = this.trackCleaner.processCurrentTracks(
        cleanerInput,
        config,
        vipUris,
        aggressiveTarget,
      );

      keptTracks = result.keptTracks;
      tracksToRemove = result.tracksToRemove;
      slotsNeeded = Math.max(0, targetTotal - keptTracks.length);
    }

    // 3. AI Refill
    const newAiStatus: { uri: string; artist: string; track: string }[] = [];

    if (slotsNeeded > 0) {
      logger.info(`Need ${slotsNeeded} new tracks.`, { slotsNeeded });

      // Loop to fill gaps (Max 3 attempts to avoid infinite loops)
      let attempts = 0;
      const maxAttempts = 3;

      const survivorMeta = keptTracks.map((t) => ({
        uri: t.uri,
        artist: t.artist,
      }));

      // Initialize counts with survivors
      const artistCounts: { [key: string]: number } = {};
      survivorMeta.forEach((t) => {
        artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      });

      while (newAiStatus.length < slotsNeeded && attempts < maxAttempts) {
        attempts++;
        const currentGap = slotsNeeded - newAiStatus.length;
        // Use Overfetch Ratio (default 2.0) to request more tracks upfront
        const ratio = config.aiGeneration.overfetchRatio || 2.0;
        // Formula: Gap * Ratio + Desperation Buffer (increases with attempts)
        const requestCount = Math.ceil(currentGap * ratio) + attempts * 5;

        logger.info(
          `[Attempt ${attempts}/${maxAttempts}] Requesting ${requestCount} tracks to fill gap of ${currentGap} (Ratio: ${ratio})...`,
        );

        // EXCLUDE: Pass distinct "Artist - Track" strings to the prompt to encourage variety
        // Existing `generateSuggestions` checks against this list semantically.
        const semanticExclusionList = [
          ...keptTracks.map((t) => `${t.artist} - ${t.name}`),
          ...newAiStatus.map((t) => `${t.artist} - ${t.track}`), // newAiStatus items have 'track' and 'artist'
        ];

        // URI list for internal duplication check
        const uriExclusionList = [
          ...keptTracks.map((t) => t.uri),
          ...newAiStatus.map((t) => t.uri),
        ];

        const suggestions = await this.aiService.generateSuggestions(
          config.aiGeneration,
          requestCount,
          semanticExclusionList,
        );

        // Search tracks on Spotify
        const aiTrackUris: string[] = [];
        for (const suggestion of suggestions) {
          const trackInfo = await this.spotifyService.searchTrack(
            `${suggestion.artist} ${suggestion.track}`,
          );
          if (trackInfo) {
            // Check if this specific URI is already in our list (Orchestrator level dedup)
            // (Though AiService exclude list handles most)
            if (
              !uriExclusionList.includes(trackInfo.uri) &&
              !aiTrackUris.includes(trackInfo.uri)
            ) {
              aiTrackUris.push(trackInfo.uri);
            }
          } else {
            logger.warn(
              `Could not find track on Spotify: "${suggestion.artist} - "${suggestion.track}"`,
              { suggestion },
            );
          }
        }

        if (aiTrackUris.length > 0) {
          const aiTracksInfo = await this.spotifyService.getTracks(aiTrackUris);



          // FILTER: Enforce Artist Limit (Max 2)
          aiTracksInfo.forEach((t) => {
            const count = artistCounts[t.artist] || 0;
            if (count < 2) {
              newAiStatus.push({
                uri: t.uri,
                artist: t.artist,
                track: t.name,
              });
              artistCounts[t.artist] = count + 1;
            } else {
              logger.info(
                `Skipping AI track ${t.artist} - ${t.name}: Artist limit reached (${count}).`,
              );
            }
          });
        } else {
          logger.warn(
            `Attempt ${attempts}: No valid tracks found by Spotify search.`,
          );
        }

        if (newAiStatus.length >= slotsNeeded) {
          logger.info("Target slot count reached.");
          break;
        }
      }

      logger.info(
        `Final New Tracks Count: ${newAiStatus.length} (Target: ${slotsNeeded})`,
      );
    }

    // 4. Arrange & Update
    const survivorMeta = keptTracks.map((t) => ({
      uri: t.uri,
      artist: t.artist,
    }));

    // newAiStatus is now defined and populated within the loop above
    // If slotsNeeded was 0, newAiStatus will be an empty array, which is correct.

    const finalTrackList = this.slotManager.arrangePlaylist(
      config.mandatoryTracks,
      survivorMeta,
      newAiStatus,
      targetTotal,
    );

    // Re-derive survivorUris for diffing
    const survivorUris = keptTracks.map((t) => t.uri);
    // Determine all tracks that need to be added (AI tracks + missing VIPs)
    const tracksToAdd = finalTrackList.filter(
      (uri) => !survivorUris.includes(uri),
    );

    await this.spotifyService.performSmartUpdate(
      playlistId,
      tracksToRemove,
      tracksToAdd,
      finalTrackList,
      dryRun,
      vipUris,
    );

    logger.info(`Curation complete for ${config.name}.`, {
      playlistId,
      changesApplied: !dryRun,
    });
  }
}
