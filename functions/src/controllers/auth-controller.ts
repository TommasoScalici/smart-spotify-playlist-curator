import { logger } from 'firebase-functions/v2';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { AuthUseCase } from '../core/auth-usecase.js';

// Schema for input validation
const ExchangeTokenSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url()
});

type ExchangeTokenRequest = z.infer<typeof ExchangeTokenSchema>;

/**
 * Cloud Function Handler to exchange an OAuth2 Authorization Code for Spotify Tokens.
 * Safely handles secret storage and profile syncing.
 */
export async function exchangeSpotifyTokenHandler(request: CallableRequest<ExchangeTokenRequest>) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const uid = request.auth.uid;
  const input = request.data;

  let validatedData: z.infer<typeof ExchangeTokenSchema>;
  try {
    validatedData = ExchangeTokenSchema.parse(input);
  } catch (error) {
    logger.warn('Invalid input for exchangeSpotifyToken', error);
    throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
  }

  try {
    const useCase = new AuthUseCase();
    return await useCase.exchangeAndLink(uid, validatedData.code, validatedData.redirectUri);
  } catch (error) {
    logger.error('Error linking Spotify account:', error);
    throw new HttpsError('internal', 'Failed to link Spotify account.');
  }
}
