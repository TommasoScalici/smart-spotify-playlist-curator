
import { SpotifyService } from '../../functions/src/services/spotify-service';
import { AiService } from '../../functions/src/services/ai-service';
import { PlaylistOrchestrator } from '../../functions/src/core/orchestrator';
import { TrackCleaner } from '../../functions/src/core/track-cleaner';
import { SlotManager } from '../../functions/src/core/slot-manager';
import { PlaylistConfig } from '../../functions/src/types';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../functions/.env') });

async function main() {
    console.log("🚀 Starting DRY RUN Check...");

    // 1. Initialize Services
    const spotifyService = SpotifyService.getInstance();
    const aiService = new AiService();
    const trackCleaner = new TrackCleaner();
    const slotManager = new SlotManager();
    const orchestrator = new PlaylistOrchestrator(spotifyService, aiService, trackCleaner, slotManager);

    // 2. Define Test Config with DryRun = TRUE
    const testConfig: PlaylistConfig = {
        id: "spotify:playlist:49NveLmBkE159Zt6g0Novv", // Use your real test playlist ID
        name: "Dry Run Verification Playlist",
        enabled: true,
        dryRun: true, // <--- CRITICAL
        settings: {
            targetTotalTracks: 50,
            description: "Dry run test",
            referenceArtists: ["Dua Lipa", "The Weeknd"]
        },
        curationRules: {
            maxTrackAgeDays: 30,
            removeDuplicates: true
        },
        mandatoryTracks: [],
        aiGeneration: {
            prompt: "Modern Pop Hits",
            model: "gemini-2.5-flash",
            temperature: 0.7,
            refillBatchSize: 5
        }
    };

    const runId = `dry-run-${Date.now()}`;
    console.log(`Run ID: ${runId}`);

    try {
        await orchestrator.curatePlaylist(testConfig, runId);
        console.log("✅ Dry Run Completed successfully. Check logs for 'DRY RUN' tags.");
    } catch (error) {
        console.error("❌ Dry Run Failed:", error);
        process.exit(1);
    }
}

main().catch(console.error);
