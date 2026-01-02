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

        const playlistId = config.id.replace("spotify:playlist:", "");
        console.log(`\n---------------------------------------------------`);
        console.log(`Inspecting: ${config.name} (${playlistId})`);

        // Log expected VIPs
        const vipUris = config.mandatoryTracks.map(m => m.uri);
        // console.log("Expected VIP Tracks:", vipUris.length);

        const tracks = await spotifyService.getPlaylistTracks(playlistId);

        console.log(`Total Tracks: ${tracks.length}`);

        tracks.forEach((t: { uri: string; artist: string; name: string }, i: number) => {
            const isVip = config.mandatoryTracks.some(m => m.uri === t.uri);
            const marker = isVip ? "🌟 VIP" : "";
            console.log(`${i}. [${t.uri}] ${t.artist} - ${t.name} ${marker}`);
        });
        // 1. VIP Verification
        const missingVips = config.mandatoryTracks.filter(m => !tracks.some(t => t.uri === m.uri));
        if (missingVips.length > 0) {
            console.error("❌ FAILED: Missing VIP Tracks:");
            missingVips.forEach(m => console.log(`- ${m.uri}`));
        } else {
            console.log("✅ VIP Check: All Present.");
        }

        // 2. Artist Separation (Clumping) Verification
        let clumpingIssues = 0;
        let previousArtist = "";

        // 3. Artist Limit Verification
        const artistCounts: { [key: string]: number } = {};
        const artistLimitViolations: string[] = [];

        tracks.forEach((t: { uri: string; artist: string; name: string }, i: number) => {
            // Clumping Check
            if (i > 0 && t.artist === previousArtist) {
                // Ignore if both are VIPs (mandatory placement might force it) 
                // But typically we want to avoid it for AI tracks.
                // Let's log warn.
                const prevIsVip = vipUris.includes(tracks[i - 1].uri);
                const currIsVip = vipUris.includes(t.uri);

                if (!prevIsVip && !currIsVip) { // Only strict for non-VIPs
                    console.warn(`⚠️ Clumping Detected at ${i}: "${t.artist}" follows "${previousArtist}"`);
                    clumpingIssues++;
                }
            }
            previousArtist = t.artist;

            // Limit Check
            const isVip = vipUris.includes(t.uri);
            if (!isVip) {
                artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            }
        });

        Object.entries(artistCounts).forEach(([artist, count]: [string, number]) => {
            if (count > 2) {
                artistLimitViolations.push(`${artist} (${count})`);
            }
        });

        if (clumpingIssues === 0) {
            console.log("✅ Anti-Clumping Check: Passed (No consecutive non-VIP artists).");
        } else {
            console.warn(`⚠️ Anti-Clumping Check: Found ${clumpingIssues} consecutive occurrences.`);
        }

        if (artistLimitViolations.length === 0) {
            console.log("✅ Artist Limit Check: Passed (Max 2 non-VIP tracks/artist).");
        } else {
            console.error(`❌ Artist Limit Check: Failed for: ${artistLimitViolations.join(", ")}`);
        }
    }
}

main().catch(console.error);
