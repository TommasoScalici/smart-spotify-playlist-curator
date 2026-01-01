import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as dotenv from 'dotenv';
import type { PlaylistConfig } from '../../functions/src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Services
const { SpotifyService } = require('../../functions/src/services/spotify-service.ts');
const { AiService } = require('../../functions/src/services/ai-service.ts');
const { PlaylistOrchestrator } = require('../../functions/src/core/orchestrator.ts');
const { TrackCleaner } = require('../../functions/src/core/track-cleaner.ts');
const { SlotManager } = require('../../functions/src/core/slot-manager.ts');

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function main() {
    console.log("🚀 Starting LIVE CURATOR Run...");
    console.warn("⚠️  WARNING: This will MODIFY your Spotify Playlists!");

    // 1. Init
    if (!getApps().length) {
        initializeApp();
    }
    const db = getFirestore();

    const spotifyService = SpotifyService.getInstance();
    const aiService = new AiService();
    const trackCleaner = new TrackCleaner();
    const slotManager = new SlotManager();
    const orchestrator = new PlaylistOrchestrator(spotifyService, aiService, trackCleaner, slotManager);

    // 2. Fetch Config
    console.log("Fetching enabled playlists from Firestore...");
    const snapshot = await db.collection('playlists').where('enabled', '==', true).get();

    if (snapshot.empty) {
        console.log("No enabled playlists found.");
        return;
    }

    console.log(`Found ${snapshot.size} enabled playlists.`);

    // 3. Process
    for (const doc of snapshot.docs) {
        const config = doc.data() as PlaylistConfig;
        console.log(`\n\n--- Processing: ${config.name} (${config.id}) ---`);

        // Ensure dryRun is FALSE for live run, unless explicitly set to true in Firestore config
        // If the user sets dryRun: true in Firestore, we respect it.
        // But for a "True Run", usually we assume the intention is to execute.
        // However, safety first: if the config SAYS dryRun:true, we shouldn't override it to false forcefully 
        // unless we want to force-run. 
        // Let's assume the user wants to respect the config, BUT if the config says dryRun:true, 
        // this script will just be a verbose dry run. 
        // If the user wants to FORCE a live run, they should ensure the config says dryRun: false 
        // OR we can default it to false if undefined, but respect true.
        // For this script, let's respect the Firestore value. 
        // If the user says "Full true run", they likely mean "Execute what's configured".

        try {
            await orchestrator.curatePlaylist(config, `manual-live-${Date.now()}`);
            console.log(`✅ Completed: ${config.name}`);
        } catch (error) {
            console.error(`❌ Failed: ${config.name}`, error);
        }
    }
}

main().catch(console.error);
