import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SERVICE_ACCOUNT_PATH) {
    console.warn("⚠️  GOOGLE_APPLICATION_CREDENTIALS not set. Using default credentials.");
}

// Initialize Admin SDK
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

// Minimal Schema for reading the file (we rely on the functions schema for strict validation later)
// We just want to read the array.
const ConfigFileSchema = z.array(z.any());

async function seedConfig() {
    console.log("🚀 Starting Config Seeding...");

    const configPath = path.resolve(__dirname, '../../playlists-config.json');
    if (!fs.existsSync(configPath)) {
        console.error(`❌ Config file not found at: ${configPath}`);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const playlists = ConfigFileSchema.parse(rawData);

    console.log(`Found ${playlists.length} playlists to migrate.`);

    const batch = db.batch();
    const collectionRef = db.collection('playlists');

    for (const playlist of playlists) {
        // Use the Spotify Playlist URI (modified) as the Document ID for uniqueness
        // spotify:playlist:abc -> spotify_playlist_abc
        const docId = playlist.id.replace(/:/g, '_');
        const docRef = collectionRef.doc(docId);

        batch.set(docRef, playlist);
        console.log(`Prepared: ${playlist.name} (${docId})`);
    }

    try {
        await batch.commit();
        console.log("✅ Successfully seeded Firestore with playlist configurations.");
    } catch (error) {
        console.error("❌ Error committing batch:", error);
        process.exit(1);
    }
}

seedConfig().catch(console.error);
