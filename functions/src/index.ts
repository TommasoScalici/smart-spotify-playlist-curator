/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Set max instances to control costs and concurrency
setGlobalOptions({ maxInstances: 10 });

import { loadAppConfig } from "./config/config";
import { AiService } from "./services/ai-service";
import { SpotifyService } from "./services/spotify-service";
import { PlaylistOrchestrator } from "./core/orchestrator";
import { TrackCleaner } from "./core/track-cleaner";
import { SlotManager } from "./core/slot-manager";

// Set max instances to control costs and concurrency
setGlobalOptions({ maxInstances: 1 }); // Sequential processing might be safer for now to avoid rate limits if running parallel

export const updatePlaylists = onRequest({ timeoutSeconds: 540 }, async (request, response) => {
    logger.info("Received request to update playlists.");

    let config;
    try {
        config = loadAppConfig();
    } catch (e) {
        logger.error("Failed to load configuration", e);
        response.status(500).send("Configuration Error: " + (e as Error).message);
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

    for (const playlistConfig of config) {
        if (!playlistConfig.enabled) {
            logger.info(`Skipping disabled playlist: ${playlistConfig.name}`);
            results.push({ name: playlistConfig.name, status: "skipped" });
            continue;
        }

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
