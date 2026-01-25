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

      // 2. Filter & Clean (Dedupe, Age, Artist Limit)
      const tracksToRemove: string[] = [];
      const survivingTracks: TrackWithMeta[] = [];
      const seenUris = new Set<string>();
      const seenSignatures = new Set<string>();
      const artistCounts: Record<string, number> = {};
      const vipUris = new Set(config.mandatoryTracks.map((m) => m.uri)); // Protect VIPs
      const now = Date.now();
      const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;

      const removalReasons = new Map<
        string,
        'duplicate' | 'expired' | 'artist_limit' | 'size_limit' | 'other'
      >();
      let duplicatesRemoved = 0;
      let expiredRemoved = 0;
      let artistLimitRemoved = 0;

      for (const item of currentTracks) {
        // Create a unique signature for the track content (Name:Artist:Album)
        const normalizedName = item.name.trim().toLowerCase();
        const normalizedArtistString = item.artist.trim().toLowerCase();
        const normalizedAlbum = item.album.trim().toLowerCase();
        const signature = `${normalizedName}:${normalizedArtistString}:${normalizedAlbum}`;

        // 2a. Deduplication (Same URI or Same Metadata Signature)
        if (
          curationRules.removeDuplicates &&
          (seenUris.has(item.uri) || seenSignatures.has(signature))
        ) {
          if (seenSignatures.has(signature) && !seenUris.has(item.uri)) {
            logger.info(
              `Deduplicating track by signature conflict: "${item.name}" [${signature}]`,
              {
                uri: item.uri
              }
            );
          }
          tracksToRemove.push(item.uri);
          removalReasons.set(item.uri, 'duplicate');
          duplicatesRemoved++;
          continue;
        }
        seenUris.add(item.uri);
        seenSignatures.add(signature);

        // 2b. Age Check (Protect VIPs)
        const addedAt = new Date(item.addedAt).getTime();
        const age = now - addedAt;
        if (!vipUris.has(item.uri) && age > maxAgeMs) {
          tracksToRemove.push(item.uri);
          removalReasons.set(item.uri, 'expired');
          expiredRemoved++;
          continue; // Don't include in survivors
        }

        // 2c. Artist Limit Check (Protect VIPs)
        if (!vipUris.has(item.uri)) {
          // Identify Primary Artist (Split by comma if multiple)
          const primaryArtist = item.artist.split(',')[0].trim().toLowerCase();
          const isVarious = primaryArtist === 'various artists';

          if (!isVarious) {
            const count = artistCounts[primaryArtist] || 0;
            if (count >= curationRules.maxTracksPerArtist) {
              logger.info(`Artist limit reached for "${primaryArtist}". Removing "${item.name}"`, {
                uri: item.uri
              });
              tracksToRemove.push(item.uri);
              removalReasons.set(item.uri, 'artist_limit');
              artistLimitRemoved++;
              continue;
            }
            artistCounts[primaryArtist] = count + 1;
          }
        }

        survivingTracks.push({
          uri: item.uri,
          artist: item.artist,
          name: item.name,
          album: item.album,
          addedAt: new Date(item.addedAt),
          isVip: vipUris.has(item.uri)
        });
      }

      logger.info(
        `Filtered tracks. Survivors: ${survivingTracks.length}. Dups: ${duplicatesRemoved}. Expired: ${expiredRemoved}. Artist Limit: ${artistLimitRemoved}`
      );

      // 3. AI Generation (if needed)
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

        if (config.ownerId && currentLogId) {
          await this.firestoreLogger.logActivity(
            config.ownerId,
            'running',
            `Generating AI suggestions for "${config.name}"...`,
            {
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

        for (const suggestion of suggestions) {
          if (newAiTracks.length >= tracksNeeded) break;
          if ((batchArtistCounts[suggestion.artist] || 0) >= curationRules.maxTracksPerArtist)
            continue;

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
      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'running',
          `Arranging tracks for "${config.name || 'Untitled Playlist'}"...`,
          {
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
        newAiTracks,
        config.settings.targetTotalTracks,
        curationRules.shuffleAtEnd
      );

      // 4b. Identify Size Limit Drops
      const finalSet = new Set(finalTrackList);
      for (const track of survivingTracks) {
        if (!finalSet.has(track.uri) && !removalReasons.has(track.uri)) {
          removalReasons.set(track.uri, 'size_limit');
        }
      }

      // 5. Calculate Diff & Commit
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

      if (config.ownerId && currentLogId) {
        await this.firestoreLogger.logActivity(
          config.ownerId,
          'running',
          `Updating Spotify for "${config.name}"...`,
          {
            progress: 90,
            step: 'Updating Spotify API...',
            triggeredBy: ownerName,
            state: 'running'
          },
          currentLogId
        );
      }

      await spotifyService.performSmartUpdate(
        playlistId,
        finalTrackList,
        !!dryRun,
        Array.from(vipUris)
      );

      // 7. Success log
      if (config.ownerId && currentLogId) {
        const aiTracksAdded = newAiTracks.length;
        const addedCount = finalAdded.length;

        // Calculate exclusive counts for better UX badges (no double counting)
        const duplicatesCount = finalRemoved.filter((r) => r.reason === 'duplicate').length;
        const expiredCount = finalRemoved.filter((r) => r.reason === 'expired').length;
        const artistLimitCount = finalRemoved.filter((r) => r.reason === 'artist_limit').length;
        const sizeLimitCount = finalRemoved.filter((r) => r.reason === 'size_limit').length;

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
            addedCount,
            removedCount: finalRemoved.length,
            aiTracksAdded,
            duplicatesRemoved: duplicatesCount,
            expiredRemoved: expiredCount,
            artistLimitRemoved: artistLimitCount,
            sizeLimitRemoved: sizeLimitCount,
            finalCount: finalTrackList.length,
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

    logger.info('Curation completed successfully.');
  }
}
