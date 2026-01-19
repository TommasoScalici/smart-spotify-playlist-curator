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
      const { refreshToken, accessToken } = await spotifyService.exchangeCode(
        input.code,
        input.redirectUri
      );

      // 4. Securely Store Tokens & Cache Access Token
      await db
        .collection('users')
        .doc(uid)
        .collection('secrets')
        .doc('spotify')
        .set({
          refreshToken,
          accessToken,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        });

      // 5. Fetch & Store Public Profile Info (for UI Badge)
      // Use the *new* tokens to fetch user profile immediately, avoiding redundant refresh
      const userClient = SpotifyService.createForUser(refreshToken, accessToken);
      const me = await userClient.getMe();

      const spotifyProfile = {
        id: me.id,
        displayName: me.display_name,
        email: me.email,
        avatarUrl: me.images?.[0]?.url ?? null,
        product: me.product,
        linkedAt: new Date(),
        status: 'active'
      };

      await db.collection('users').doc(uid).set(
        {
          spotifyProfile
        },
        { merge: true }
      );

      // 6. Return Success with Profile for Cache Seeding
      return { success: true, profile: spotifyProfile };
    } catch (error) {
      logger.error('Error linking Spotify account:', error);
      // Even if it failed, we might have successfully saved the refreshToken in Step 4.
      // We throw to let the UI know about the complication, but the account might be "partially" linked.
      throw new functions.https.HttpsError('internal', 'Failed to link Spotify account fully.');
    }
  }
);
