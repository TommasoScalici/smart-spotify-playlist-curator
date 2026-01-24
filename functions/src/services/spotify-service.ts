import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { config } from '../config/env';
import * as logger from 'firebase-functions/logger';

export interface TrackInfo {
  uri: string;
  name: string;
  artist: string;
  addedAt: string;
}

export interface SearchResult {
  uri: string;
  name: string;
  artist?: string;
  owner?: string;
  ownerId?: string;
  description?: string;
  imageUrl?: string;
  type: 'track' | 'playlist' | 'artist';
}

export class SpotifyService {
  private spotify: SpotifyApi;
  private accessToken: string | null = null;
  private refreshToken: string;
  private tokenExpirationEpoch: number = 0;

  public constructor(userRefreshToken: string) {
    this.refreshToken = userRefreshToken;
    // Initialize with a placeholder or empty token, will be set via setTokens or ensureAccessToken
    this.spotify = SpotifyApi.withAccessToken(config.SPOTIFY_CLIENT_ID, {
      access_token: '',
      token_type: 'Bearer',
      expires_in: 0,
      refresh_token: userRefreshToken
    });
  }

  public setAccessToken(token: string, expiresInSeconds: number): void {
    this.accessToken = token;
    this.tokenExpirationEpoch = Date.now() + expiresInSeconds * 1000;
    this.updateSdkToken();
  }

  public setTokens(accessToken: string, refreshToken: string, expiresInSeconds: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpirationEpoch = Date.now() + expiresInSeconds * 1000;
    this.updateSdkToken();
  }

  private updateSdkToken() {
    if (this.accessToken) {
      // Re-initialize a cheap client with the valid token
      // Note: We manage refresh manually, so we don't rely on the SDK's auto-refresh here
      // to ensure we capture rotations for Firestore.
      this.spotify = SpotifyApi.withAccessToken(config.SPOTIFY_CLIENT_ID, {
        access_token: this.accessToken,
        token_type: 'Bearer',
        expires_in: Math.max(0, Math.floor((this.tokenExpirationEpoch - Date.now()) / 1000)),
        refresh_token: this.refreshToken
      });
    }
  }

  public getAccessToken(): string | undefined {
    return this.accessToken || undefined;
  }

  public getRefreshToken(): string | undefined {
    return this.refreshToken;
  }

  public getTokenExpirationEpoch(): number {
    return this.tokenExpirationEpoch;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Manual Refresh Logic using fetch to ensure we capture the new refresh token (rotation).
   */
  private async refreshAccessTokenManual(): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.refreshToken);

    const authHeader = Buffer.from(
      `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`
      },
      body: params
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
    }

    return (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
  }

  private async ensureAccessToken(): Promise<void> {
    const now = Date.now();

    // Refresh if missing or expiring within 5 minutes
    if (!this.accessToken || now + 5 * 60 * 1000 > this.tokenExpirationEpoch) {
      try {
        logger.info('Refreshing Spotify access token...');
        const data = await this.refreshAccessTokenManual();

        this.accessToken = data.access_token;
        if (data.refresh_token) {
          logger.info('Spotify returned a new refresh token (rotation).');
          this.refreshToken = data.refresh_token;
        }
        this.tokenExpirationEpoch = now + data.expires_in * 1000;

        this.updateSdkToken();
      } catch (error) {
        logger.error('Failed to refresh access token:', error);
        throw error;
      }
    }
  }

  public async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const authHeader = Buffer.from(
      `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`
      },
      body: params
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to exchange code: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { access_token: string; refresh_token: string };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    await this.ensureAccessToken();

    try {
      return await operation();
    } catch (error: unknown) {
      if (retries <= 0) throw error;

      // Handle 429 Too Many Requests | 401 Unauthorized
      // SDK errors often wrap the response
      // @spotify/web-api-ts-sdk doesn't inherently throw on 429 inside the method?
      // Actually it uses `fetch` and might throw or return error object.
      // Assuming it throws standard errors.

      const err = error as {
        status?: number;
        response?: { status: number };
        headers?: { get: (name: string) => string | null };
        message?: string;
      };
      const status = err?.status || err?.response?.status;

      if (status && (status === 429 || (status >= 500 && status < 600))) {
        const retryAfter = parseInt(err?.headers?.get?.('retry-after') || '1');
        logger.warn(`Rate limit/Server error (${status}). Waiting ${retryAfter} seconds...`, {
          retryAfter
        });
        await this.delay(retryAfter * 1000 + 100);
        return this.executeWithRetry(operation, retries - 1);
      }

      if (status === 401) {
        logger.warn('Got 401, refreshing token and retrying...');
        this.tokenExpirationEpoch = 0;
        await this.ensureAccessToken();
        return this.executeWithRetry(operation, retries - 1);
      }

      // Network errors
      const msg = err.message || '';
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ETIMEDOUT')) {
        logger.warn(`Network error. Retrying in 2s...`, { error });
        await this.delay(2000);
        return this.executeWithRetry(operation, retries - 1);
      }

      throw error;
    }
  }

  public async getMe() {
    return this.executeWithRetry(() => this.spotify.currentUser.profile());
  }

  public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
    const allTracks: TrackInfo[] = [];
    let offset = 0;
    const limit = 50; // SDK might default to 20, max 50 usually via API directly
    // The SDK handles pagination via helper? No, we do manual pagination to be safe/granular.

    let hasMore = true;

    await this.executeWithRetry(async () => {
      while (hasMore) {
        const response = await this.spotify.playlists.getPlaylistItems(
          playlistId,
          undefined,
          undefined,
          limit,
          offset
        );
        const items = response.items;

        for (const item of items) {
          if (item.track && item.track.type === 'track') {
            const t = item.track;
            // t is Track | Episode. Use type guard or check type
            if ('artists' in t) {
              allTracks.push({
                uri: t.uri,
                name: t.name,
                artist: t.artists.map((a) => a.name).join(', '),
                addedAt: item.added_at
              });
            }
          }
        }

        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    });

    return allTracks;
  }

  public async getLatestTrackAddedAt(
    playlistId: string,
    totalTracks: number
  ): Promise<string | null> {
    if (totalTracks === 0) return null;
    const offset = Math.max(0, totalTracks - 1);

    return this.executeWithRetry(async () => {
      const response = await this.spotify.playlists.getPlaylistItems(
        playlistId,
        undefined,
        undefined,
        1,
        offset
      );
      const items = response.items;
      if (items.length > 0 && items[0].added_at) {
        return items[0].added_at;
      }
      return null;
    });
  }

  public async getTracks(uris: string[]): Promise<TrackInfo[]> {
    if (uris.length === 0) return [];
    const trackIds = uris.map((uri) => uri.replace('spotify:track:', ''));
    const allTracks: TrackInfo[] = [];

    // Valid max for getTracks is 50
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      await this.executeWithRetry(async () => {
        const response = await this.spotify.tracks.get(batch);
        response.forEach((t) => {
          if (t) {
            allTracks.push({
              uri: t.uri,
              name: t.name,
              artist: t.artists.map((a) => a.name).join(', '),
              addedAt: new Date().toISOString()
            });
          }
        });
      });
    }
    return allTracks;
  }

  public async getTrackMetadata(trackUri: string) {
    const trackId = trackUri.replace('spotify:track:', '');
    return this.executeWithRetry(async () => {
      const track = await this.spotify.tracks.get(trackId);
      if (!track) return null;
      return {
        uri: track.uri,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        imageUrl: track.album.images[0]?.url
      };
    });
  }

  public async getPlaylistMetadata(playlistId: string) {
    return this.executeWithRetry(async () => {
      const response = await this.spotify.playlists.getPlaylist(
        playlistId,
        undefined,
        'name,description,images,owner'
      );
      return {
        name: response.name,
        description: response.description || '',
        imageUrl: response.images?.[0]?.url,
        owner: response.owner.display_name || 'Unknown'
      };
    });
  }

  public async getPlaylistDetails(playlistId: string) {
    return this.executeWithRetry(async () => {
      const response = await this.spotify.playlists.getPlaylist(playlistId);
      return {
        name: response.name,
        description: response.description || '',
        imageUrl: response.images?.[0]?.url,
        owner: response.owner.display_name || 'Unknown',
        followers: response.followers?.total || 0,
        totalTracks: response.tracks?.total || 0
      };
    });
  }

  public async searchTrack(query: string): Promise<TrackInfo | null> {
    return this.executeWithRetry(async () => {
      const response = await this.spotify.search(query, ['track'], undefined, 1);
      const tracks = response.tracks.items;
      if (tracks && tracks.length > 0) {
        const t = tracks[0];
        return {
          uri: t.uri,
          name: t.name,
          artist: t.artists.map((a) => a.name).join(', '),
          addedAt: new Date().toISOString()
        };
      }
      return null;
    });
  }

  public async search(
    query: string,
    types: ('track' | 'playlist' | 'artist')[],
    limit: number = 20
  ): Promise<SearchResult[]> {
    return this.executeWithRetry(async () => {
      // Use a type cast to the expected parameter type of the SDK to bypass strict literal checks
      const response = await this.spotify.search(
        query,
        types,
        undefined,
        limit as Parameters<typeof this.spotify.search>[3]
      );
      const results: SearchResult[] = [];

      // response has tracks?, playlists?, artists? keys mapping to Page<T>

      if (response.tracks) {
        response.tracks.items.forEach((t) => {
          results.push({
            uri: t.uri,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            imageUrl: t.album.images[0]?.url,
            type: 'track'
          });
        });
      }

      if (response.playlists) {
        response.playlists.items.forEach((p) => {
          if (!p) return;
          results.push({
            uri: p.uri,
            name: p.name,
            owner: p.owner.display_name || undefined,
            ownerId: p.owner.id,
            description: p.description || '',
            imageUrl: p.images[0]?.url,
            type: 'playlist'
          });
        });
      }

      if (response.artists) {
        response.artists.items.forEach((a) => {
          results.push({
            uri: a.uri,
            name: a.name,
            imageUrl: a.images[0]?.url,
            type: 'artist'
          });
        });
      }
      return results;
    });
  }

  public async getUserPlaylists(): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    const userProfile = await this.getMe();
    const currentUserId = userProfile.id;

    await this.executeWithRetry(async () => {
      while (hasMore) {
        // currentUser.playlists.playlists returns Page<SimplifiedPlaylist>
        const response = await this.spotify.currentUser.playlists.playlists(limit, offset);
        const items = response.items;

        items.forEach((p) => {
          if (p.owner.id === currentUserId) {
            results.push({
              uri: p.uri,
              name: p.name,
              owner: p.owner.display_name || undefined,
              ownerId: p.owner.id,
              description: p.description || '',
              imageUrl: p.images[0]?.url,
              type: 'playlist'
            });
          }
        });

        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

        if (offset >= 500) hasMore = false;
      }
    });
    return results;
  }

  public async removeTracks(
    playlistId: string,
    uris: string[],
    dryRun: boolean = false
  ): Promise<void> {
    if (uris.length === 0) return;
    if (dryRun) {
      logger.info('DRY RUN: Could remove tracks', { playlistId, count: uris.length, uris });
      return;
    }

    // Chunk 100
    // SDK removeItemsFromPlaylist takes { uri: string }[] like old API?
    // No, SDK takes { uri: string }[] for snapshot removal or simply URIs?
    // The signature: removeItemsFromPlaylist(playlist_id, body: { tracks: [{ uri }] })

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100).map((uri) => ({ uri }));
      await this.executeWithRetry(() =>
        this.spotify.playlists.removeItemsFromPlaylist(playlistId, { tracks: batch })
      );
    }
  }

  public async addTracks(
    playlistId: string,
    uris: string[],
    dryRun: boolean = false,
    position?: number
  ): Promise<void> {
    if (uris.length === 0) return;
    if (dryRun) {
      logger.info('DRY RUN: Would add tracks', { playlistId, count: uris.length });
      return;
    }

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const batchPosition = position !== undefined ? position + i : undefined;
      await this.executeWithRetry(() =>
        this.spotify.playlists.addItemsToPlaylist(playlistId, batch, batchPosition)
      );
    }
  }

  public async performSmartUpdate(
    playlistId: string,
    targetOrderedUris: string[],
    dryRun: boolean = false,
    vipUris: string[] = []
  ): Promise<void> {
    logger.info(`Starting Smart Update for ${playlistId}`, { dryRun, method: 'Skeleton/Hybrid' });

    if (dryRun) {
      logger.info('DRY RUN: Would execute Hybrid Smart Update.');
      return;
    }

    // 1. Fetch Current
    const currentTracks = await this.getPlaylistTracks(playlistId);
    const currentUris = currentTracks.map((t) => t.uri);
    const vipsSet = new Set(vipUris);
    const targetSet = new Set(targetOrderedUris);

    const toKeep = currentUris.filter((uri) => vipsSet.has(uri) && targetSet.has(uri));
    const toRemove = currentUris.filter((uri) => !toKeep.includes(uri));

    if (toRemove.length > 0) {
      logger.info(`Removing ${toRemove.length} non-preserved tracks...`);
      await this.removeTracks(playlistId, toRemove, dryRun);
    }

    // 3. Skeleton Reorder (VIPs)
    const skeleton = [...toKeep];
    const backboneTarget = targetOrderedUris.filter(
      (uri) => vipsSet.has(uri) && skeleton.includes(uri)
    );

    if (skeleton.length > 1) {
      for (let i = 0; i < backboneTarget.length; i++) {
        const targetUri = backboneTarget[i];
        if (i >= skeleton.length) break;

        if (skeleton[i] !== targetUri) {
          const currentIndex = skeleton.indexOf(targetUri, i);
          if (currentIndex !== -1) {
            await this.executeWithRetry(() =>
              this.spotify.playlists.movePlaylistItems(playlistId, currentIndex, i, 1)
            );
            await this.delay(300);

            const [moved] = skeleton.splice(currentIndex, 1);
            skeleton.splice(i, 0, moved);
          }
        }
      }
    }

    // 4. Block Insertion
    let insertPointer = 0;
    let pendingBlock: string[] = [];

    const flushBlock = async () => {
      if (pendingBlock.length > 0) {
        logger.info(`Inserting block of ${pendingBlock.length} tracks at pos ${insertPointer}`);
        await this.addTracks(playlistId, pendingBlock, dryRun, insertPointer);
        insertPointer += pendingBlock.length;
        pendingBlock = [];
      }
    };

    for (const uri of targetOrderedUris) {
      if (backboneTarget.includes(uri)) {
        await flushBlock();
        insertPointer++;
      } else {
        pendingBlock.push(uri);
      }
    }
    await flushBlock();
    logger.info('Hybrid Smart Update Complete.');
  }
}
