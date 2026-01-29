import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { PlaylistConfig } from '@smart-spotify-curator/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const rootDir = resolve(__dirname, '../../');
dotenv.config({ path: resolve(rootDir, '.env') });

// Setup Service Account path resolution
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = resolve(rootDir, process.env.GOOGLE_APPLICATION_CREDENTIALS);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log(`Using Credentials: ${credPath}`);
}

// Services
// We use require for .ts files because tsx handles them
const { SpotifyService } = require('../../functions/src/services/spotify-service.ts');
const { CurationEstimator } = require('../../functions/src/core/estimator.ts');

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const uid = 'DfUE3j76NRQFkMI8c1FZdBRxDKf2'; // Tommaso Scalici
  console.log(`🔍 Debugging Estimator for user: ${uid}`);

  try {
    // 1. Fetch any playlist config for this user
    console.log('Fetching playlist config...');
    const playlistsSnap = await db
      .collection('users')
      .doc(uid)
      .collection('playlists')
      .limit(1)
      .get();

    let configDoc;
    if (playlistsSnap.empty) {
      console.error('❌ No playlists found in Firestore for this user subcollection.');
      // Try collectionGroup as fallback
      console.log('Trying collectionGroup search...');
      const groupSnap = await db
        .collectionGroup('playlists')
        .where('ownerId', '==', uid)
        .limit(1)
        .get();
      if (groupSnap.empty) {
        console.error('❌ No playlists found via collectionGroup either.');
        return;
      }
      configDoc = groupSnap.docs[0];
    } else {
      configDoc = playlistsSnap.docs[0];
    }

    const config = configDoc.data();
    // Ensure ownerId is present
    if (!config.ownerId) config.ownerId = uid;

    console.log(`Testing with playlist: ${config.name} (${config.id})`);

    // 2. Fetch Spotify secrets
    console.log('Fetching Spotify secrets...');
    const secretSnap = await db.doc(`users/${uid}/secrets/spotify`).get();
    if (!secretSnap.exists) {
      throw new Error(`Spotify secrets not found at users/${uid}/secrets/spotify`);
    }
    const secretData = secretSnap.data()!;
    const refreshToken = secretData.refreshToken;
    if (!refreshToken) throw new Error('Refresh token missing in Firestore');

    // 3. Init Spotify Service
    console.log('Initializing Spotify Service...');
    // Note: This will trigger environment validation in config/env.ts
    const spotifyService = SpotifyService.createForUser(refreshToken);

    // 4. Run Estimator
    const estimator = new CurationEstimator();
    console.log('🚀 Running estimate()...');
    const estimate = await estimator.estimate(config as unknown as PlaylistConfig, spotifyService);

    console.log('✅ Estimate Results:');
    console.table(estimate);
  } catch (error) {
    console.error('❌ Debug Run Failed:');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error(error);
    }
  }
}

main();
