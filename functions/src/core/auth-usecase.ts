import { SpotifyProfile } from '@smart-spotify-curator/shared';

import { db } from '../admin/firebase.js';
import { SpotifyService } from '../services/spotify-service.js';

export class AuthUseCase {
  public async exchangeAndLink(uid: string, code: string, redirectUri: string) {
    // 1. Exchange Code for Tokens
    const { accessToken, refreshToken } = await SpotifyService.exchangeCode(code, redirectUri);

    // 2. Fetch Public Profile Info
    const userClient = new SpotifyService(refreshToken);
    userClient.setAccessToken(accessToken, 3600);
    const me = await userClient.getMe();

    const spotifyProfile: SpotifyProfile = {
      avatarUrl: me.images?.[0]?.url ?? null,
      displayName: me.display_name,
      email: me.email,
      id: me.id,
      linkedAt: new Date(),
      product: me.product,
      status: 'active'
    };

    // 3. Atomic Commit
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

    return { profile: spotifyProfile, success: true };
  }
}
