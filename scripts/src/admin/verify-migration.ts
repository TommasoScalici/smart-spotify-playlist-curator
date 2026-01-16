import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function verifyMigration(uid: string) {
  console.log(`🔍 Verifying playlists for user: ${uid}`);

  // Check Source
  const globalRef = db.collection('playlists');
  const globalSnap = await globalRef.get();
  console.log(`ℹ️  Global 'playlists' count: ${globalSnap.size}`);

  const userPlaylistsRef = db.collection('users').doc(uid).collection('playlists');
  const snapshot = await userPlaylistsRef.get();

  if (snapshot.empty) {
    console.error('❌ No playlists found for this user.');
  } else {
    console.log(`✅ Found ${snapshot.size} playlists for user.`);
    snapshot.docs.forEach((doc) => {
      console.log(`   - [${doc.id}] ${doc.data().name} (Owner: ${doc.data().ownerId})`);
    });
  }
}

const uid = process.argv[2];
if (uid) {
  verifyMigration(uid).catch(console.error);
} else {
  console.error('Please provide UID');
}
