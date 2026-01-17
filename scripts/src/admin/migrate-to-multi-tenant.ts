import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS automatically
}

const db = getFirestore();

// Schema for minimal validation during migration
const MigrationTargetSchema = z.object({
  targetUserId: z.string().min(1, 'Target User ID is required')
});

async function migratePlaylists() {
  console.log('🚀 Starting Smart Migration: Global -> User-Centric Schema');

  // 1. Get Target User ID from args
  const args = process.argv.slice(2);
  const targetUserId = args[0];

  if (!targetUserId) {
    console.error('❌ Error: Please provide a target User ID.');
    console.error('Usage: npx tsx src/admin/migrate-to-multi-tenant.ts <USER_ID>');
    process.exit(1);
  }

  // Validate Target User ID
  try {
    MigrationTargetSchema.parse({ targetUserId });
  } catch (error) {
    console.error('❌ Invalid User ID:', error);
    process.exit(1);
  }

  console.log(`🎯 Target User: ${targetUserId}`);

  // 2. Fetch all existing global playlists
  try {
    const globalPlaylistsRef = db.collection('playlists');
    const snapshot = await globalPlaylistsRef.get();

    if (snapshot.empty) {
      console.log('ℹ️ No global playlists found to migrate.');
      return;
    }

    console.log(`📦 Found ${snapshot.size} global playlists. Preparing to migrate...`);

    const batch = db.batch();
    let operationCount = 0;
    const userPlaylistsRef = db.collection('users').doc(targetUserId).collection('playlists');

    // 3. Iterate and move
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;

      console.log(`   - Processing: ${data.name || docId}`);

      // Create new document reference in user's subcollection
      const newDocRef = userPlaylistsRef.doc(docId);

      // Add ownerId field
      const newData = {
        ...data,
        ownerId: targetUserId,
        migratedAt: FieldValue.serverTimestamp()
      };

      // Queue Write to New Location
      batch.set(newDocRef, newData);

      // Queue Delete from Old Location (Optional: Keep for safety? Let's delete to be clean)
      // For safety, let's keep it for now but maybe rename or tag it?
      // Actually, "Smart & Efficient" often means cleaning up. Let's delete.
      // user said "smart and efficient". "Move" implies delete source.
      batch.delete(doc.ref);

      operationCount++;
    }

    console.log(`📝 Batch created with ${operationCount} operations. Committing...`);

    // 4. Commit Batch
    try {
      await batch.commit();
      console.log(
        `✅ Successfully migrated ${operationCount} playlists to users/${targetUserId}/playlists.`
      );
    } catch (error) {
      console.error('❌ Migration Failed:', error);
    }
  } catch (error) {
    console.error('❌ Error during fetch/batch prep:', error);
  }
}

migratePlaylists().catch(console.error);
