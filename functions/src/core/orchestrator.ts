import { SpotifyService } from '../services/spotify-service';
import { AiService } from '../services/ai-service';
import { TrackCleaner } from './track-cleaner';
import { SlotManager } from './slot-manager';
import { PlaylistConfig } from '../types';

export class PlaylistOrchestrator {
    constructor(
        private spotifyService: SpotifyService,
        private aiService: AiService,
        private trackCleaner: TrackCleaner,
        private slotManager: SlotManager
    ) { }

    public async curatePlaylist(config: PlaylistConfig): Promise<void> {
        const { settings } = config;
        const targetTotal = settings.targetTotalTracks;

        console.log(`Starting curation for playlist: ${config.name} (${config.id})`);

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
            // Path 1: Empty Playlist - Full Refill

            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris);
            keptTracks = result.keptTracks;
            slotsNeeded = result.slotsNeeded;

        } else if (currentSize < targetTotal) {
            // Path 2: Under Target - Standard Clean & Fill
            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris);
            keptTracks = result.keptTracks;
            tracksToRemove = result.tracksToRemove;
            slotsNeeded = result.slotsNeeded;

        } else {
            // Path 3: Over Target - Aggressive Cleanup
            // Force a gap to allow new tracks (Target - 15)
            // Ensure we don't go negative or too low? (e.g. if target is 10)
            const aggressiveTarget = Math.max(0, targetTotal - 15);

            const result = this.trackCleaner.processCurrentTracks(cleanerInput, config, vipUris, aggressiveTarget);
            keptTracks = result.keptTracks;
            tracksToRemove = result.tracksToRemove;
            // Recalculate slots needed based on ORIGINAL target
            // internal cleaner used aggressiveTarget to chop tracks, so keptTracks.length <= aggressiveTarget
            // slotsNeeded should be targetTotal - keptTracks.length
            slotsNeeded = Math.max(0, targetTotal - keptTracks.length);
        }

        // 3. AI Refill
        let newAiTrackUris: string[] = [];
        if (slotsNeeded > 0) {
            console.log(`Need ${slotsNeeded} new tracks.`);

            // Get existing URIs to exclude from AI suggestions (includes kept tracks + tracks we just removed to avoid instant re-add)
            // Ideally we also track "recently removed" in DB, but for now just current session context.
            const existingUris = [...keptTracks.map(t => t.uri), ...tracksToRemove];

            // Request a buffer to account for search failures (e.g. track not found or mismatch)
            const buffer = 5;
            const requestCount = slotsNeeded + buffer;

            console.log(`Requesting ${requestCount} suggestions from AI...`);

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
                    console.warn(`\u26A0 Could not find track on Spotify: "${suggestion.artist} - ${suggestion.track}"`);
                }
            }
            console.log(`Successfully found ${newAiTrackUris.length} valid tracks.`);
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
            finalTrackList
        );

        console.log(`Curation complete for ${config.name}.`);
    }
}
