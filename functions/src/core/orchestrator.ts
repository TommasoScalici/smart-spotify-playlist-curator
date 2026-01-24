import { SpotifyService } from '../services/spotify-service';
import { AiService } from '../services/ai-service';
import { SlotManager } from './slot-manager';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { FirestoreLogger } from '../services/firestore-logger';
import { PromptGenerator } from '../services/prompt-generator';
import { DiffCalculator } from './diff-calculator';
import { TrackWithMeta } from './types-internal';

export class PlaylistOrchestrator {
  constructor(
    private aiService: AiService,
    private slotManager: SlotManager,
    private firestoreLogger: FirestoreLogger
  ) {}

  /**
   * Curates a playlist by applying all configured rules and AI generation.
   * @param config - Playlist configuration
   * @param spotifyService - Spotify service instance for API calls
   * @returns Promise resolving when curation is complete
   * @throws Error if any critical step fails
   */
  public async curatePlaylist(
    config: PlaylistConfig,
    spotifyService: SpotifyService
  ): Promise<void> {
    const { dryRun, curationRules } = config;

    // Spotify API generally expects IDs, not URIs. Sanitize just in case.
    const playlistId = config.id.replace('spotify:playlist:', '');

    logger.info(`Starting curation for playlist: ${config.name}`, {
      playlistId,
      originalId: config.id,
      dryRun
    });

    if (config.ownerId) {
      await this.firestoreLogger.logActivity(
        config.ownerId,
        'info',
        `Started curating "${config.name}"`,
        { playlistId: config.id, dryRun }
      );

      // Initialize Progress
      await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
        state: 'running',
        progress: 0,
        step: 'Starting curation...',
        isDryRun: !!dryRun
      });
    }

    // 1. Fetch Tracks (Source of Truth)
    const currentTracks = await spotifyService.getPlaylistTracks(playlistId);
    const currentUriSet = new Set(currentTracks.map((t) => t.uri));

    logger.info(`Fetched ${currentTracks.length} tracks from Spotify.`);

    // 2. Filter & Clean (Dedupe, Age)
    const tracksToRemove: string[] = [];
    const survivingTracks: TrackWithMeta[] = [];
    const seenUris = new Set<string>();
    const vipUris = new Set(config.mandatoryTracks.map((m) => m.uri)); // Protect VIPs
    const now = Date.now();
    const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;

    let duplicatesRemoved = 0;
    let expiredRemoved = 0;

    for (const item of currentTracks) {
      // 2a. Deduplication
      if (curationRules.removeDuplicates && seenUris.has(item.uri)) {
        tracksToRemove.push(item.uri);
        duplicatesRemoved++;
        continue;
      }
      seenUris.add(item.uri);

      // 2b. Age Check (Protect VIPs)
      const addedAt = new Date(item.addedAt).getTime();
      const age = now - addedAt;
      if (!vipUris.has(item.uri) && age > maxAgeMs) {
        tracksToRemove.push(item.uri);
        expiredRemoved++;
        continue; // Don't include in survivors
      }

      survivingTracks.push({
        uri: item.uri,
        artist: item.artist,
        name: item.name,
        addedAt: new Date(item.addedAt),
        isVip: vipUris.has(item.uri)
      });
    }

    logger.info(
      `Filtered tracks. Survivors: ${survivingTracks.length}. Duplicates: ${duplicatesRemoved}. Expired: ${expiredRemoved}`
    );

    // 3. AI Generation (if needed)
    // Calculate how many more tracks we need to hit the target
    // We count existing survivors (which include already-present VIPs) + non-present VIPs
    const currentVipUrisInPlaylist = survivingTracks
      .filter((t) => vipUris.has(t.uri))
      .map((t) => t.uri);
    const missingVipsCount = config.mandatoryTracks.filter(
      (m) => !currentVipUrisInPlaylist.includes(m.uri)
    ).length;

    const tracksNeeded =
      config.settings.targetTotalTracks - survivingTracks.length - missingVipsCount;
    const newAiTracks: { uri: string; artist: string; track: string }[] = [];

    if (config.aiGeneration.enabled && tracksNeeded > 0) {
      logger.info(`Need ${tracksNeeded} more tracks. initiating AI generation...`, {
        model: config.aiGeneration.model
      });

      if (config.ownerId) {
        await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
          state: 'running',
          progress: 50,
          step: 'Generating AI suggestions...',
          isDryRun: !!dryRun
        });
      }

      // Build exclusion list (Artist - Track) to prevent AI from suggesting what we already have
      const semanticExclusionList = survivingTracks.map((t) => `${t.artist} - ${t.name}`);

      const prompt = PromptGenerator.generatePrompt(
        config.name || 'Untitled Playlist',
        config.settings.description,
        config.aiGeneration.isInstrumentalOnly
      );

      const suggestions = await this.aiService.generateSuggestions(
        config.aiGeneration,
        prompt,
        tracksNeeded + 5, // Buffer
        semanticExclusionList
      );

      const batchArtistCounts: Record<string, number> = {};
      const currentUriSetExtended = new Set([...currentUriSet]);

      for (const suggestion of suggestions) {
        if (newAiTracks.length >= tracksNeeded) break;
        if ((batchArtistCounts[suggestion.artist] || 0) >= 2) continue;

        const trackInfo = await spotifyService.searchTrack(
          `${suggestion.artist} ${suggestion.track}`
        );

        if (trackInfo && !currentUriSetExtended.has(trackInfo.uri)) {
          newAiTracks.push({
            uri: trackInfo.uri,
            artist: trackInfo.artist,
            track: trackInfo.name
          });
          batchArtistCounts[suggestion.artist] = (batchArtistCounts[suggestion.artist] || 0) + 1;
          currentUriSetExtended.add(trackInfo.uri);
        }
      }
    }

    // 4. Final Assembly using SlotManager
    if (config.ownerId) {
      await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
        state: 'running',
        progress: 80,
        step: 'Arranging tracks and anti-clumping...',
        isDryRun: !!dryRun
      });
    }

    const finalTrackList = this.slotManager.arrangePlaylist(
      config.mandatoryTracks,
      survivingTracks,
      newAiTracks,
      config.settings.targetTotalTracks
    );

    // 5. Calculate Diff & Commit
    const { added: finalAdded, removed: finalRemoved } = DiffCalculator.calculate(
      currentTracks,
      survivingTracks,
      finalTrackList,
      config.mandatoryTracks,
      newAiTracks
    );

    if (config.ownerId) {
      await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
        state: 'running',
        progress: 90,
        step: 'Updating Spotify playlist...',
        isDryRun: !!dryRun
      });
    }

    await spotifyService.performSmartUpdate(
      playlistId,
      finalTrackList,
      !!dryRun,
      Array.from(vipUris) // CORRECT: Pass the list of VIP URIs to protect them from removal
    );

    // 7. Success log
    if (config.ownerId) {
      const aiTracksAdded = newAiTracks.length;
      const removedCount = finalRemoved.length;
      const addedCount = finalAdded.length;

      await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
        state: 'completed',
        progress: 100,
        step: 'Done',
        isDryRun: !!dryRun,
        diff: {
          added: finalAdded,
          removed: finalRemoved
        }
      });

      await this.firestoreLogger.logActivity(
        config.ownerId,
        'success',
        `Curation completed for "${config.name || 'Untitled Playlist'}"`,
        {
          playlistId: config.id,
          playlistName: config.name,
          addedCount,
          removedCount,
          aiTracksAdded,
          duplicatesRemoved,
          expiredRemoved,
          finalCount: finalTrackList.length,
          dryRun: !!dryRun
        }
      );
    }

    logger.info('Curation completed successfully.');
  }
}
