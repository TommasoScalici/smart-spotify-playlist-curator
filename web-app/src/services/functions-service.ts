import { httpsCallable } from 'firebase/functions';

import {
  CurationEstimate,
  CurationEstimateSchema,
  OrchestrationResult,
  OrchestrationResultSchema,
  SearchResult,
  SpotifyProfile
} from '@smart-spotify-curator/shared';

import { functions } from './firebase';

export const FunctionsService = {
  /**
   * Triggers the curation orchestration manually.
   * @param playlistId - Optional specific playlist ID to curate
   * @param options - Optional configuration including dryRun flag
   * @returns Curation result with message and results array
   */
  async triggerCuration(
    playlistId?: string,
    options?: { dryRun?: boolean }
  ): Promise<OrchestrationResult> {
    const trigger = httpsCallable<{ playlistId?: string; dryRun?: boolean }, unknown>(
      functions,
      'triggerCuration'
    );
    const result = await trigger({ playlistId, dryRun: options?.dryRun });

    // Validate response using Zod schema
    const validated = OrchestrationResultSchema.parse(result.data);
    return validated;
  },

  /**
   * Search Spotify for tracks or playlists via Cloud Function Proxy.
   * @param query - Search query string
   * @param type - Type of search ('track' or 'playlist')
   * @returns Array of search results
   */
  async searchSpotify(query: string, type: 'track' | 'playlist'): Promise<SearchResult[]> {
    const search = httpsCallable<
      { query: string; type: string; limit: number },
      { results: SearchResult[] }
    >(functions, 'searchSpotify');
    const result = await search({ query, type, limit: 10 });
    return result.data.results;
  },

  /**
   * Links a Spotify Account by exchanging the Auth Code.
   * @param code - Authorization code from Spotify OAuth flow
   * @param redirectUri - Redirect URI used in OAuth flow
   * @returns Object with success status and optional profile data
   */
  async linkSpotifyAccount(
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; profile?: SpotifyProfile }> {
    const exchange = httpsCallable<
      { code: string; redirectUri: string },
      { success: boolean; profile?: SpotifyProfile }
    >(functions, 'exchangeSpotifyToken');
    const result = await exchange({ code, redirectUri });
    const profile = result.data.profile;
    if (profile && typeof profile.linkedAt === 'string') {
      profile.linkedAt = new Date(profile.linkedAt);
    }
    return { success: result.data.success, profile };
  },

  /**
   * Fetches real-time metrics for a playlist from Spotify API.
   * @param playlistId - The Spotify playlist ID
   * @returns Playlist metrics including followers, tracks, and last updated timestamp
   */
  async getPlaylistMetrics(playlistId: string): Promise<{
    followers: number;
    tracks: number;
    lastUpdated: string;
    imageUrl?: string | null;
    owner?: string;
    description?: string;
  }> {
    const getMetrics = httpsCallable<
      { playlistId: string },
      {
        followers: number;
        tracks: number;
        lastUpdated: string;
        imageUrl?: string | null;
        owner?: string;
        description?: string;
      }
    >(functions, 'getPlaylistMetrics');
    const result = await getMetrics({ playlistId });
    return result.data;
  },

  /**
   * Fetches complete track metadata by URI including album art.
   * @param trackUri - The Spotify track URI (e.g., spotify:track:...)
   * @returns Track metadata with name, artist, and imageUrl
   */
  async getTrackDetails(trackUri: string): Promise<{
    uri: string;
    name: string;
    artist: string;
    imageUrl?: string;
  }> {
    const getDetails = httpsCallable<
      { trackUri: string },
      {
        uri: string;
        name: string;
        artist: string;
        imageUrl?: string;
      }
    >(functions, 'getTrackDetails');
    const result = await getDetails({ trackUri });
    return result.data;
  },

  /**
   * Estimates the result of a curation run without making changes.
   * Used for the pre-flight confirmation modal.
   * @param playlistId - The playlist config ID to estimate curation for
   * @returns CurationEstimate with projected changes
   */
  async estimateCuration(playlistId: string): Promise<CurationEstimate> {
    const estimate = httpsCallable<{ playlistId: string }, unknown>(functions, 'estimateCuration');
    const result = await estimate({ playlistId });
    return CurationEstimateSchema.parse(result.data);
  }
};
