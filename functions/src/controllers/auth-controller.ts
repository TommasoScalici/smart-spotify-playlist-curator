import * as functions from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { SpotifyService } from '../services/spotify-service';
import { z } from 'zod';

const db = getFirestore();

// Schema for input validation
const ExchangeTokenSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url()
});

export const exchangeSpotifyToken = functions.https.onCall({ cors: true }, async (request) => {
  // 1. Verify User Authentication
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = request.auth.uid;
  const input = request.data;

  // 2. Validate Inputs
  try {
    ExchangeTokenSchema.parse(input);
  } catch (error) {
    logger.warn('Invalid input for exchangeSpotifyToken', error);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid arguments provided.');
  }

  try {
    // 3. Exchange Code for Tokens
    // Note: We need a temporary instance or helper because singleton is configured with ENV vars.
    // However, the node wrapper requires the Redirect URI to match EXACTLY what was sent to authorize.
    // We might need to "set" the redirect URI on the API object temporarily.
    // For now, let's assume the Singleton config is close enough, or we might need to update SpotifyService.
    const spotifyService = SpotifyService.getInstance();

    // WARNING: 'authorizationCodeGrant' verifies 'redirectUri' against what is set in the wrapper.
    // If our wrapper doesn't have the dynamic redirectUri from frontend, this fails.
    // We likely need to pass redirectUri to exchangeCode too?
    // Let's UPDATE SpotifyService.exchangeCode to accept redirectUri.

    // For now, let's assume we update the service or accept the failure.
    // Updated Logic: We should update the Service to allow setting redirectUri dynamically?
    // Or just pass tokens back.

    const { refreshToken } = await spotifyService.exchangeCode(input.code, input.redirectUri);

    // 4. Securely Store Refresh Token
    // path: users/{uid}/secrets/spotify
    await db.collection('users').doc(uid).collection('secrets').doc('spotify').set({
      refreshToken,
      updatedAt: new Date().toISOString()
    });

    // 5. Return Success (do not return refresh token)
    return { success: true };
  } catch (error) {
    logger.error('Error linking Spotify account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to link Spotify account.');
  }
});
