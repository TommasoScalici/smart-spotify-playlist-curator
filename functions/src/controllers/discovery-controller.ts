import {
  SuggestReferenceArtistsRequest,
  SuggestReferenceArtistsRequestSchema
} from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

import { DiscoveryUseCase } from '../core/discovery-usecase.js';

export async function suggestReferenceArtistsHandler(
  request: CallableRequest<SuggestReferenceArtistsRequest>
) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = SuggestReferenceArtistsRequestSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Playlist name is required.');
  }

  const uid = request.auth.uid;

  try {
    const useCase = new DiscoveryUseCase();
    return await useCase.suggestArtists(uid, parseResult.data);
  } catch (error) {
    logger.error('suggestReferenceArtists failed', error);
    throw new HttpsError('internal', (error as Error).message);
  }
}
