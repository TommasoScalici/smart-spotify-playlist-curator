import { logger } from 'firebase-functions/v2';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { db } from '../config/firebase.js';
import { SpotifyService } from '../services/spotify-service.js';

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
  // 1. Verify User Authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const uid = request.auth.uid;
  const input = request.data;

  // 2. Validate Inputs
  let validatedData: z.infer<typeof ExchangeTokenSchema>;
  try {
    validatedData = ExchangeTokenSchema.parse(input);
  } catch (error) {
    logger.warn('Invalid input for exchangeSpotifyToken', error);
    throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
  }

  try {
    // 3. Exchange Code for Tokens
    // We init with a placeholder because we don't have a token yet,
    // but we need the client ID/Secret configured in the instance.
    const { accessToken, refreshToken } = await SpotifyService.exchangeCode(
      validatedData.code,
      validatedData.redirectUri
    );

    // 4. Fetch Public Profile Info IMMEDIATELY (Before writing anything)
    // Use the *new* tokens to fetch user profile
    const userClient = new SpotifyService(refreshToken);
    userClient.setAccessToken(accessToken, 3600);
    const me = await userClient.getMe();

    const spotifyProfile = {
      avatarUrl: me.images?.[0]?.url ?? null,
      displayName: me.display_name,
      email: me.email,
      id: me.id,
      linkedAt: new Date(), // This will be converted to Firestore Timestamp automatically
      product: me.product,
      status: 'active'
    };

    // 5. ATOMIC COMMIT: Secrets + User Profile
    // Uses a WriteBatch to ensure either BOTH succeed or NEITHER succeed.
    const batch = db.batch();

    const secretRef = db.collection('users').doc(uid).collection('secrets').doc('spotify');

    const userRef = db.collection('users').doc(uid);

    batch.set(secretRef, {
      accessToken,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshToken,
      updatedAt: new Date().toISOString()
    });

    batch.set(
      userRef,
      {
        spotifyProfile
      },
      { merge: true }
    );

    await batch.commit();

    // 6. Return Success with Profile for Cache Seeding
    return { profile: spotifyProfile, success: true };
  } catch (error) {
    logger.error('Error linking Spotify account:', error);
    // Since we used a batch, we know NOTHING was written if we got here.
    // The state is clean.
    throw new HttpsError('internal', 'Failed to link Spotify account.');
  }
}
