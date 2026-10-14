import {
  GetTrackDetailsRequest,
  GetTrackDetailsRequestSchema,
  SearchSpotifyRequest,
  SearchSpotifyRequestSchema
} from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

import { SpotifyUseCase } from '../core/spotify-usecase.js';

export async function getTrackDetailsHandler(request: CallableRequest<GetTrackDetailsRequest>) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = GetTrackDetailsRequestSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid track URI.');
  }

  const uid = request.auth.uid;

  try {
    const useCase = new SpotifyUseCase();
    const trackData = await useCase.getTrackDetails(uid, parseResult.data.trackUri);

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

  const parseResult = SearchSpotifyRequestSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
  }

  const uid = request.auth.uid;

  try {
    const useCase = new SpotifyUseCase();
    return await useCase.search(uid, parseResult.data);
  } catch (e) {
    logger.error('Search failed', e);
    throw new HttpsError('internal', (e as Error).message);
  }
}
