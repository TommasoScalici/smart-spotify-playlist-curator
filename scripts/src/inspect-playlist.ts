import * as dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const rootDir = resolve(__dirname, '../../');
dotenv.config({ path: resolve(rootDir, '.env') });

process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(rootDir, 'service-account.json');

const { SpotifyService } = require('../../functions/src/services/spotify-service.ts');

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const uid = 'DfUE3j76NRQFkMI8c1FZdBRxDKf2';
  const targetPlaylistId = '0yF9pJ62XkAgxDGMlbyenf';

  console.log(`🔍 FINAL INSPECTION for Playlist: ${targetPlaylistId}`);

  try {
    const secretSnap = await db.doc(`users/${uid}/secrets/spotify`).get();
    const refreshToken = secretSnap.data()!.refreshToken;
    const spotifyService = new SpotifyService(refreshToken);

    const tracks = await spotifyService.getPlaylistTracks(targetPlaylistId);
    console.log(`Total tracks fetched: ${tracks.length}`);

    const seenUris = new Map<
      string,
      { album: string; artist: string; idx: number; name: string; uri: string }
    >();
    const seenSignatures = new Map<
      string,
      { album: string; artist: string; idx: number; name: string; uri: string }
    >();

    // Reproduce the exact logic in Orchestrator.ts
    for (let i = 0; i < tracks.length; i++) {
      const item = tracks[i];
      const normalizedName = item.name.trim().toLowerCase();
      const normalizedArtist = item.artist.trim().toLowerCase();
      const normalizedAlbum = item.album.trim().toLowerCase();
      const signature = `${normalizedName}:${normalizedArtist}:${normalizedAlbum}`;

      if (seenUris.has(item.uri)) {
        const prev = seenUris.get(item.uri)!;
        console.log(`[DUPE BY URI] #${i} "${item.name}" [${item.uri}] matches #${prev.idx}`);
      } else if (seenSignatures.has(signature)) {
        const prev = seenSignatures.get(signature)!;
        console.log(
          `[DUPE BY SIG] #${i} "${item.name}" - ${item.artist} (${item.album}) [${item.uri}] matches #${prev.idx} [${prev.uri}]`
        );
      } else {
        seenUris.set(item.uri, { idx: i, ...item });
        seenSignatures.set(signature, { idx: i, ...item, uri: item.uri });
      }
    }
  } catch (error) {
    console.error('FAILED:', error);
  }
}

main();
