import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';
import type { SearchResult } from '../services/spotify-service.js';

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
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { query, type, limit } = request.data;
    if (!query || !type) {
      throw new HttpsError('invalid-argument', 'Missing query or type.');
    }

    // Validate type
    const validTypes = ['track', 'playlist', 'artist'];
    let searchTypes: ('track' | 'playlist' | 'artist')[] = [];
    if (Array.isArray(type)) {
      searchTypes = type;
    } else {
      if (validTypes.includes(type)) {
        searchTypes = [type];
      } else {
        throw new HttpsError('invalid-argument', 'Invalid type.');
      }
    }

    try {
      // Create user-specific service using the robust helper
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      let results: SearchResult[];

      if (searchTypes.includes('playlist')) {
        // Optimized Service-level search (Parallel fetching + Owned filter)
        results = (await spotifyService.searchUserPlaylists(query, limit || 20)) as SearchResult[];
      } else {
        // For tracks/artists, global search is appropriate
        results = (await spotifyService.search(query, searchTypes, limit || 20)) as SearchResult[];
      }

      // Persist any token updates (Important for rotation)
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      return { results };
    } catch (e) {
      logger.error('Search failed', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);

export const getTrackDetails = onCall(
  {
    timeoutSeconds: 30,
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { trackUri } = request.data;

    if (!trackUri || !trackUri.startsWith('spotify:track:')) {
      throw new HttpsError('invalid-argument', 'Invalid track URI.');
    }

    try {
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      // Use getTrackMetadata to fetch complete track details including album art
      const trackData = await spotifyService.getTrackMetadata(trackUri);

      // Persist any token updates
      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      if (!trackData) {
        throw new HttpsError('not-found', 'Track not found.');
      }

      return trackData;
    } catch (e) {
      logger.error('Failed to fetch track details', e);
      throw new HttpsError('internal', (e as Error).message);
    }
  }
);
