import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { AiService } from '../services/ai-service.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';

export const suggestReferenceArtists = onCall(
  {
    timeoutSeconds: 60,
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
    const { playlistName, description, count, aiConfig } = request.data;

    if (!playlistName) {
      throw new HttpsError('invalid-argument', 'Playlist name is required.');
    }

    try {
      const aiService = new AiService();

      // Default AI Config if not provided
      const finalAiConfig = aiConfig || {
        model: 'gemini-1.5-flash-latest',
        temperature: 0.7
      };

      // 1. Get artist name suggestions from AI
      const artistNames = await aiService.suggestArtists(
        finalAiConfig,
        playlistName,
        description,
        count || 5
      );

      logger.info('AI suggested artists', { artistNames });

      // 2. Authorize Spotify
      const { service: spotifyService, originalRefreshToken } =
        await getAuthorizedSpotifyService(uid);

      // 3. Search and validate each artist on Spotify
      const searchResults = await Promise.all(
        artistNames.map(async (name) => {
          try {
            const results = await spotifyService.search(name, ['artist'], 1);
            return results.length > 0 ? results[0] : null;
          } catch (err) {
            logger.warn(`Search failed for suggested artist: ${name}`, err);
            return null;
          }
        })
      );

      await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

      const validatedArtists = searchResults.filter(Boolean);

      return {
        artists: validatedArtists
      };
    } catch (error) {
      logger.error('suggestReferenceArtists failed', error);
      throw new HttpsError('internal', (error as Error).message);
    }
  }
);
