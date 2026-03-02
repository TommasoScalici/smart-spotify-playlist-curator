import { ActivityLog, TrackDiff } from '@smart-spotify-curator/shared';
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both root and functions
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../functions/.env') });

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../../../service-account.json');
if (!getApps().length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    initializeApp();
  }
}

const db = getFirestore();

/**
 * Fetches the most recent log for a specific playlist ID and user.
 */
async function getLatestLogForPlaylist(uid: string, playlistId: string) {
  console.log(`Searching for logs for playlist: ${playlistId} and user: ${uid}`);

  // Normalize playlist ID (it might be a URI or just the ID)
  const normalizedId = playlistId.includes('spotify:playlist:')
    ? playlistId
    : `spotify:playlist:${playlistId}`;

  console.log(`Normalized Playlist ID: ${normalizedId}`);

  try {
    const logsSnapshot = await db
      .collection(`users/${uid}/logs`)
      .orderBy('timestamp', 'desc')
      .get();

    if (logsSnapshot.empty) {
      console.log('No logs found for this user.');
      return null;
    }

    // Filter in memory to avoid index requirements for complex where/orderBy combos
    const match = logsSnapshot.docs.find((doc) => {
      const data = doc.data();
      return data.metadata?.playlistId === normalizedId;
    });

    if (!match) {
      console.log('No logs found matching this playlist ID.');
      return null;
    }

    return { id: match.id, ...match.data() };
  } catch (error) {
    console.error('Error fetching logs:', error);
    return null;
  }
}

async function main() {
  const uid = process.argv[2] || 'DfUE3j76NRQFkMI8c1FZdBRxDKf2';
  const playlistId = process.argv[3] || '32xYNI24QWMWfSgG1xZgjI';

  const latestLog = (await getLatestLogForPlaylist(uid, playlistId)) as ActivityLog | null;

  if (!latestLog) {
    process.exit(1);
  }

  console.log('\n--- LATEST CURATION LOG ---');
  console.log(`Log ID: ${latestLog.id}`);
  console.log(`Timestamp: ${latestLog.timestamp}`);
  console.log(`Type: ${latestLog.type}`);
  console.log(`Step: ${latestLog.metadata.step}`);

  const meta = latestLog.metadata;
  console.log(`State: ${meta.state}`);
  console.log(`Playlist: ${meta.playlistName}`);

  if (meta.diff) {
    const diff = meta.diff;
    console.log('\n--- CURATION DIFF STATS ---');
    console.log(`Added: ${diff.added?.length || 0}`);
    console.log(`Removed: ${diff.removed?.length || 0}`);
    console.log(`Final Count: ${diff.stats?.final || meta.finalCount || 'Unknown'}`);
    console.log(`Target Count: ${diff.stats?.target || 'Unknown'}`);

    if (diff.added && diff.added.length > 0) {
      console.log('\n--- TRACKS ADDED ---');
      diff.added.slice(0, 10).forEach((t: TrackDiff) => {
        console.log(` - [${t.reason}] ${t.artist} - ${t.name}`);
      });
      if (diff.added.length > 10) console.log(` ... and ${diff.added.length - 10} more`);
    }

    if (diff.removed && diff.removed.length > 0) {
      console.log('\n--- TRACKS REMOVED ---');
      diff.removed.slice(0, 10).forEach((t: TrackDiff) => {
        console.log(` - [${t.reason}] ${t.artist} - ${t.name}`);
      });
      if (diff.removed.length > 10) console.log(` ... and ${diff.removed.length - 10} more`);
    }

    // Export this log to a temporary file for comparison tools if needed
    fs.writeFileSync('last_curation_log_data.json', JSON.stringify(latestLog, null, 2));
    console.log('\nFull log details exported to: last_curation_log_data.json');
  } else {
    console.log('\nNo detailed diff found in this log entry.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
