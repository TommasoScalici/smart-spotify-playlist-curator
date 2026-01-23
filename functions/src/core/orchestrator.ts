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
    const survivingTracks = [];
    const seenUris = new Set<string>();
    const now = Date.now();
    const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;

    for (const item of currentTracks) {
      // 2a. Deduplication
      if (curationRules.removeDuplicates && seenUris.has(item.uri)) {
        tracksToRemove.push(item.uri);
        continue;
      }
      seenUris.add(item.uri);

      // 2b. Age Check
      const addedAt = new Date(item.addedAt).getTime();
      const age = now - addedAt;
      if (age > maxAgeMs) {
        tracksToRemove.push(item.uri);
        continue; // Don't include in survivors
      }

      survivingTracks.push({
        uri: item.uri,
        artist: item.artist,
        track: item.name, // Mapping 'name' to 'track' for internal consistency if needed
        addedAt: item.addedAt
      });
    }

    logger.info(
      `Filtered tracks. Survivors: ${survivingTracks.length}. To Remove: ${tracksToRemove.length}`
    );

    // If Dry Run, we don't actually delete, but we track intent
    // Implementation Note: We'll calculate the final diff at the end

    // 3. Mandatory Tracks Injection
    // We already have the config.mandatoryTracks.
    // We need to resolve them if they aren't fully hydrated?
    // For now, assume config has URIs. We'll ensure they are in the mix.
    const mandatoryToAdd = config.mandatoryTracks.filter((abc) => !currentUriSet.has(abc.uri));

    // 4. AI Generation (if needed)
    const tracksNeeded =
      config.settings.targetTotalTracks - survivingTracks.length - mandatoryToAdd.length;
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

      // Build exclusion list (Title - Artist) to prevent re-adding what we have
      const semanticExclusionList = survivingTracks.map((t) => `${t.artist} - ${t.track}`);

      // Generate prompt
      const prompt = PromptGenerator.generatePrompt(
        config.name || 'Untitled Playlist',
        config.settings.description,
        config.aiGeneration.isInstrumentalOnly
      );

      // Fetch Suggestions
      // We use a small buffer (e.g. +5) just in case some aren't found, but no complex overfetch ratio logic exposed to user
      const buffer = 5;
      const suggestions = await this.aiService.generateSuggestions(
        config.aiGeneration,
        prompt,
        tracksNeeded + buffer,
        semanticExclusionList
      );

      // Resolve to URIs
      // Track artist counts for this batch to enforce simple limit (max 2 per artist in this batch)
      const batchArtistCounts: Record<string, number> = {};

      for (const suggestion of suggestions) {
        if (newAiTracks.length >= tracksNeeded) break;

        // Artist limit check
        if ((batchArtistCounts[suggestion.artist] || 0) >= 2) continue;

        const trackInfo = await spotifyService.searchTrack(
          `${suggestion.artist} ${suggestion.track}`
        );

        if (trackInfo) {
          // Check if already in playlist or already in new batch
          const isDuplicate =
            currentUriSet.has(trackInfo.uri) ||
            mandatoryToAdd.some((m) => m.uri === trackInfo.uri) ||
            newAiTracks.some((t) => t.uri === trackInfo.uri);

          if (!isDuplicate) {
            newAiTracks.push({
              uri: trackInfo.uri,
              artist: trackInfo.artist,
              track: trackInfo.name
            });
            batchArtistCounts[suggestion.artist] = (batchArtistCounts[suggestion.artist] || 0) + 1;
            currentUriSet.add(trackInfo.uri); // Add to set to prevent duplicate in same batch
          }
        }
      }
    }

    // 5. Smart Shuffle & Final Assembly
    if (config.ownerId) {
      await this.firestoreLogger.updateCurationStatus(config.ownerId as string, config.id, {
        state: 'running',
        progress: 80,
        step: 'Shuffling and finalizing...',
        isDryRun: !!dryRun
      });
    }

    // Combine everything for the final shuffle
    const allTracksToShuffle = [
      ...survivingTracks, // These have { uri, artist }
      ...newAiTracks // These have { uri, artist }
    ];

    // Use SlotManager to shuffle with rules
    const finalTrackList = this.slotManager.shuffleWithRules(allTracksToShuffle);

    // 6. Calculate Diff & Commit

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

    // Actual Verification/Update
    await spotifyService.performSmartUpdate(
      config.id,
      finalTrackList,
      !!dryRun,
      config.settings.referenceArtists
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
