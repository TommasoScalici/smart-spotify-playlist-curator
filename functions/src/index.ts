import * as dotenv from 'dotenv';
import { setGlobalOptions } from 'firebase-functions/v2';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';

// Load environment variables from root .env ONLY for local development.
// In Cloud Functions, credentials are automatically provided.
// We avoid `dotenv.config()` because v17+ logs tips to stdout which corrupts
// Firebase CLI's local discovery JSON parsing, causing a 10s timeout.
const isLocalDevelopment = !process.env.FUNCTION_TARGET && !process.env.K_SERVICE;
if (isLocalDevelopment) {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    const parsedEnv = dotenv.parse(readFileSync(envPath, 'utf-8'));
    for (const [key, value] of Object.entries(parsedEnv)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    // FIX: If GOOGLE_APPLICATION_CREDENTIALS is a relative path (e.g. ./service-account.json),
    // make it absolute relative to the workspace root to prevent firebase-admin
    // from silently failing to find it and falling back to the metadata server,
    // which causes a 10s timeout during deployment local analysis.
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (creds && !isAbsolute(creds)) {
      const absoluteCreds = resolve(__dirname, '../../', creds);
      if (existsSync(absoluteCreds)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = absoluteCreds;
      }
    }
  }
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { onCall } from 'firebase-functions/v2/https';

import { exchangeSpotifyTokenHandler } from './controllers/auth-controller';
import { estimateCurationHandler, triggerCurationHandler } from './controllers/curation-controller';
import { suggestReferenceArtistsHandler } from './controllers/discovery-controller';
import { getPlaylistMetricsHandler } from './controllers/playlist-controller';
import { getTrackDetailsHandler, searchSpotifyHandler } from './controllers/spotify-controller';

// --- Functions Definitions ---

// 1. Auth Functions
export const exchangeSpotifyToken = onCall(
  {
    cors: true,
    invoker: 'public',
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']
  },
  (request) => exchangeSpotifyTokenHandler(request)
);

// 2. Curation Functions
export const triggerCuration = onCall(
  {
    cors: true,
    memory: '512MiB',
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ],
    timeoutSeconds: 540
  },
  (request) => triggerCurationHandler(request)
);

export const estimateCuration = onCall(
  {
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ],
    timeoutSeconds: 120
  },
  (request) => estimateCurationHandler(request)
);

// 3. Discovery Functions
export const suggestReferenceArtists = onCall(
  {
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ],
    timeoutSeconds: 60
  },
  (request) => suggestReferenceArtistsHandler(request)
);

// 4. Playlist Functions
export const getPlaylistMetrics = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']
  },
  (request) => getPlaylistMetricsHandler(request)
);

// 5. Spotify Functions
export const searchSpotify = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    timeoutSeconds: 30
  },
  (request) => searchSpotifyHandler(request)
);

export const getTrackDetails = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    timeoutSeconds: 30
  },
  (request) => getTrackDetailsHandler(request)
);
