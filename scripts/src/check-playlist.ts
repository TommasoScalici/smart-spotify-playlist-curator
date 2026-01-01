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

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function main() {
    console.log("🚀 Checking Playlist State (Firestore Mode)...");

    if (!getApps().length) {
        initializeApp();
    }
    const db = getFirestore();
    const spotifyService = SpotifyService.getInstance();

    console.log("Fetching enabled playlists...");
    const snapshot = await db.collection('playlists').where('enabled', '==', true).get();

    for (const doc of snapshot.docs) {
        const config = doc.data() as PlaylistConfig;

        // Filter for "Instrumental Prog" if multiple
        if (!config.name.includes("Instrumental Prog")) continue;

        const playlistId = config.id.replace("spotify:playlist:", "");
        console.log(`\nInspecting: ${config.name} (${playlistId})`);

        // Log expected VIPs
        console.log("Expected VIP Tracks:");
        config.mandatoryTracks.forEach(m => console.log(`- [${m.uri}] @ Slot ${m.positionIndex}`));

        const tracks = await spotifyService.getPlaylistTracks(playlistId);

        console.log(`\nActual Tracks (${tracks.length}):`);
        tracks.forEach((t, i) => {
            const isVip = config.mandatoryTracks.some(m => m.uri === t.uri);
            const marker = isVip ? "🌟 VIP" : "";
            console.log(`${i}. [${t.uri}] ${t.artist} - ${t.name} ${marker}`);
        });

        // Verification
        const missingVips = config.mandatoryTracks.filter(m => !tracks.some(t => t.uri === m.uri));
        if (missingVips.length > 0) {
            console.error("\n❌ FAILED: Missing VIP Tracks:");
            missingVips.forEach(m => console.log(`- ${m.uri}`));
        } else {
            console.log("\n✅ All VIP Tracks Present.");
        }
    }
}

main().catch(console.error);
