
import { loadAppConfig } from "../../functions/src/config/config";
import { AiService } from "../../functions/src/services/ai-service";
import { SpotifyService } from "../../functions/src/services/spotify-service";
import { PlaylistOrchestrator } from "../../functions/src/core/orchestrator";
import { TrackCleaner } from "../../functions/src/core/track-cleaner";
import { SlotManager } from "../../functions/src/core/slot-manager";

async function main() {
    console.log("Starting Manual Curator Run...");

    try {
        const config = loadAppConfig();
        console.log(`Loaded configuration for ${config.length} playlists.`);

        const spotifyService = SpotifyService.getInstance();
        const aiService = new AiService();
        const trackCleaner = new TrackCleaner();
        const slotManager = new SlotManager();

        const orchestrator = new PlaylistOrchestrator(
            spotifyService,
            aiService,
            trackCleaner,
            slotManager
        );

        for (const playlistConfig of config) {
            if (!playlistConfig.enabled) {
                console.log(`Skipping disabled playlist: ${playlistConfig.name}`);
                continue;
            }

            console.log(`\n--- Processing Playlist: ${playlistConfig.name} ---`);
            try {
                await orchestrator.curatePlaylist(playlistConfig);
                console.log(`\u2705 Successfully processed ${playlistConfig.name}`);
            } catch (error) {
                console.error(`\u274C Error processing ${playlistConfig.name}:`, error);
            }
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

main();
