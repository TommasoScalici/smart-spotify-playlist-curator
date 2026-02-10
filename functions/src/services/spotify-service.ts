import { SearchResult, TrackInfo } from '@smart-spotify-curator/shared';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

import { config } from '../config/env';
import { SpotifyAuthManager } from './spotify/spotify-auth-manager';
import { SpotifyBaseClient } from './spotify/spotify-base-client';
import { SpotifyPlaylistManager } from './spotify/spotify-playlist-manager';
import { SpotifyTrackSearcher } from './spotify/spotify-track-searcher';

export class SpotifyService extends SpotifyBaseClient {
  private auth: SpotifyAuthManager;
  private playlists: SpotifyPlaylistManager;
  private spotify: SpotifyApi;
  private tracks: SpotifyTrackSearcher;

  constructor(userRefreshToken: string) {
    super();
    this.spotify = SpotifyApi.withAccessToken(config.SPOTIFY_CLIENT_ID, {
      access_token: '',
      expires_in: 0,
      refresh_token: userRefreshToken,
      token_type: 'Bearer'
    });

    this.auth = new SpotifyAuthManager(this.spotify, userRefreshToken);
    this.tracks = new SpotifyTrackSearcher(this.spotify);
    this.playlists = new SpotifyPlaylistManager(this.spotify);
  }

  // --- Static Helpers ---
  public static async exchangeCode(code: string, redirectUri: string) {
    const basicAuth = Buffer.from(
      `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET} `
    ).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }),
      headers: {
        Authorization: `Basic ${basicAuth} `,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST'
    });

    if (!response.ok) throw new Error(`Code exchange failed: ${response.statusText} `);
    const data = await response.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }
  public async addTracks(playlistId: string, uris: string[], position?: number) {
    return this.execute(() => this.playlists.addTracks(playlistId, uris, position));
  }
  // --- Auth Delegation ---
  public async ensureAccessToken() {
    return this.auth.ensureAccessToken();
  }
  public getAccessToken() {
    return this.auth.getAccessString();
  }
  public async getLatestTrackAddedAt(playlistId: string, totalTracks: number) {
    return this.execute(() => this.tracks.getLatestTrackAddedAt(playlistId, totalTracks));
  }
  // --- Profile methods ---
  public async getMe() {
    return this.execute(() => this.spotify.currentUser.profile());
  }

  public async getPlaylistDetails(playlistId: string) {
    return this.execute(() => this.tracks.getPlaylistDetails(playlistId));
  }

  // --- Track Delegation ---
  public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
    return this.execute(() => this.tracks.getPlaylistTracks(playlistId));
  }

  public getRefreshToken() {
    return this.auth.getRefreshToken();
  }

  public getTokenExpirationEpoch() {
    return this.auth.getTokenExpirationEpoch();
  }

  public async getTrackMetadata(trackUri: string) {
    return this.execute(() => this.tracks.getTrackMetadata(trackUri));
  }

  public async getTracks(uris: string[]): Promise<TrackInfo[]> {
    return this.execute(() => this.tracks.getTracks(uris));
  }

  public async getUserPlaylists(): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.getUserPlaylists());
  }

  // --- Playlist Delegation ---
  public async performSmartUpdate(playlistId: string, targetOrderedUris: string[]) {
    return this.execute(() => this.playlists.performSmartUpdate(playlistId, targetOrderedUris));
  }

  public async removeTracks(playlistId: string, uris: string[]) {
    return this.execute(() => this.playlists.removeTracks(playlistId, uris));
  }

  public async search(
    query: string,
    types: ('artist' | 'playlist' | 'track')[],
    limit = 20
  ): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.search(query, types, limit));
  }

  public async searchTrack(query: string): Promise<null | TrackInfo> {
    const results = await this.execute(() => this.tracks.search(query, ['track'], 1));
    const trackResult = results.find((r) => r.type === 'track');
    if (!trackResult) return null;

    return {
      addedAt: new Date().toISOString(),
      album: '',
      artist: trackResult.artist || 'Unknown',
      name: trackResult.name,
      popularity: trackResult.popularity,
      uri: trackResult.uri
    };
  }

  public async searchUserPlaylists(query: string, limit: number = 20): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.searchUserPlaylists(query, limit));
  }

  public setAccessToken(token: string, expiresInSeconds: number) {
    this.auth.setAccessToken(token, expiresInSeconds);
  }

  public setTokens(at: string, rt: string, ex: number) {
    this.auth.setTokens(at, rt, ex);
  }

  /**
   * Internal helper to execute operations with common retry and auth logic.
   */
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.auth.ensureAccessToken();
    return this.executeWithRetry(operation, 3, () => this.auth.forceRefresh());
  }
}
