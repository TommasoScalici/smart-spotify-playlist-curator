import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/https';
import * as logger from 'firebase-functions/logger';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables from root .env for local development
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

import { ConfigService } from './services/config-service';
import { AiService } from './services/ai-service';
import { SpotifyService } from './services/spotify-service';
import { PlaylistOrchestrator } from './core/orchestrator';
import { TrackCleaner } from './core/track-cleaner';
import { SlotManager } from './core/slot-manager';
import { PlaylistConfig } from './types';

import { onCall } from 'firebase-functions/v2/https';

// Shared logic for both onRequest (Cron/HTTP) and onCall (Web App)
async function runOrchestrator(playlistId?: string) {
  const configService = new ConfigService();
  let configs: PlaylistConfig[] = [];

  try {
    if (playlistId) {
      const config = await configService.getPlaylistConfig(playlistId);
      if (!config) {
        logger.warn(`Playlist config not found for ID: ${playlistId}`);
        return { message: 'Playlist not found.', results: [] };
      }
      configs = [config];
    } else {
      configs = await configService.getEnabledPlaylists();
      if (configs.length === 0) {
        logger.info('No enabled playlists found to update.');
        return { message: 'No enabled playlists found.', results: [] };
      }
    }
  } catch (e) {
    logger.error('Failed to load configuration from Firestore', e);
    throw new Error('Configuration Back-end Error: ' + (e as Error).message);
  }

  const spotifyService = SpotifyService.getInstance();
  const aiService = new AiService();
  const trackCleaner = new TrackCleaner();
  const slotManager = new SlotManager();

  const orchestrator = new PlaylistOrchestrator(
    spotifyService,
    aiService,
    trackCleaner,
    slotManager
  );

  const results = [];

  for (const playlistConfig of configs) {
    try {
      await orchestrator.curatePlaylist(playlistConfig);
      results.push({ name: playlistConfig.name, status: 'success' });
    } catch (error) {
      logger.error(`Error processing playlist ${playlistConfig.name}`, error);
      results.push({
        name: playlistConfig.name,
        status: 'error',
        error: (error as Error).message
      });
    }
  }

  return { message: 'Playlist update completed', results };
}

export const updatePlaylists = onRequest(
  {
    timeoutSeconds: 540,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request, response) => {
    logger.info('Received request to update playlists (HTTP).');
    try {
      const result = await runOrchestrator();
      response.json(result);
    } catch (e) {
      response.status(500).send((e as Error).message);
    }
  }
);

export const triggerCuration = onCall(
  {
    timeoutSeconds: 540,
    cors: true, // Explicitly enable CORS
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new // https.HttpsError defined in firebase-functions/v2/https
      Error('The function must be called while authenticated.'); // Simplified error for now, ideally use HttpsError
    }

    const { playlistId } = request.data || {};

    logger.info(`Received triggerCuration from user ${request.auth.uid}`, { playlistId });

    try {
      return await runOrchestrator(playlistId);
    } catch (e) {
      logger.error('Orchestrator execution failed', e);
      // In v2 onCall, throwing an error sends it back to client
      throw new Error((e as Error).message);
    }
  }
);

export const searchSpotify = onCall(
  {
    timeoutSeconds: 30,
    cors: true, // Explicitly enable CORS
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('Authentication required.');
    }

    const { query, type, limit } = request.data;
    if (!query || !type) {
      throw new Error('Missing query or type.');
    }

    // Validate type
    const validTypes = ['track', 'playlist', 'artist'];
    // types defined in SpotifyService.search are array
    // Here we might receive a specific type string from frontend or array?
    // Let's assume frontend sends a single type string for simplicity in the UI component initially (Track Search vs Playlist Search),
    // or array if we want mixed results.
    // Let's support array or single string.

    let searchTypes: ('track' | 'playlist' | 'artist')[] = [];
    if (Array.isArray(type)) {
      searchTypes = type;
    } else {
      if (validTypes.includes(type)) {
        searchTypes = [type];
      } else {
        throw new Error('Invalid type.');
      }
    }

    const spotifyService = SpotifyService.getInstance();
    try {
      const results = await spotifyService.search(query, searchTypes, limit || 20);
      return { results };
    } catch (e) {
      logger.error('Search failed', e);
      throw new Error((e as Error).message);
    }
  }
);
