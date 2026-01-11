import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as dotenv from 'dotenv';

// Import Types (ESM compatible for types)
import type { PlaylistConfig } from '../../functions/src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

// Require services (CJS compatibility)
// We point to .ts files because tsx handles them
const { SpotifyService } = require('../../functions/src/services/spotify-service.ts');
const { AiService } = require('../../functions/src/services/ai-service.ts');
const { PlaylistOrchestrator } = require('../../functions/src/core/orchestrator.ts');
const { TrackCleaner } = require('../../functions/src/core/track-cleaner.ts');
const { SlotManager } = require('../../functions/src/core/slot-manager.ts');

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function main() {
  console.log('🚀 Starting DRY RUN Check (Firestore Mode)...');

  // 1. Initialize Services
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

  // 2. Initialize Firebase Admin (for Config)
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();

  // 3. Fetch Config from Firestore
  // We'll grab the first enabled playlist to test against
  console.log('Fetching enabled playlists from Firestore...');
  const snapshot = await db.collection('playlists').where('enabled', '==', true).limit(1).get();

  if (snapshot.empty) {
    console.error('❌ No enabled playlists found in Firestore to test.');
    process.exit(1);
  }

  const doc = snapshot.docs[0];
  const rawConfig = doc.data() as PlaylistConfig;
  console.log(`Testing against playlist: ${rawConfig.name} (${rawConfig.id})`);

  // 4. Force Dry Run
  const testConfig: PlaylistConfig = {
    ...rawConfig,
    dryRun: true // <--- CRITICAL OVERRIDE
  };

  const runId = `dry-run-${Date.now()}`;
  console.log(`Run ID: ${runId}`);

  try {
    await orchestrator.curatePlaylist(testConfig, runId);
    console.log("✅ Dry Run Completed successfully. Check logs for 'DRY RUN' tags.");
  } catch (error) {
    console.error('❌ Dry Run Failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
