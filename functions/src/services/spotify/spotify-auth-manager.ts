import { SpotifyTokens, SpotifyTokensSchema } from '@smart-spotify-curator/shared';
import { AccessToken, IAuthStrategy, SdkConfiguration, SpotifyApi } from '@spotify/web-api-ts-sdk';
import * as logger from 'firebase-functions/logger';

import { config as env } from '../../config/env';

export class SpotifyAuthManager implements IAuthStrategy {
  private accessToken: null | string = null;
  private tokenExpirationEpoch: number = 0;

  constructor(
    private spotify: SpotifyApi,
    private refreshToken: string
  ) {
    this.spotify.switchAuthenticationStrategy(this);
  }

  // --- IAuthStrategy Implementation ---

  public async ensureAccessToken(): Promise<void> {
    const isExpired = Date.now() / 1000 >= this.tokenExpirationEpoch - 60; // 1 min buffer
    if (!this.accessToken || isExpired) {
      logger.info('Spotify access token expired or missing. Refreshing...');
      const tokens = await this.refreshAccessTokenManual();
      this.setAccessToken(tokens.access_token, tokens.expires_in);
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
    }
  }

  public async forceRefresh(): Promise<void> {
    logger.info('Forcing Spotify access token refresh...');
    const tokens = await this.refreshAccessTokenManual();
    this.setAccessToken(tokens.access_token, tokens.expires_in);
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }
  }

  public getAccessString() {
    return this.accessToken;
  }

  public async getAccessToken(): Promise<AccessToken | null> {
    if (!this.accessToken) return null;
    return this.getCurrentAccessTokenObj();
  }

  // --- Core Logic ---

  public async getOrCreateAccessToken(): Promise<AccessToken> {
    await this.ensureAccessToken();
    return this.getCurrentAccessTokenObj();
  }

  public getRefreshToken() {
    return this.refreshToken;
  }

  public getTokenExpirationEpoch() {
    return this.tokenExpirationEpoch;
  }

  public async refreshAccessTokenManual(): Promise<SpotifyTokens> {
    const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
      'base64'
    );

    const response = await fetch('https://accounts.spotify.com/api/token', {
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      }),
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Failed to refresh Spotify token', { errorBody, status: response.status });
      throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
    }

    const json = await response.json();
    return SpotifyTokensSchema.parse(json);
  }

  public removeAccessToken(): void {
    this.accessToken = null;
  }

  public setAccessToken(token: string, expiresInSeconds: number): void {
    this.accessToken = token;
    this.tokenExpirationEpoch = Math.floor(Date.now() / 1000) + expiresInSeconds;
    // No need to update SDK manually; strategy will read new values on next request
  }

  public setConfiguration(_configuration: SdkConfiguration): void {
    // No-op for now
  }

  public setTokens(accessToken: string, refreshToken: string, expiresInSeconds: number): void {
    this.setAccessToken(accessToken, expiresInSeconds);
    this.refreshToken = refreshToken;
  }
  /**
   * @deprecated logic moved to strategy, but kept for explicit calls if needed
   */
  public updateSdkToken(): void {
    // No-op now as strategy is dynamic
  }
  private getCurrentAccessTokenObj(): AccessToken {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    const expiresIn = Math.max(0, this.tokenExpirationEpoch - Math.floor(Date.now() / 1000));
    return {
      access_token: this.accessToken,
      expires: this.tokenExpirationEpoch * 1000,
      expires_in: expiresIn,
      refresh_token: this.refreshToken,
      token_type: 'Bearer'
    };
  }
}
