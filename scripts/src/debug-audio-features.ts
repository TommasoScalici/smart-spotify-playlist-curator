import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Services
const { SpotifyService } = require('../../functions/src/services/spotify-service.ts');

dotenv.config({ path: resolve(__dirname, '../../.env') });

// Resolve credentials path relative to project root (if set)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('.')) {
    const rootDir = resolve(__dirname, '../../');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(rootDir, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

async function main() {
    console.log("🔍 Checking Audio Features Access...");

    try {
        const spotifyService = SpotifyService.getInstance();

        // Test Track: "Never Gonna Give You Up" by Rick Astley
        const testTrackUri = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";

        console.log(`Testing with track: ${testTrackUri}`);

        // 1. Check basic connection (Get Track)
        console.log("1. Fetching Track Metadata...");
        const trackInfo = await spotifyService.getTracks([testTrackUri]);
        if (trackInfo.length === 0) {
            console.error("❌ Failed to fetch track metadata. Token might be invalid for basic reads.");
            return;
        }
        console.log(`✅ Metadata OK: ${trackInfo[0].name} by ${trackInfo[0].artist}`);

        // 2. Check Audio Features
        console.log("2. Fetching Audio Features...");
        const features = await spotifyService.getAudioFeatures([testTrackUri]);

        if (features && features.length > 0 && features[0]) {
            console.log("✅ Audio Features Result:");
            console.log(JSON.stringify(features[0], null, 2));
            console.log("🎉 SUCCESS! Audio Features API is working with current token.");
        } else {
            console.error("❌ Audio Features returned empty/null. Scopes might still be insufficient or track restricted.");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("❌ API Error:", error.message || error);
        if (error.statusCode === 403) {
            console.error("⚠️  403 FORBIDDEN: This confirms the scope/permission issue persists.");
        }
    }
}

main().catch(console.error);
