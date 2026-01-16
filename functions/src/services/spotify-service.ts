import SpotifyWebApi from 'spotify-web-api-node';
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
  artist?: string; // For tracks
  owner?: string; // For playlists
  imageUrl?: string;
  type: 'track' | 'playlist' | 'artist';
}

export class SpotifyService {
  private static instance: SpotifyService;
  private spotifyApi: SpotifyWebApi;
  private tokenExpirationEpoch: number = 0;

  // Make constructor public to allow per-user instantiation
  public constructor(userRefreshToken?: string) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET,
      refreshToken: userRefreshToken || config.SPOTIFY_REFRESH_TOKEN
    });
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  /**
   * Creates a new service instance for a specific user.
   */
  public static createForUser(refreshToken: string): SpotifyService {
    return new SpotifyService(refreshToken);
  }

  /**
   * Delay helper to avoid rate limits
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes an API operation with retry logic for 401 (Auth) and 429 (Rate Limit).
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    await this.ensureAccessToken();

    try {
      return await operation();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (retries <= 0) throw error;

      // Handle 429 Too Many Requests
      if (error.statusCode === 429) {
        const retryAfter =
          error.headers && error.headers['retry-after']
            ? parseInt(error.headers['retry-after'])
            : 1;
        logger.warn(`Rate limit hit. Waiting ${retryAfter} seconds...`, {
          retryAfter
        });
        await this.delay(retryAfter * 1000 + 100); // Wait + buffer
        return this.executeWithRetry(operation, retries - 1);
      }

      // Handle 401 Unauthorized (Expired Token)
      if (error.statusCode === 401) {
        logger.warn('Got 401, refreshing token and retrying...');
        this.tokenExpirationEpoch = 0; // Force refresh
        await this.ensureAccessToken();
        return this.executeWithRetry(operation, retries - 1);
      }

      // Handle Network Errors (ETIMEDOUT, ECONNRESET, ENOTFOUND)
      // Node.js error codes are typically strings in error.code
      const networkErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EPIPE'];
      if (
        networkErrors.includes(error.code) ||
        (error.cause && networkErrors.includes((error.cause as { code?: string }).code as string))
      ) {
        logger.warn(`Network error (${error.code || 'unknown'}). Retrying in 2s...`, { error });
        await this.delay(2000); // 2s wait for network glitches
        return this.executeWithRetry(operation, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Exchanges an authorization code for an Access Token and Refresh Token.
   */
  public async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      this.spotifyApi.setRedirectURI(redirectUri);
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      return {
        accessToken: data.body['access_token'],
        refreshToken: data.body['refresh_token']
      };
    } catch (error) {
      logger.error('Failed to exchange Spotify code:', error);
      throw error;
    }
  }

  /**
   * Ensures a valid access token exists. Refreshes if expired or missing.
   */
  private async ensureAccessToken(): Promise<void> {
    const now = Date.now();
    // Refresh if token is missing or expires in less than 5 minutes
    if (now + 5 * 60 * 1000 > this.tokenExpirationEpoch) {
      try {
        const data = await this.spotifyApi.refreshAccessToken();
        const accessToken = data.body['access_token'];
        const expiresInSeconds = data.body['expires_in'];

        this.spotifyApi.setAccessToken(accessToken);
        this.tokenExpirationEpoch = now + expiresInSeconds * 1000;
      } catch (error) {
        logger.error('Failed to refresh access token:', error);
        throw error;
      }
    }
  }

  /**
   * Fetches ALL tracks from a playlist, handling pagination.
   * @param playlistId The Spotify ID of the playlist
   * @returns Array of simplified TrackInfo objects
   */
  public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
    const allTracks: TrackInfo[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    await this.executeWithRetry(async () => {
      while (hasMore) {
        const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
          offset,
          limit
        });
        const items = response.body.items;

        for (const item of items) {
          if (item.track && item.track.type === 'track') {
            allTracks.push({
              uri: item.track.uri,
              name: item.track.name,
              artist: item.track.artists.map((a: { name: string }) => a.name).join(', '),
              addedAt: item.added_at
            });
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

  public async getTracks(uris: string[]): Promise<TrackInfo[]> {
    if (uris.length === 0) return [];
    const trackIds = uris.map((uri) => uri.replace('spotify:track:', ''));
    const allTracks: TrackInfo[] = [];

    // Batch requests (limit 50 per call)
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      await this.executeWithRetry(async () => {
        const response = await this.spotifyApi.getTracks(batch);
        response.body.tracks.forEach((t) => {
          if (t) {
            allTracks.push({
              uri: t.uri,
              name: t.name,
              artist: t.artists.map((a) => a.name).join(', '),
              addedAt: new Date().toISOString() // New tracks don't have addedAt yet
            });
          }
        });
      });
    }
    return allTracks;
  }

  public async getPlaylistMetadata(
    playlistId: string
  ): Promise<{ name: string; description: string; imageUrl?: string; owner: string }> {
    return this.executeWithRetry(async () => {
      const response = await this.spotifyApi.getPlaylist(playlistId, {
        fields: 'name,description,images,owner'
      });
      return {
        name: response.body.name,
        description: response.body.description || '',
        imageUrl: response.body.images?.[0]?.url,
        owner: response.body.owner.display_name || 'Unknown'
      };
    });
  }

  public async searchTrack(query: string): Promise<TrackInfo | null> {
    return this.executeWithRetry(async () => {
      const response = await this.spotifyApi.searchTracks(query, { limit: 1 });
      const tracks = response.body.tracks?.items;
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

  /**
   * Generic search for Tracks, Playlists, or Artists.
   */
  public async search(
    query: string,
    types: ('track' | 'playlist' | 'artist')[],
    limit: number = 20
  ): Promise<SearchResult[]> {
    return this.executeWithRetry(async () => {
      const response = await this.spotifyApi.search(query, types, { limit });
      const results: SearchResult[] = [];

      if (response.body.tracks) {
        response.body.tracks.items.forEach((t) => {
          results.push({
            uri: t.uri,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            imageUrl: t.album.images[0]?.url,
            type: 'track'
          });
        });
      }

      if (response.body.playlists) {
        response.body.playlists.items.forEach((p) => {
          results.push({
            uri: p.uri,
            name: p.name,
            owner: p.owner.display_name,
            imageUrl: p.images[0]?.url,
            type: 'playlist'
          });
        });
      }

      if (response.body.artists) {
        response.body.artists.items.forEach((a) => {
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

  public async removeTracks(
    playlistId: string,
    uris: string[],
    dryRun: boolean = false
  ): Promise<void> {
    if (uris.length === 0) return;

    if (dryRun) {
      logger.info('DRY RUN: Would remove tracks', {
        playlistId,
        count: uris.length,
        uris
      });
      return;
    }

    // Chunk into batches of 100
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100).map((uri) => ({ uri }));
      await this.executeWithRetry(() =>
        this.spotifyApi.removeTracksFromPlaylist(playlistId, batch)
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
      logger.info('DRY RUN: Would add tracks', {
        playlistId,
        count: uris.length,
        uris
      });
      return;
    }

    // Chunk into batches of 100
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      // If position is provided, we must increment it for subsequent batches!
      // Actually, if we insert at POS, the next batch should be at POS + 100.
      const batchPosition = position !== undefined ? position + i : undefined;

      await this.executeWithRetry(() =>
        this.spotifyApi.addTracksToPlaylist(
          playlistId,
          batch,
          batchPosition !== undefined ? { position: batchPosition } : undefined
        )
      );
    }
  }

  /**
   * Performs a surgical update to the playlist:
   * 1. Removes specified tracks.
   * 2. Appends new tracks.
   * 3. Reorders tracks to match the target order ONE BY ONE to preserve timestamps.
   * WARNING: This is slow due to rate limiting (500ms delay per move).
   */
  /**
   * Performs a Hybrid Smart Update (Skeleton Strategy):
   * 1. Removes all non-VIP tracks.
   * 2. Reorders remaining VIP tracks to match target relative order (preserving timestamp).
   * 3. Inserts new/non-VIP tracks in contiguous blocks.
   */
  public async performSmartUpdate(
    playlistId: string,
    _tracksToRemove: string[], // Legacy param, kept for signature but logic calculates diff internally if needed, or we trust caller.
    // Actually, for Skeleton Strategy, we just need to know which are VIPs.
    // We will calculate removals based on "Current - VIPs".
    // But wait, the caller 'Orchestrator' has already determined 'tracksToRemove'.
    // If we want to strictly follow Skeleton Strategy, we should remove *everything that is not a kept VIP*.
    // The 'tracksToRemove' passed by orchestrator is 'current - kept'.
    // So 'tracksToRemove' IS the list of non-VIPs + expired VIPs?
    // Orchestrator calculates 'tracksToRemove' as anything not in 'finalTrackList' + expired.
    // Let's refine: We need to remove anything currently in the playlist that is NOT a VIP we intend to keep.
    // The Orchestrator passes 'targetOrderedUris' which is the final desired state.
    // It also passes 'tracksToRemove' and 'tracksToAdd'.
    //
    // Hybrid Strategy Implementation:
    // 1. Bulk Remove 'tracksToRemove' (This should clear the way).
    // 2. Identify remaining tracks (These should be the VIPs we kept).
    // 3. Reorder these remaining tracks to match their relative order in 'targetOrderedUris'.
    // 4. Iterate 'targetOrderedUris' and insert the 'tracksToAdd' (and any other non-VIPs?) in blocks.
    //
    // Wait, 'tracksToAdd' are just the NEW ones. What about "kept non-VIPs"?
    // If we keep a non-VIP, we preserve its timestamp.
    // But the user said: "Apply new logic exclusively to non-VIP tracks... fast removal / add (added_at resets)."
    // This implies we SHOULD remove kept non-VIPs and re-add them to be fast?
    // "Standard Tracks: Bulk remove / add (fast, added_at resets)."
    // YES. We should remove ALL non-VIPs, even if they were "kept" by logic, to facilitate block insertion.
    // So we need to calculate a SUPERSET of removals: All Current - All VIPs.
    //
    // So we need 'vipUris' passed in.
    _tracksToAdd: string[], // Legacy param, we can derive from target - vips.
    targetOrderedUris: string[],
    dryRun: boolean = false,
    vipUris: string[] = []
  ): Promise<void> {
    logger.info(`Starting Smart Update for ${playlistId}`, {
      dryRun,
      method: 'Skeleton/Hybrid'
    });

    if (dryRun) {
      logger.info('DRY RUN: Would execute Skeleton Strategy update.');
      return;
    }

    // 1. Fetch Current State to determine what to purge
    const currentTracks = await this.getPlaylistTracks(playlistId);
    const currentUris = currentTracks.map((t) => t.uri);

    // tracksToRemove passed in might be partial. We want to remove ALL non-VIPs.
    // Filter: Remove if NOT in vipUris.
    // Be careful: vipUris might contain tracks not in current playlist (future VIPs).
    // We only care about protecting *current* VIPs.
    const vipsSet = new Set(vipUris);

    // We want to KEEP only tracks that are in 'targetOrderedUris' AND in 'vipUris'.
    // (If a VIP is removed by logic e.g. age/dupe, it shouldn't be in targetOrderedUris, so we remove it too).
    // Wait, if a VIP is in 'vipUris' but logic removed it (e.g. it was explicitly banned?), it wouldn't be in target.
    // So we Keep T if (T in Current) AND (T in Target) AND (T in VIPs).

    const targetSet = new Set(targetOrderedUris);
    const toKeep = currentUris.filter((uri) => vipsSet.has(uri) && targetSet.has(uri));
    const toRemove = currentUris.filter((uri) => !toKeep.includes(uri));

    // 2. Bulk Remove
    if (toRemove.length > 0) {
      logger.info(`Removing ${toRemove.length} non-preserved tracks...`);
      await this.removeTracks(playlistId, toRemove, dryRun);
    }

    // 3. Skeleton Reorder (VIPs)
    // The playlist now contains only 'toKeep' tracks.
    // We need them to be in the same relative order as they appear in 'targetOrderedUris'.

    // Get fresh snapshot of what remains
    // Optimization: We know what remains is 'toKeep' (in current order).
    // Let's assume remove success.
    const skeleton = [...toKeep];

    // Desired order of these backbone tracks
    const backboneTarget = targetOrderedUris.filter(
      (uri) => vipsSet.has(uri) && skeleton.includes(uri)
    );

    // Reorder skeleton to match backboneTarget
    // Reuse the reorder logic but only for these few tracks
    if (skeleton.length > 1) {
      // Fetch snapshot ID once
      const playlistData = await this.executeWithRetry(() =>
        this.spotifyApi.getPlaylist(playlistId, { fields: 'snapshot_id' })
      );
      let snapshotId = playlistData.body.snapshot_id;

      for (let i = 0; i < backboneTarget.length; i++) {
        const targetUri = backboneTarget[i];
        if (i >= skeleton.length) break;

        if (skeleton[i] !== targetUri) {
          const currentIndex = skeleton.indexOf(targetUri, i);
          if (currentIndex !== -1) {
            const response = await this.executeWithRetry(() =>
              this.spotifyApi.reorderTracksInPlaylist(playlistId, currentIndex, i, {
                snapshot_id: snapshotId
              })
            );
            snapshotId = response.body.snapshot_id;
            await this.delay(300); // Faster delay for VIPs as they are few

            const [moved] = skeleton.splice(currentIndex, 1);
            skeleton.splice(i, 0, moved);
          }
        }
      }
    }

    // 4. Block Insertion
    // Iterate through targetOrderedUris.
    // We have a 'insertPointer' which starts at 0.
    // When we encounter a VIP (from backboneTarget), we advance pointer (it's already there).
    // When we encounter non-VIPs, we collect a batch and insert at pointer.

    let insertPointer = 0;
    let pendingBlock: string[] = [];

    // Helper to flush block
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
        // It's a VIP that exists in our skeleton
        // Flush any pending non-VIPs before this VIP
        await flushBlock();
        // The VIP is already at insertPointer (logically), so just skip over it
        insertPointer++;
      } else {
        // It's a non-VIP (or a new VIP we didn't have before? Treated as non-VIP for insertion)
        pendingBlock.push(uri);
      }
    }
    // Flush updates at the end
    await flushBlock();

    logger.info('Hybrid Smart Update Complete.');
  }
}
