import { MandatoryTrack, PlaylistConfig } from '@smart-spotify-curator/shared';
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../functions/.env') });

// Initialize Admin SDK using service account if present
const serviceAccountPath = path.resolve(__dirname, '../../../service-account.json');
if (!getApps().length) {
  if (fs.existsSync(serviceAccountPath)) {
    console.log('Using service account from file');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // Rely on application default credentials
    initializeApp();
  }
}

const db = getFirestore();

async function analyzeCurationOptions() {
  console.log('🔍 Analyzing Users, Playlists, and Recent Activities...');

  const usersSnapshot = await db.collection('users').get();
  console.log(`\nFound ${usersSnapshot.size} total users.`);

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    console.log(`\n===========================================`);
    console.log(`👤 User: ${uid}`);

    // Get playlists
    const playlistsSnapshot = await db.collection(`users/${uid}/playlists`).get();
    console.log(`  Playlists configured: ${playlistsSnapshot.size}`);

    for (const pDoc of playlistsSnapshot.docs) {
      const p = pDoc.data() as PlaylistConfig;
      console.log(`\n  🎵 Playlist: ${p.name} (${p.id})`);
      console.log(`     Target Tracks: ${p.settings?.targetTotalTracks}`);
      console.log(
        `     AI Gen Enabled: ${p.aiGeneration?.enabled}, Target AI additions: ${p.aiGeneration?.tracksToAdd}`
      );
      console.log(`     Mandatory Tracks Count: ${p.mandatoryTracks?.length || 0}`);

      if (p.mandatoryTracks?.length) {
        console.log(`     VIPs:`);
        p.mandatoryTracks.forEach((vip: MandatoryTrack, i: number) => {
          console.log(
            `       [${i}] ${vip.name} (Range: min ${vip.positionRange?.min}, max ${vip.positionRange?.max})`
          );
        });
      }

      // Latest activity for this playlist
      const activitiesSnapshot = await db
        .collection(`users/${uid}/activities`)
        .where('metadata.playlistId', '==', p.id)
        .get();

      let latestActivityDoc = null;
      if (!activitiesSnapshot.empty) {
        const sortedDocs = activitiesSnapshot.docs.sort((a, b) => {
          const tsA = a.data().timestamp?.toMillis() || 0;
          const tsB = b.data().timestamp?.toMillis() || 0;
          return tsB - tsA;
        });
        latestActivityDoc = sortedDocs[0];
      }

      if (latestActivityDoc) {
        const actDoc = latestActivityDoc;
        const act = actDoc.data();
        const meta = act.metadata || {};
        const diff = meta.diff || {};
        console.log(`\n     ⏳ Latest Activity: ${meta.state} at ${act.timestamp?.toDate()}`);
        console.log(`        Final Count: ${meta.finalCount}`);
        console.log(
          `        Added: ${meta.addedCount}, Removed: ${meta.removedCount}, AI Tracks Added: ${meta.aiTracksAdded}`
        );

        if (diff.stats) {
          console.log(
            `        Diff Stats: Predicted ${diff.stats.final}, Target ${diff.stats.target}, Success: ${diff.stats.success}`
          );
        }
      } else {
        console.log(`\n     ⏳ Latest Activity: None found`);
      }
    }
  }
}

analyzeCurationOptions()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
