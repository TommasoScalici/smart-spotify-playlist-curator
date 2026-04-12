import { SearchResult } from '@smart-spotify-curator/shared';

import { getAuthorizedSpotifyService, persistSpotifyTokens } from './auth-service.js';

export class SpotifyUseCase {
  public async getTrackDetails(uid: string, trackUri: string) {
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);
    const trackData = await spotifyService.getTrackMetadata(trackUri);
    await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);
    return trackData;
  }

  public async search(uid: string, params: { limit?: number; query: string; type: string[] }) {
    const { limit, query, type: searchTypes } = params;
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    let results: SearchResult[];
    if (searchTypes.includes('playlist')) {
      results = (await spotifyService.searchUserPlaylists(query, limit || 20)) as SearchResult[];
    } else {
      results = (await spotifyService.search(
        query,
        searchTypes as ('artist' | 'track')[],
        limit || 20
      )) as SearchResult[];
    }

    await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);
    return { results };
  }
}
