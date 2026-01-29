import { SpotifyService } from '../services/spotify-service';
import { AiService } from '../services/ai-service';
import { SlotManager } from './slot-manager';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { FirestoreLogger } from '../services/firestore-logger';
import { PromptGenerator } from '../services/prompt-generator';
import { DiffCalculator } from './diff-calculator';
import { TrackCleaner, RemovalReason } from './track-cleaner';

export class PlaylistOrchestrator {
  constructor(
    private aiService: AiService,
    private slotManager: SlotManager,
    private trackCleaner: TrackCleaner,
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
    spotifyService: SpotifyService,
    ownerName?: string
  ): Promise<void> {
    const { dryRun, curationRules } = config;

    // Spotify API generally expects IDs, not URIs. Sanitize just in case.
    const playlistId = config.id.replace('spotify:playlist:', '');

    logger.info(`Starting curation for playlist: ${config.name}`, {
      playlistId,
      originalId: config.id,
      dryRun
    });

    let currentLogId = '';

    if (config.ownerId) {
      // Initialize Run Log
      currentLogId = await this.firestoreLogger.logActivity(
        config.ownerId,
        'running',
        `Curating "${config.name || 'Untitled Playlist'}"...`,
        {
          playlistId: config.id,
          playlistName: config.name,
          dryRun: !!dryRun,
          progress: 0,
          step: 'Initializing...',
          triggeredBy: ownerName,
          state: 'running'
        }
      );
    }

    try {
      // 1. Fetch Tracks (Source of Truth)
      const currentTracks = await spotifyService.getPlaylistTracks(playlistId);
      const currentUriSet = new Set(currentTracks.map((t) => t.uri));

      logger.info(`Fetched ${currentTracks.length} tracks from Spotify.`);

      // 2. Filter & Clean (Dedupe, Age, Artist Limit) using TrackCleaner
      const vipUris = config.mandatoryTracks.map((m) => m.uri);
      const { survivingTracks, removedTracks } = this.trackCleaner.processCurrentTracks(
        currentTracks,
        config,
        vipUris
      );

      const removalReasons = new Map<string, RemovalReason | 'size_limit' | 'other'>();
      removedTracks.forEach((rt) => removalReasons.set(rt.uri, rt.reason));

      logger.info(
        `Filtered tracks. Survivors: ${survivingTracks.length}. Total Removed via rules: ${removedTracks.length}`
      );

      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'running',
          `Cleaned playlist. ${survivingTracks.length} tracks survived settings filters.`,
          {
            progress: 20,
            step: 'Cleaning existing tracks...',
            triggeredBy: ownerName,
            state: 'running'
          },
          currentLogId
        );
      }

      // Consistency FIX: Always fulfill the user's requested "tracksToAdd" count
      // rather than just filling the gap to target. This allows SlotManager to apply
      // the size limit strategy if the pool exceeds the target.
      const tracksNeeded = config.aiGeneration.tracksToAdd;

      const newAiTracks: {
        uri: string;
        artist: string;
        track: string;
        popularity?: number;
        addedAt?: Date;
      }[] = [];

      if (config.aiGeneration.enabled && tracksNeeded > 0) {
        logger.info(`Need ${tracksNeeded} more tracks. initiating AI generation...`, {
          model: config.aiGeneration.model
        });

        if (config.ownerId && currentLogId) {
          await this.firestoreLogger.logActivity(
            config.ownerId,
            'running',
            `Generating AI suggestions for "${config.name}"...`,
            {
              playlistId: config.id,
              playlistName: config.name,
              dryRun: !!dryRun,
              progress: 50,
              step: 'Generating suggestions...',
              triggeredBy: ownerName,
              state: 'running'
            },
            currentLogId
          );
        }

        const semanticExclusionList = survivingTracks.map((t) => `${t.artist} - ${t.name}`);

        const prompt = PromptGenerator.generatePrompt(
          config.name || 'Untitled Playlist',
          config.settings.description,
          config.aiGeneration.isInstrumentalOnly,
          config.settings.referenceArtists
        );

        const suggestions = await this.aiService.generateSuggestions(
          config.aiGeneration,
          prompt,
          tracksNeeded + 5, // Buffer
          semanticExclusionList
        );

        const batchArtistCounts: Record<string, number> = {};
        const currentUriSetExtended = new Set([...currentUriSet]);

        // Parallel Search in Batches to respect rate limits and improve performance
        // Parallel Search in Batches to respect rate limits and improve performance
        const BATCH_SIZE = 5;
        const totalBatches = Math.ceil(suggestions.length / BATCH_SIZE);

        for (let i = 0; i < suggestions.length; i += BATCH_SIZE) {
          if (newAiTracks.length >= tracksNeeded) break;

          // Update Progress during generation (30% -> 70%)
          if (config.ownerId && currentLogId) {
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
            const aiProgress = Math.round(30 + (currentBatch / totalBatches) * 40);
            await this.firestoreLogger.logActivity(
              config.ownerId,
              'running',
              `Finding tracks on Spotify (${currentBatch}/${totalBatches})...`,
              {
                playlistId: config.id,
                playlistName: config.name,
                dryRun: !!dryRun,
                progress: aiProgress,
                step: `Searching tracks (${newAiTracks.length} found)...`,
                triggeredBy: ownerName,
                state: 'running'
              },
              currentLogId
            );
          }

          const batch = suggestions.slice(i, i + BATCH_SIZE);
          const searchPromises = batch.map((suggestion) =>
            (async () => {
              // Quick check before searching
              if (
                (batchArtistCounts[suggestion.artist] || 0) >= curationRules.maxTracksPerArtist ||
                newAiTracks.length >= tracksNeeded
              ) {
                return null;
              }

              const trackInfo = await spotifyService.searchTrack(
                `${suggestion.artist} ${suggestion.track}`
              );

              if (trackInfo && !currentUriSetExtended.has(trackInfo.uri)) {
                return { suggestion, trackInfo };
              }
              return null;
            })()
          );

          const batchResults = await Promise.all(searchPromises);

          for (const res of batchResults) {
            if (!res) continue;
            const { suggestion, trackInfo } = res;

            // Re-verify limits after parallel result arrives
            if (
              newAiTracks.length < tracksNeeded &&
              (batchArtistCounts[suggestion.artist] || 0) < curationRules.maxTracksPerArtist &&
              !currentUriSetExtended.has(trackInfo.uri)
            ) {
              newAiTracks.push({
                uri: trackInfo.uri,
                artist: trackInfo.artist,
                track: trackInfo.name,
                popularity: trackInfo.popularity,
                addedAt: new Date() // AI tracks are "new"
              });
              batchArtistCounts[suggestion.artist] =
                (batchArtistCounts[suggestion.artist] || 0) + 1;
              currentUriSetExtended.add(trackInfo.uri);
            }
          }
        }
      }

      // 4. Final Assembly using SlotManager
      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'running',
          `Arranging tracks for "${config.name || 'Untitled Playlist'}"...`,
          {
            playlistId: config.id,
            playlistName: config.name,
            dryRun: !!dryRun,
            progress: 80,
            step: 'Arranging and sorting...',
            triggeredBy: ownerName,
            state: 'running'
          },
          currentLogId
        );
      }

      const finalTrackList = this.slotManager.arrangePlaylist(
        config.mandatoryTracks,
        survivingTracks,
        newAiTracks.map((t) => ({ ...t, name: t.track })),
        config.settings.targetTotalTracks,
        curationRules.shuffleAtEnd,
        curationRules.sizeLimitStrategy
      );

      // 4b. Identify Size Limit Drops
      const finalSet = new Set(finalTrackList);
      for (const track of survivingTracks) {
        if (!finalSet.has(track.uri) && !removalReasons.has(track.uri)) {
          removalReasons.set(track.uri, 'size_limit');
        }
      }

      // 5. Calculate Diff & Plan Updates
      const {
        added: finalAdded,
        removed: finalRemoved,
        keptMandatory
      } = DiffCalculator.calculate(
        currentTracks,
        survivingTracks,
        finalTrackList,
        config.mandatoryTracks,
        newAiTracks,
        removalReasons
      );

      // Log Planning for Disaster Recovery / Backup
      if (config.ownerId && currentLogId) {
        const kept = survivingTracks.filter(
          (t) => finalTrackList.includes(t.uri) && !keptMandatory.some((m) => m.uri === t.uri)
        );

        await this.firestoreLogger.logActivity(
          config.ownerId,
          'running',
          `Plan finalized. Updating Spotify...`,
          {
            playlistId: config.id,
            playlistName: config.name,
            dryRun: !!dryRun,
            progress: 85,
            step: 'Finalized update plan...',
            triggeredBy: ownerName,
            state: 'running',
            diff: {
              added: finalAdded,
              removed: finalRemoved,
              kept,
              keptMandatory,
              stats: {
                target: config.settings.targetTotalTracks,
                final: finalTrackList.length,
                success: true
              }
            }
          },
          currentLogId
        );
        // 6. Execute Updates via Spotify Service (The dangerous part)
        if (config.ownerId && currentLogId) {
          await this.firestoreLogger.logActivity(
            config.ownerId,
            'running',
            `Applying changes to Spotify: removing, reordering, and adding tracks...`,
            {
              playlistId: config.id,
              playlistName: config.name,
              dryRun: !!dryRun,
              progress: 90,
              step: 'Updating Spotify playlist...',
              triggeredBy: ownerName,
              state: 'running'
            },
            currentLogId
          );
        }
      } // This is the missing closing brace

      await spotifyService.performSmartUpdate(
        playlistId,
        finalTrackList, // The target list
        !!dryRun,
        vipUris // VIPs to preserve relative order/position if possible
      );

      // 7. Success log
      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'success',
          `Curation completed for "${config.name || 'Untitled Playlist'}"`,
          {
            progress: 100,
            step: 'Done',
            state: 'completed',
            playlistId: config.id,
            playlistName: config.name,
            dryRun: !!dryRun,
            triggeredBy: ownerName,
            diff: {
              added: finalAdded,
              removed: finalRemoved,
              keptMandatory,
              stats: {
                target: config.settings.targetTotalTracks,
                final: finalTrackList.length,
                success: Math.abs(finalTrackList.length - config.settings.targetTotalTracks) <= 2
              }
            }
          },
          currentLogId
        );
      }

      logger.info('Curation completed successfully.');
    } catch (error) {
      const errMsg = (error as Error).message;
      logger.error(`Error processing playlist ${config.name}`, error);

      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'error',
          `Failed to curate "${config.name || 'Untitled Playlist'}"`,
          {
            state: 'error',
            error: errMsg,
            playlistId: config.id,
            playlistName: config.name,
            dryRun: !!dryRun,
            triggeredBy: ownerName
          },
          currentLogId
        );
      }
      throw error;
    }
  }
}
