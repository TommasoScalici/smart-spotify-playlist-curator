import { SpotifyService } from '../services/spotify-service';
import { AiService } from '../services/ai-service';
import { TrackCleaner } from './track-cleaner';
import { SlotManager } from './slot-manager';
import { PlaylistConfig } from '../types';
import * as logger from "firebase-functions/logger";

export class PlaylistOrchestrator {
    constructor(
        private spotifyService: SpotifyService,
        private aiService: AiService,
        private trackCleaner: TrackCleaner,
        private slotManager: SlotManager
    ) { }

    public async curatePlaylist(config: PlaylistConfig, runId?: string): Promise<void> {
        const { settings, dryRun } = config;
        const targetTotal = settings.targetTotalTracks;

        logger.info(`Starting curation for playlist: ${config.name}`, { playlistId: config.id, dryRun, runId });

        // Sanitize ID (handle spotify:playlist: prefix)
        const playlistId = config.id.replace("spotify:playlist:", "");

        // 1. Fetch Current State
        const currentTracks = await this.spotifyService.getPlaylistTracks(playlistId);

        // Map to format expected by cleaner
        const cleanerInput = currentTracks.map(t => ({
            track: { uri: t.uri },
            added_at: t.addedAt
        }));

        const vipUris = config.mandatoryTracks.map(m => m.uri);
        const currentSize = currentTracks.length;

        let keptTracks: { uri: string; addedAt: Date; isVip: boolean }[] = [];
        let tracksToRemove: string[] = [];
        let slotsNeeded = 0;

        // 2. Logic Paths
        if (currentSize === 0) {
            // Path 1: Empty Playlist
            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris);
            keptTracks = result.keptTracks;
            slotsNeeded = result.slotsNeeded;

        } else if (currentSize < targetTotal) {
            // Path 2: Under Target (Standard Fill)
            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris);
            keptTracks = result.keptTracks;
            tracksToRemove = result.tracksToRemove;
            slotsNeeded = result.slotsNeeded;

        } else {
            // Path 3: Over Target (Aggressive Cleanup)
            // Force a 15-track gap to allow fresh rotation
            const aggressiveTarget = Math.max(0, targetTotal - 15);
            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris, aggressiveTarget);

            keptTracks = result.keptTracks;
            tracksToRemove = result.tracksToRemove;
            slotsNeeded = Math.max(0, targetTotal - keptTracks.length);
        }

        // 3. AI Refill
        const newAiTrackUris: string[] = [];
        if (slotsNeeded > 0) {
            logger.info(`Need ${slotsNeeded} new tracks.`, { slotsNeeded });

            // Exclude already kept or removed tracks to avoid immediate duplicates
            const existingUris = [...keptTracks.map(t => t.uri), ...tracksToRemove];

            const buffer = 5;
            const requestCount = slotsNeeded + buffer;

            logger.info(`Requesting ${requestCount} suggestions from AI...`, { requestCount });

            const suggestions = await this.aiService.generateSuggestions(
                config.aiGeneration,
                requestCount,
                existingUris,
                config.settings.referenceArtists
            );

            // Search Spotify for URIs
            for (const suggestion of suggestions) {
                // Stop if we have enough
                if (newAiTrackUris.length >= slotsNeeded) break;

                const query = `track:${suggestion.track} artist:${suggestion.artist}`;
                const uri = await this.spotifyService.searchTrack(query);
                if (uri) {
                    newAiTrackUris.push(uri);
                } else {
                    logger.warn(`Could not find track on Spotify: "${suggestion.artist} - ${suggestion.track}"`, { suggestion });
                }
            }
            logger.info(`Successfully found ${newAiTrackUris.length} valid tracks.`);
        }

        // 4. Arrange & Update
        const survivorUris = keptTracks.map(t => t.uri);

        const finalTrackList = this.slotManager.arrangePlaylist(
            config.mandatoryTracks,
            survivorUris,
            newAiTrackUris,
            targetTotal
        );

        await this.spotifyService.performSmartUpdate(
            playlistId,
            tracksToRemove,
            newAiTrackUris,
            finalTrackList,
            dryRun
        );

        logger.info(`Curation complete for ${config.name}.`, { playlistId, changesApplied: !dryRun });
    }
}
