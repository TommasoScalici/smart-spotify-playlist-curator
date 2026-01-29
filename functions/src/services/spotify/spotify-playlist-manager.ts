import { MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';
import * as logger from 'firebase-functions/logger';

interface PlaylistItemResponse {
  track: {
    uri: string;
  };
}

export class SpotifyPlaylistManager {
  constructor(private spotify: SpotifyApi) {}

  public async removeTracks(
    playlistId: string,
    uris: string[],
    dryRun: boolean = false
  ): Promise<void> {
    if (uris.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    if (dryRun) {
      logger.info(`[Dry Run] Would remove ${uris.length} tracks from ${playlistIdClean}`);
      return;
    }

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.spotify.playlists.removeItemsFromPlaylist(playlistIdClean, {
        tracks: batch.map((uri) => ({ uri }))
      });
    }
  }

  public async removeTracksWithPositions(
    playlistId: string,
    tracks: { uri: string; positions: number[] }[],
    dryRun: boolean = false
  ): Promise<void> {
    if (tracks.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    if (dryRun) {
      logger.info(
        `[Dry Run] Would remove ${tracks.length} track instances with positions from ${playlistIdClean}`
      );
      return;
    }

    for (let i = 0; i < tracks.length; i += 100) {
      const batch = tracks.slice(i, i + 100);
      await this.spotify.playlists.removeItemsFromPlaylist(playlistIdClean, {
        tracks: batch
      });
    }
  }

  public async addTracks(
    playlistId: string,
    uris: string[],
    dryRun: boolean = false,
    position?: number
  ): Promise<void> {
    if (uris.length === 0) return;
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    if (dryRun) {
      logger.info(
        `[Dry Run] Would add ${uris.length} tracks to ${playlistIdClean} at position ${position ?? 'end'}`
      );
      return;
    }

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.spotify.playlists.addItemsToPlaylist(
        playlistIdClean,
        batch,
        position !== undefined ? position + i : undefined
      );
    }
  }

  public async performSmartUpdate(
    playlistId: string,
    targetOrderedUris: string[],
    dryRun: boolean = false
  ): Promise<void> {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');

    const currentItems = await this.getAllPlaylistTracks(playlistIdClean);
    const currentUris = currentItems.map((item) => item.track.uri);

    const targetSet = new Set(targetOrderedUris);
    const toRemove: { uri: string; positions: number[] }[] = [];
    currentUris.forEach((uri, index) => {
      if (!targetSet.has(uri)) {
        toRemove.push({ uri, positions: [index] });
      }
    });

    if (toRemove.length > 0) {
      await this.removeTracksWithPositions(playlistIdClean, toRemove, dryRun);
    }

    const stateAfterRemovals = currentUris.filter((uri) => targetSet.has(uri));
    const stateAfterRemovalsSet = new Set(stateAfterRemovals);
    const toAdd = targetOrderedUris.filter((uri) => !stateAfterRemovalsSet.has(uri));

    if (toAdd.length > 0) {
      await this.addTracks(playlistIdClean, toAdd, dryRun);
    }

    if (!dryRun) {
      const finalStateItems = await this.getAllPlaylistTracks(playlistIdClean);
      const finalUris = finalStateItems.map((t) => t.track.uri);

      for (let i = 0; i < targetOrderedUris.length; i++) {
        const targetUri = targetOrderedUris[i];
        const actualIndex = finalUris.indexOf(targetUri, i);

        if (actualIndex !== i && actualIndex !== -1) {
          await this.spotify.playlists.movePlaylistItems(playlistIdClean, actualIndex, i, 1);
          const [moved] = finalUris.splice(actualIndex, 1);
          finalUris.splice(i, 0, moved);
        }
      }
    }
  }

  private async getAllPlaylistTracks(playlistId: string): Promise<PlaylistItemResponse[]> {
    let items: PlaylistItemResponse[] = [];
    let offset = 0;
    let total = 1;

    while (offset < total) {
      const page = await this.spotify.playlists.getPlaylistItems(
        playlistId,
        undefined,
        undefined,
        50 as MaxInt<50>,
        offset
      );
      if (!page) break;
      items = items.concat((page.items as unknown as PlaylistItemResponse[]) || []);
      offset += (page.items || []).length;
      total = page.total || 0;
    }
    return items;
  }
}
