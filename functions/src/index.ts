import * as dotenv from 'dotenv';
import { setGlobalOptions } from 'firebase-functions/v2';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from root .env ONLY for local development
// In Cloud Functions, credentials are automatically provided
const isLocalDevelopment = !process.env.FUNCTION_TARGET && !process.env.K_SERVICE;
if (isLocalDevelopment) {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { onCall } from 'firebase-functions/v2/https';

// --- Functions Definitions with Lazy Loading ---

// 1. Auth Functions
export const exchangeSpotifyToken = onCall(
  {
    cors: true,
    invoker: 'public',
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']
  },
  async (request) => {
    const { exchangeSpotifyTokenHandler } = await import('./controllers/auth-controller.js');
    return exchangeSpotifyTokenHandler(request);
  }
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
  async (request) => {
    const { triggerCurationHandler } = await import('./controllers/curation-controller.js');
    return triggerCurationHandler(request);
  }
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
  async (request) => {
    const { estimateCurationHandler } = await import('./controllers/curation-controller.js');
    return estimateCurationHandler(request);
  }
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
  async (request) => {
    const { suggestReferenceArtistsHandler } =
      await import('./controllers/discovery-controller.js');
    return suggestReferenceArtistsHandler(request);
  }
);

// 4. Playlist Functions
export const getPlaylistMetrics = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']
  },
  async (request) => {
    const { getPlaylistMetricsHandler } = await import('./controllers/playlist-controller.js');
    return getPlaylistMetricsHandler(request);
  }
);

// 5. Spotify Functions
export const searchSpotify = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    timeoutSeconds: 30
  },
  async (request) => {
    const { searchSpotifyHandler } = await import('./controllers/spotify-controller.js');
    return searchSpotifyHandler(request);
  }
);

export const getTrackDetails = onCall(
  {
    cors: true,
    maxInstances: 10,
    secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    timeoutSeconds: 30
  },
  async (request) => {
    const { getTrackDetailsHandler } = await import('./controllers/spotify-controller.js');
    return getTrackDetailsHandler(request);
  }
);
