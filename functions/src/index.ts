import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { ConfigService } from "./services/config-service";
import { AiService } from "./services/ai-service";
import { SpotifyService } from "./services/spotify-service";
import { PlaylistOrchestrator } from "./core/orchestrator";
import { TrackCleaner } from "./core/track-cleaner";
import { SlotManager } from "./core/slot-manager";
import { PlaylistConfig } from "./types";

export const updatePlaylists = onRequest({
    timeoutSeconds: 540,
    secrets: [
        "SPOTIFY_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET",
        "SPOTIFY_REFRESH_TOKEN",
        "GOOGLE_AI_API_KEY"
    ]
}, async (request, response) => {
    logger.info("Received request to update playlists (Firestore-backed).");

    const configService = new ConfigService();
    let configs: PlaylistConfig[] = [];

    try {
        configs = await configService.getEnabledPlaylists();
        if (configs.length === 0) {
            logger.info("No enabled playlists found to update.");
            response.json({ message: "No enabled playlists found.", results: [] });
            return;
        }
    } catch (e) {
        logger.error("Failed to load configuration from Firestore", e);
        response.status(500).send("Configuration Back-end Error: " + (e as Error).message);
        return;
    }

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

    const results = [];

    for (const playlistConfig of configs) {


        try {
            await orchestrator.curatePlaylist(playlistConfig);
            results.push({ name: playlistConfig.name, status: "success" });
        } catch (error) {
            logger.error(`Error processing playlist ${playlistConfig.name}`, error);
            results.push({ name: playlistConfig.name, status: "error", error: (error as Error).message });
        }
    }

    response.json({ message: "Playlist update completed", results });
});
