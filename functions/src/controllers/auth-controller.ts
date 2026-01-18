import * as functions from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { SpotifyService } from '../services/spotify-service';
import { z } from 'zod';

// Schema for input validation
const ExchangeTokenSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url()
});

export const exchangeSpotifyToken = functions.https.onCall(
  {
    cors: true,
    invoker: 'public',
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
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
      const spotifyService = SpotifyService.getInstance();
      const { refreshToken } = await spotifyService.exchangeCode(input.code, input.redirectUri);

      // 4. Securely Store Refresh Token
      await db.collection('users').doc(uid).collection('secrets').doc('spotify').set({
        refreshToken,
        updatedAt: new Date().toISOString() // Fixed: Using proper method call
      });

      // 5. Fetch & Store Public Profile Info (for UI Badge)
      // Use the *new* tokens to fetch user profile immediately
      const userClient = SpotifyService.createForUser(refreshToken);
      const me = await userClient.getMe(); // We need to check if this exists in SpotifyService

      await db
        .collection('users')
        .doc(uid)
        .set(
          {
            spotifyProfile: {
              id: me.id,
              displayName: me.display_name,
              email: me.email,
              avatarUrl: me.images?.[0]?.url ?? null,
              product: me.product, // 'premium' or 'free' - useful for debugging
              linkedAt: new Date().toISOString()
            }
          },
          { merge: true }
        );

      // 6. Return Success
      return { success: true };
    } catch (error) {
      logger.error('Error linking Spotify account:', error);
      throw new functions.https.HttpsError('internal', 'Failed to link Spotify account.');
    }
  }
);
