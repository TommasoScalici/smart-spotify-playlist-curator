import * as dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../functions/.env') });

// Initialize Admin SDK
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Duplicate Schema for verification (or import if we can solve the cross-project import cleanly)
// To avoid compilation mess with "src/functions" imports in "src/scripts", I'll replicate the basic check or just ensure it exists.
// Actually, let's verify roughly that it has the right fields.

async function verifyConfig() {
  console.log('🔍 Verifying Firestore Configs...');

  const snapshot = await db.collection('playlists').get();

  if (snapshot.empty) {
    console.error('❌ No playlists found in Firestore!');
    process.exit(1);
  }

  console.log(`Found ${snapshot.size} documents.`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`\n📄 [${doc.id}] ${data.name}`);
    console.log(`   - Enabled: ${data.enabled}`);
    console.log(`   - ID: ${data.id}`);
    console.log(`   - Model: ${data.aiGeneration?.model}`);

    if (!data.id || !data.name || typeof data.enabled !== 'boolean') {
      console.error('   ❌ INVALID SCHEMA DETECTED');
    } else {
      console.log('   ✅ Structural check passed');
    }
  }
}

verifyConfig().catch(console.error);
