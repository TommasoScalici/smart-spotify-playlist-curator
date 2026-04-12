import { SearchResult } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { ServiceFactory } from '../admin/factory.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from './auth-service.js';

export interface SuggestArtistsParams {
  aiConfig?: {
    model?: string;
    temperature?: number;
  };
  count?: number;
  description?: string;
  excludedArtists?: string[];
  playlistName: string;
}

export class DiscoveryUseCase {
  public async suggestArtists(uid: string, params: SuggestArtistsParams) {
    const { aiConfig, count, description, excludedArtists, playlistName } = params;

    const aiService = ServiceFactory.getAiService();

    const finalAiConfig = {
      enabled: true,
      model: aiConfig?.model || 'gemini-2.5-flash',
      temperature: aiConfig?.temperature || 0.7,
      tracksToAdd: 0
    };

    const artistNames = await aiService.suggestArtists(
      finalAiConfig,
      playlistName,
      description,
      count || 5,
      excludedArtists || []
    );

    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

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

    const validArtists = searchResults.filter((r): r is SearchResult => r !== null);
    const uniqueArtistsMap = new Map<string, SearchResult>();
    for (const artist of validArtists) {
      if (!uniqueArtistsMap.has(artist.uri)) {
        uniqueArtistsMap.set(artist.uri, artist);
      }
    }

    return {
      artists: Array.from(uniqueArtistsMap.values())
    };
  }
}
