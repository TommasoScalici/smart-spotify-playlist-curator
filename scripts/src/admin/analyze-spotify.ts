import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Admin
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

// We can just use node-fetch to make calls to Spotify directly if we get the token
// from Firestore users/{uid}/tokens OR users/{uid}/spotifyProfile
const db = getFirestore();

interface SpotifyTrack {
  artists: { name: string }[];
  name: string;
  uri: string;
}

async function fetchSpotifyPlaylist(token: string, playlistId: string): Promise<SpotifyTrack[]> {
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  const tracks: SpotifyTrack[] = [];

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist tracks: ${await response.text()}`);
    }
    const data = await response.json();
    const items = data.items || [];
    tracks.push(...items.map((i: { track: SpotifyTrack }) => i.track));
    url = data.next;
  }
  return tracks;
}

async function getAccessToken(uid: string) {
  const userDoc = await db.collection(`users/${uid}/secrets`).doc('spotify').get();
  const tokens = userDoc.data();
  if (!tokens || !tokens.refreshToken) {
    throw new Error(`No refresh token for user ${uid}`);
  }

  // Refresh token code
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing from .env');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    }),
    headers: {
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST'
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Failed to refresh token: ${t}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../../../functions/.env') });

  const uid = 'DfUE3j76NRQFkMI8c1FZdBRxDKf2';
  const playlistUri = 'spotify:playlist:32xYNI24QWMWfSgG1xZgjI'; // Instrumental Prog
  const playlistId = playlistUri.split(':')[2];

  console.log(`Getting access token for ${uid}...`);
  const token = await getAccessToken(uid);

  console.log(`Fetching Spotify Playlist: ${playlistId}...`);
  const tracks = await fetchSpotifyPlaylist(token, playlistId);

  console.log(`\nPlaylist has ${tracks.length} tracks.`);

  // Check for adjacencies
  console.log('\n--- Adjacent Tracks by Same Artist ---');
  let adjacencies = 0;
  for (let i = 1; i < tracks.length; i++) {
    const t1 = tracks[i - 1];
    const t2 = tracks[i];
    if (t1 && t2 && t1.artists && t2.artists) {
      const artist1 = t1.artists[0]?.name;
      const artist2 = t2.artists[0]?.name;
      if (artist1 === artist2) {
        console.log(`Adjacency at [${i - 1}] and [${i}]: ${artist1} - ${t1.name} | ${t2.name}`);
        adjacencies++;
      }
    }
  }
  console.log(`Total adjacencies found: ${adjacencies}`);

  // Print all tracks briefly
  console.log('\n--- Full Track List ---\n');
  tracks.forEach((t, i) => {
    const artist = t?.artists?.[0]?.name || 'Unknown';
    console.log(`[${i}] ${artist} - ${t?.name}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
