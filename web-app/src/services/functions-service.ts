import {
  AiGenerationConfig,
  CurationEstimate,
  CurationEstimateSchema,
  ExchangeSpotifyTokenResponse,
  ExchangeSpotifyTokenResponseSchema,
  OrchestrationResult,
  OrchestrationResultSchema,
  PlaylistMetrics,
  PlaylistMetricsSchema,
  SearchResult,
  SearchSpotifyResponseSchema,
  SuggestReferenceArtistsResponseSchema,
  TrackInfo,
  TrackInfoSchema
} from '@smart-spotify-curator/shared';
import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

export const FunctionsService = {
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
  },

  /**
   * Fetches real-time metrics for a playlist from Spotify API.
   * @param playlistId - The Spotify playlist ID
   * @returns Playlist metrics including followers, tracks, and last updated timestamp
   */
  async getPlaylistMetrics(playlistId: string): Promise<PlaylistMetrics> {
    const getMetrics = httpsCallable<{ playlistId: string }, unknown>(
      functions,
      'getPlaylistMetrics'
    );
    const result = await getMetrics({ playlistId });
    return PlaylistMetricsSchema.parse(result.data);
  },

  /**
   * Fetches complete track metadata by URI including album art.
   * @param trackUri - The Spotify track URI (e.g., spotify:track:...)
   * @returns Track metadata with name, artist, and imageUrl
   */
  async getTrackDetails(trackUri: string): Promise<TrackInfo> {
    const getDetails = httpsCallable<{ trackUri: string }, unknown>(functions, 'getTrackDetails');
    const result = await getDetails({ trackUri });
    return TrackInfoSchema.parse(result.data);
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
  ): Promise<ExchangeSpotifyTokenResponse> {
    const exchange = httpsCallable<{ code: string; redirectUri: string }, unknown>(
      functions,
      'exchangeSpotifyToken'
    );
    const result = await exchange({ code, redirectUri });
    return ExchangeSpotifyTokenResponseSchema.parse(result.data);
  },

  /**
   * Search Spotify for tracks or playlists via Cloud Function Proxy.
   * @param query - Search query string
   * @param type - Type of search ('track' or 'playlist')
   * @returns Array of search results
   */
  async searchSpotify(
    query: string,
    type: 'artist' | 'playlist' | 'track'
  ): Promise<SearchResult[]> {
    const search = httpsCallable<{ limit: number; query: string; type: string }, unknown>(
      functions,
      'searchSpotify'
    );
    const result = await search({ limit: 10, query, type });
    const parsed = SearchSpotifyResponseSchema.parse(result.data);
    return parsed.results;
  },

  /**
   * Suggests reference artists based on playlist metadata via AI.
   */
  async suggestReferenceArtists(
    playlistName: string,
    description?: string,
    count: number = 5,
    aiConfig?: AiGenerationConfig,
    excludedArtists?: string[]
  ): Promise<SearchResult[]> {
    const suggest = httpsCallable<
      {
        aiConfig?: AiGenerationConfig;
        count: number;
        description?: string;
        excludedArtists?: string[];
        playlistName: string;
      },
      unknown
    >(functions, 'suggestReferenceArtists');
    const result = await suggest({ aiConfig, count, description, excludedArtists, playlistName });
    const parsed = SuggestReferenceArtistsResponseSchema.parse(result.data);
    return parsed.artists;
  },

  /**
   * Triggers the curation orchestration manually.
   * @param playlistId - Specific playlist ID to curate (required)
   * @param options - Optional configuration including planId from estimation
   * @returns Curation result with message and results array
   */
  async triggerCuration(
    playlistId: string,
    options?: { excludedAiTrackUris?: string[]; planId?: string }
  ): Promise<OrchestrationResult> {
    const trigger = httpsCallable<
      { excludedAiTrackUris?: string[]; planId?: string; playlistId?: string },
      unknown
    >(functions, 'triggerCuration');
    const result = await trigger({
      excludedAiTrackUris: options?.excludedAiTrackUris,
      planId: options?.planId,
      playlistId
    });

    // Validate response using Zod schema
    const validated = OrchestrationResultSchema.parse(result.data);

    // Check if any playlist curation actually failed
    const failedResult = validated.results.find((r) => r.status === 'error');
    if (failedResult) {
      throw new Error(failedResult.error ?? `Curation failed for "${failedResult.name}"`);
    }

    return validated;
  }
};
