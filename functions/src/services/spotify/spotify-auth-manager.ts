import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import * as logger from 'firebase-functions/logger';

import { config as env } from '../../config/env';
import { SpotifyTokens } from '../../types/spotify';

export class SpotifyAuthManager {
  private accessToken: string | null = null;
  private tokenExpirationEpoch: number = 0;

  constructor(
    private spotify: SpotifyApi,
    private refreshToken: string
  ) {}

  public setAccessToken(token: string, expiresInSeconds: number): void {
    this.accessToken = token;
    this.tokenExpirationEpoch = Math.floor(Date.now() / 1000) + expiresInSeconds;
  }

  public setTokens(accessToken: string, refreshToken: string, expiresInSeconds: number): void {
    this.setAccessToken(accessToken, expiresInSeconds);
    this.refreshToken = refreshToken;
  }

  public async forceRefresh(): Promise<void> {
    logger.info('Forcing Spotify access token refresh...');
    const tokens = await this.refreshAccessTokenManual();
    this.setAccessToken(tokens.access_token, tokens.expires_in);
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }
    this.updateSdkToken();
  }

  public async ensureAccessToken(): Promise<void> {
    const isExpired = Date.now() / 1000 >= this.tokenExpirationEpoch - 60; // 1 min buffer
    if (!this.accessToken || isExpired) {
      logger.info('Spotify access token expired or missing. Refreshing...');
      const tokens = await this.refreshAccessTokenManual();
      this.setAccessToken(tokens.access_token, tokens.expires_in);
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
      this.updateSdkToken();
    }
  }

  public updateSdkToken(): void {
    if (!this.accessToken) return;
    const expiration = this.tokenExpirationEpoch * 1000;

    const token = {
      access_token: this.accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor((expiration - Date.now()) / 1000),
      refresh_token: this.refreshToken,
      expires: expiration
    };

    // Use a more structured approach to avoid 'any' while still handling SDK internals
    const api = this.spotify as unknown as {
      setAccessToken?: (token: unknown) => void;
      authenticationStrategy?: {
        getAccessToken?: () => Promise<unknown>;
      };
    };

    if (typeof api.setAccessToken === 'function') {
      api.setAccessToken(token);
    } else if (api.authenticationStrategy) {
      // Internal hack for Strategy-based token management
      const strategy = api.authenticationStrategy as Record<string, unknown>;
      strategy['getAccessToken'] = async () => token;
    }
  }

  public async refreshAccessTokenManual(): Promise<SpotifyTokens> {
    const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
      'base64'
    );

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Failed to refresh Spotify token', { status: response.status, errorBody });
      throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
    }

    return (await response.json()) as SpotifyTokens;
  }

  public getAccessToken() {
    return this.accessToken;
  }
  public getRefreshToken() {
    return this.refreshToken;
  }
  public getTokenExpirationEpoch() {
    return this.tokenExpirationEpoch;
  }
}
