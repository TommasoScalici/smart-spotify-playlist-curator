import { SearchResult, SearchTypeSchema } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';

const SearchSpotifySchema = z.object({
  limit: z.number().optional(),
  query: z.string().min(1),
  type: z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(SearchTypeSchema))
});

const GetTrackDetailsSchema = z.object({
  trackUri: z.string().startsWith('spotify:track:')
});

type GetTrackDetailsRequest = z.infer<typeof GetTrackDetailsSchema>;
type SearchSpotifyRequest = z.infer<typeof SearchSpotifySchema>;

export async function getTrackDetailsHandler(request: CallableRequest<GetTrackDetailsRequest>) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = GetTrackDetailsSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid track URI.');
  }

  const uid = request.auth.uid;
  const { trackUri } = parseResult.data;

  try {
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    const trackData = await spotifyService.getTrackMetadata(trackUri);

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

export async function searchSpotifyHandler(request: CallableRequest<SearchSpotifyRequest>) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = SearchSpotifySchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
  }

  const { limit, query, type: searchTypes } = parseResult.data;
  const uid = request.auth.uid;

  try {
    const { originalRefreshToken, service: spotifyService } =
      await getAuthorizedSpotifyService(uid);

    let results: SearchResult[];

    if (searchTypes.includes('playlist')) {
      results = (await spotifyService.searchUserPlaylists(query, limit || 20)) as SearchResult[];
    } else {
      results = (await spotifyService.search(query, searchTypes, limit || 20)) as SearchResult[];
    }

    await persistSpotifyTokens(uid, spotifyService, originalRefreshToken);

    return { results };
  } catch (e) {
    logger.error('Search failed', e);
    throw new HttpsError('internal', (e as Error).message);
  }
}
