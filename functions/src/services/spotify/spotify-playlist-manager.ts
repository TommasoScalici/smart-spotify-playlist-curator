import { normalizeSpotifyUri } from '@smart-spotify-curator/shared';
import { MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';
import * as logger from 'firebase-functions/logger';

interface PlaylistItemResponse {
  track: {
    uri: string;
  };
}

export class SpotifyPlaylistManager {
  constructor(private spotify: SpotifyApi) {}

  public async addTracks(playlistId: string, uris: string[], position?: number): Promise<void> {
    if (uris.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.spotify.playlists.addItemsToPlaylist(
        playlistIdClean,
        batch,
        position !== undefined ? position + i : undefined
      );
    }
  }

  public async performSmartUpdate(playlistId: string, targetOrderedUris: string[]): Promise<void> {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    const currentItems = await this.getAllPlaylistTracks(playlistIdClean);
    const currentUris = currentItems.map((item) => item.track.uri);
    const currentUrisNormalized = currentUris.map((u) => normalizeSpotifyUri(u));

    try {
      // 1. Calculate allowed frequencies from target list (Using Normalized URIs)
      const targetCountsNormalized = new Map<string, number>();
      targetOrderedUris.forEach((uri) => {
        const norm = normalizeSpotifyUri(uri);
        targetCountsNormalized.set(norm, (targetCountsNormalized.get(norm) || 0) + 1);
      });

      // 2. Identify exact track indices to remove (excess duplicates + completely removed tracks)
      const keptCounts = new Map<string, number>();
      const toRemove: { positions: number[]; uri: string }[] = [];

      currentUrisNormalized.forEach((uriNormalized, index) => {
        const allowed = targetCountsNormalized.get(uriNormalized) || 0;
        const currentKept = keptCounts.get(uriNormalized) || 0;

        if (currentKept < allowed) {
          keptCounts.set(uriNormalized, currentKept + 1);
        } else {
          // Remove exact index using raw URI
          toRemove.push({ positions: [index], uri: currentUris[index] });
        }
      });

      if (toRemove.length > 0) {
        // Sort removals descending by position to prevent index shifting during multiple batch requests
        toRemove.sort((a, b) => b.positions[0] - a.positions[0]);
        await this.removeTracksWithPositions(playlistIdClean, toRemove);
      }

      // 3. Identify exact tracks to add (respecting required frequencies)
      const missingCounts = new Map<string, number>();
      targetCountsNormalized.forEach((allowed, uriNormalized) => {
        const kept = keptCounts.get(uriNormalized) || 0;
        if (allowed > kept) {
          missingCounts.set(uriNormalized, allowed - kept);
        }
      });

      // Find which tracks to add by checking target list order
      const toAdd: string[] = [];
      targetOrderedUris.forEach((uri) => {
        const norm = normalizeSpotifyUri(uri);
        const missing = missingCounts.get(norm) || 0;
        if (missing > 0) {
          toAdd.push(uri);
          missingCounts.set(norm, missing - 1);
        }
      });

      if (toAdd.length > 0) {
        await this.addTracks(playlistIdClean, toAdd);
      }

      // 4. Reorder the finalized selection to match exactly targetOrderedUris
      const finalStateItems = await this.getAllPlaylistTracks(playlistIdClean);
      const finalUris = finalStateItems.map((t) => t.track.uri);

      logger.info(
        `Synchronizing playlist ${playlistIdClean}: ${finalUris.length} tracks actual vs ${targetOrderedUris.length} target.`
      );

      for (let i = 0; i < targetOrderedUris.length; i++) {
        const targetUri = targetOrderedUris[i];
        const targetUriNorm = normalizeSpotifyUri(targetUri);

        // Find current position using case-insensitive normalized comparison
        const actualIndex = this.findActualIndex(finalUris, targetUriNorm, i);

        // Defensively check indices
        if (actualIndex !== i && actualIndex !== -1 && actualIndex < finalUris.length) {
          try {
            await this.spotify.playlists.movePlaylistItems(playlistIdClean, actualIndex, i, 1);
            const [moved] = finalUris.splice(actualIndex, 1);
            finalUris.splice(i, 0, moved);
          } catch (error) {
            logger.error(`Failed to move track at index ${actualIndex} to ${i}`, {
              actualIndex,
              error: (error as Error).message,
              playlistId: playlistIdClean,
              playlistLength: finalUris.length,
              targetIndex: i
            });
          }
        }
      }
    } catch (e: unknown) {
      logger.error(
        `Critical error during performSmartUpdate, initiating rollback for playlist ${playlistIdClean}. Error:`,
        e
      );
      await this.rollbackPlaylist(playlistIdClean, currentUris);
      const originalMessage = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Playlist update failed and was rolled back. Original error: ${originalMessage}`,
        {
          cause: e
        }
      );
    }
  }

  public async removeTracks(playlistId: string, uris: string[]): Promise<void> {
    if (uris.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.spotify.playlists.removeItemsFromPlaylist(playlistIdClean, {
        tracks: batch.map((uri) => ({ uri }))
      });
    }
  }

  public async removeTracksWithPositions(
    playlistId: string,
    tracks: { positions: number[]; uri: string }[]
  ): Promise<void> {
    if (tracks.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    for (let i = 0; i < tracks.length; i += 100) {
      const batch = tracks.slice(i, i + 100);
      await this.spotify.playlists.removeItemsFromPlaylist(playlistIdClean, {
        tracks: batch
      });
    }
  }

  /**
   * Finds the first occurrence of a normalized URI in a list of raw URIs, starting from fromIndex.
   */
  private findActualIndex(uris: string[], targetNorm: string, fromIndex: number): number {
    for (let i = fromIndex; i < uris.length; i++) {
      if (normalizeSpotifyUri(uris[i]) === targetNorm) {
        return i;
      }
    }
    return -1;
  }

  private async getAllPlaylistTracks(playlistId: string): Promise<PlaylistItemResponse[]> {
    const items: PlaylistItemResponse[] = [];
    let offset = 0;
    let total = 1;

    while (offset < total) {
      const page = await this.spotify.playlists.getPlaylistItems(
        playlistId,
        undefined,
        'items(added_at,track(uri,name,popularity,album(name),artists(name))),total',
        50 as MaxInt<50>,
        offset
      );
      if (!page || !page.items) break;

      const validItems = (page.items as unknown as PlaylistItemResponse[]).filter(
        (i) => !!i && !!i.track
      );
      items.push(...(validItems as PlaylistItemResponse[]));

      offset += (page.items || []).length;
      total = page.total || 0;
    }
    return items;
  }

  private async rollbackPlaylist(playlistIdClean: string, originalUris: string[]): Promise<void> {
    try {
      if (originalUris.length === 0) {
        await this.spotify.playlists.updatePlaylistItems(playlistIdClean, { uris: [] });
        return;
      }

      // Spotify allows replacing up to 100 tracks in a single PUT request.
      const firstBatch = originalUris.slice(0, 100);
      await this.spotify.playlists.updatePlaylistItems(playlistIdClean, { uris: firstBatch });

      // Then sequentially append the remaining tracks
      if (originalUris.length > 100) {
        for (let i = 100; i < originalUris.length; i += 100) {
          const batch = originalUris.slice(i, i + 100);
          await this.spotify.playlists.addItemsToPlaylist(playlistIdClean, batch);
        }
      }
      logger.info(
        `Successfully rolled back playlist ${playlistIdClean} to original state of ${originalUris.length} tracks.`
      );
    } catch (rollbackError) {
      logger.error(
        `CRITICAL: Rollback failed for ${playlistIdClean}. Playlist is left in a corrupted state!`,
        rollbackError
      );
    }
  }
}
