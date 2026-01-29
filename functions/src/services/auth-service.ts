import * as logger from 'firebase-functions/logger';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { SpotifyService } from './spotify-service';

/**
 * Gets an authorized Spotify service for a given user, reusing cached access tokens if valid.
 * @param uid - The Firebase User ID
 * @returns Object containing the initialized SpotifyService and the original RefreshToken
 * @throws HttpsError if not linked or token missing
 */
export async function getAuthorizedSpotifyService(uid: string) {
  const secretsRef = db.doc(`users/${uid}/secrets/spotify`);
  const secretSnap = await secretsRef.get();

  if (!secretSnap.exists) {
    throw new HttpsError('not-found', 'Spotify not linked');
  }

  const data = secretSnap.data();
  const refreshToken = data?.refreshToken;
  if (!refreshToken) {
    throw new HttpsError('not-found', 'Spotify refresh token missing');
  }

  // Create Spotify Service
  const spotifyService = new SpotifyService(refreshToken);

  // Check if we have a cached access token that's still valid (not expiring within 5 minutes)
  const cachedAccessToken = data?.accessToken;
  const cachedExpiresAt = data?.expiresAt;
  if (cachedAccessToken && cachedExpiresAt) {
    const expiresAtDate = new Date(cachedExpiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAtDate > fiveMinutesFromNow) {
      // Token is still valid, reuse it
      const expiresInSeconds = Math.floor((expiresAtDate.getTime() - now.getTime()) / 1000);
      spotifyService.setTokens(cachedAccessToken, refreshToken, expiresInSeconds);
    }
  }

  return { service: spotifyService, originalRefreshToken: refreshToken };
}

/**
 * Persists any updated tokens (including rotated refresh tokens) back to Firestore.
 * @param uid - The Firebase User ID
 * @param service - The SpotifyService instance containing potentially updated tokens
 * @param originalRefreshToken - The original refresh token to check for rotation
 */
export async function persistSpotifyTokens(
  uid: string,
  service: SpotifyService,
  originalRefreshToken: string
) {
  const newRefreshToken = service.getRefreshToken();
  const newAccessToken = service.getAccessToken();
  const newExpiresAt = service.getTokenExpirationEpoch();

  const updates: {
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: string;
    updatedAt?: string;
  } = {};
  // Only update if refresh token actually rotated
  if (newRefreshToken && newRefreshToken !== originalRefreshToken) {
    updates.refreshToken = newRefreshToken;
  }
  // Always update access token cache if available/fresh
  if (newAccessToken) {
    updates.accessToken = newAccessToken;
    updates.expiresAt = new Date(newExpiresAt).toISOString();
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    try {
      await db.doc(`users/${uid}/secrets/spotify`).set(updates, { merge: true });
      logger.info(`Persisted updated Spotify tokens for user ${uid}`);
    } catch (e) {
      logger.error(`Failed to persist updated Spotify tokens for user ${uid}`, e);
    }
  }
}
