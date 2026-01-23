/* eslint-disable @typescript-eslint/no-explicit-any */
import { SpotifyService } from '../services/spotify-service';
import { AiService } from '../services/ai-service';
import { SlotManager } from './slot-manager';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { FirestoreLogger } from '../services/firestore-logger';
import { PromptGenerator } from '../services/prompt-generator';
import { DiffCalculator } from './diff-calculator';

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

    logger.info(`Starting curation for playlist: ${config.name}`, {
      playlistId: config.id,
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
    const currentTracks = await spotifyService.getPlaylistTracks(config.id);
    const currentUriSet = new Set(currentTracks.map((t) => t.uri));

    logger.info(`Fetched ${currentTracks.length} tracks from Spotify.`);

    // 2. Filter & Clean (Dedupe, Age)
    const tracksToRemove: string[] = [];
    const survivingTracks: { uri: string; artist: string; track: string; addedAt: string }[] = [];
    const seenUris = new Set<string>();
    const vipUris = new Set(config.mandatoryTracks.map((m) => m.uri)); // Protect VIPs
    const now = Date.now();
    const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;

    for (const item of currentTracks) {
      // 2a. Deduplication
      if (curationRules.removeDuplicates && seenUris.has(item.uri)) {
        tracksToRemove.push(item.uri);
        continue;
      }
      seenUris.add(item.uri);

      // 2b. Age Check (Protect VIPs)
      const addedAt = new Date(item.addedAt).getTime();
      const age = now - addedAt;
      if (!vipUris.has(item.uri) && age > maxAgeMs) {
        tracksToRemove.push(item.uri);
        continue; // Don't include in survivors
      }

      survivingTracks.push({
        uri: item.uri,
        artist: item.artist,
        track: item.name,
        addedAt: item.addedAt
      });
    }

    logger.info(
      `Filtered tracks. Survivors: ${survivingTracks.length}. To Remove: ${tracksToRemove.length}`
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
      const semanticExclusionList = survivingTracks.map((t) => `${t.artist} - ${t.track}`);

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
      survivingTracks.map((t) => ({ ...t, track: { ...t, artists: [{ name: t.artist }] } })) as any,
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
      config.id,
      finalTrackList,
      !!dryRun,
      Array.from(vipUris) // CORRECT: Pass the list of VIP URIs to protect them from removal
    );

    // 7. Success log
    if (config.ownerId) {
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
        `Curation completed for "${config.name}"`,
        {
          addedCount: finalAdded.length,
          removedCount: finalRemoved.length,
          finalCount: finalTrackList.length,
          dryRun
        }
      );
    }

    logger.info('Curation completed successfully.');
  }
}
