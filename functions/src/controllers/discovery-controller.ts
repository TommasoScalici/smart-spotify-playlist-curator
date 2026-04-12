import * as logger from 'firebase-functions/logger';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { DiscoveryUseCase } from '../core/discovery-usecase.js';

const AiConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional()
});

const SuggestReferenceArtistsSchema = z.object({
  aiConfig: AiConfigSchema.optional(),
  count: z.number().optional(),
  description: z.string().optional(),
  excludedArtists: z.array(z.string()).optional(),
  playlistName: z.string().min(1)
});

type SuggestReferenceArtistsRequest = z.infer<typeof SuggestReferenceArtistsSchema>;

export async function suggestReferenceArtistsHandler(
  request: CallableRequest<SuggestReferenceArtistsRequest>
) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const parseResult = SuggestReferenceArtistsSchema.safeParse(request.data);
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
