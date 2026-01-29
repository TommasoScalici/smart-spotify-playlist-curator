import { SpotifyApi } from '@spotify/web-api-ts-sdk';

import { config } from '../config/env';
import { SearchResult, TrackInfo } from '../types/spotify';
import { SpotifyAuthManager } from './spotify/spotify-auth-manager';
import { SpotifyBaseClient } from './spotify/spotify-base-client';
import { SpotifyPlaylistManager } from './spotify/spotify-playlist-manager';
import { SpotifyTrackSearcher } from './spotify/spotify-track-searcher';

export type { TrackInfo, SearchResult };

export class SpotifyService extends SpotifyBaseClient {
  private spotify: SpotifyApi;
  private auth: SpotifyAuthManager;
  private tracks: SpotifyTrackSearcher;
  private playlists: SpotifyPlaylistManager;

  constructor(userRefreshToken: string) {
    super();
    this.spotify = SpotifyApi.withAccessToken(config.SPOTIFY_CLIENT_ID, {
      access_token: '',
      token_type: 'Bearer',
      expires_in: 0,
      refresh_token: userRefreshToken
    });

    this.auth = new SpotifyAuthManager(this.spotify, userRefreshToken);
    this.tracks = new SpotifyTrackSearcher(this.spotify);
    this.playlists = new SpotifyPlaylistManager(this.spotify);
  }

  // --- Auth Delegation ---
  public async ensureAccessToken() {
    return this.auth.ensureAccessToken();
  }
  public setAccessToken(token: string, expiresInSeconds: number) {
    this.auth.setAccessToken(token, expiresInSeconds);
    this.auth.updateSdkToken();
  }
  public setTokens(at: string, rt: string, ex: number) {
    this.auth.setTokens(at, rt, ex);
    this.auth.updateSdkToken();
  }
  public getAccessToken() {
    return this.auth.getAccessToken();
  }
  public getRefreshToken() {
    return this.auth.getRefreshToken();
  }
  public getTokenExpirationEpoch() {
    return this.auth.getTokenExpirationEpoch();
  }

  /**
   * Internal helper to execute operations with common retry and auth logic.
   */
  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.auth.ensureAccessToken();
    return this.executeWithRetry(operation, 3, () => this.auth.forceRefresh());
  }

  // --- Profile methods ---
  public async getMe() {
    return this.execute(() => this.spotify.currentUser.profile());
  }

  public async getPlaylistDetails(playlistId: string) {
    return this.execute(() => this.tracks.getPlaylistDetails(playlistId));
  }

  public async getLatestTrackAddedAt(playlistId: string, totalTracks: number) {
    return this.execute(() => this.tracks.getLatestTrackAddedAt(playlistId, totalTracks));
  }

  public async getTrackMetadata(trackUri: string) {
    return this.execute(() => this.tracks.getTrackMetadata(trackUri));
  }

  public async getUserPlaylists(): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.getUserPlaylists());
  }

  public async searchUserPlaylists(query: string, limit: number = 20): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.searchUserPlaylists(query, limit));
  }

  // --- Track Delegation ---
  public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
    return this.execute(() => this.tracks.getPlaylistTracks(playlistId));
  }

  public async searchTrack(query: string): Promise<TrackInfo | null> {
    const results = await this.execute(() => this.tracks.search(query, ['track'], 1));
    const trackResult = results.find((r) => r.type === 'track');
    if (!trackResult) return null;

    return {
      uri: trackResult.uri,
      name: trackResult.name,
      artist: trackResult.artist || 'Unknown',
      album: '',
      addedAt: new Date().toISOString(),
      popularity: trackResult.popularity
    };
  }

  public async search(
    query: string,
    types: ('track' | 'playlist' | 'artist')[],
    limit = 20
  ): Promise<SearchResult[]> {
    return this.execute(() => this.tracks.search(query, types, limit));
  }

  public async getTracks(uris: string[]): Promise<TrackInfo[]> {
    return this.execute(() => this.tracks.getTracks(uris));
  }

  // --- Playlist Delegation ---
  public async performSmartUpdate(playlistId: string, targetOrderedUris: string[], dryRun = false) {
    return this.execute(() =>
      this.playlists.performSmartUpdate(playlistId, targetOrderedUris, dryRun)
    );
  }

  public async removeTracks(playlistId: string, uris: string[], dryRun = false) {
    return this.execute(() => this.playlists.removeTracks(playlistId, uris, dryRun));
  }

  public async addTracks(playlistId: string, uris: string[], dryRun = false, position?: number) {
    return this.execute(() => this.playlists.addTracks(playlistId, uris, dryRun, position));
  }

  // --- Static Helpers ---
  public static async exchangeCode(code: string, redirectUri: string) {
    const basicAuth = Buffer.from(
      `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) throw new Error(`Code exchange failed: ${response.statusText}`);
    const data = await response.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }
}
