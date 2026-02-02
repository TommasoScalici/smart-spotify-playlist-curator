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

    const targetSet = new Set(targetOrderedUris);
    const toRemove: { positions: number[]; uri: string }[] = [];
    currentUris.forEach((uri, index) => {
      if (!targetSet.has(uri)) {
        toRemove.push({ positions: [index], uri });
      }
    });

    if (toRemove.length > 0) {
      await this.removeTracksWithPositions(playlistIdClean, toRemove);
    }

    const stateAfterRemovals = currentUris.filter((uri) => targetSet.has(uri));
    const stateAfterRemovalsSet = new Set(stateAfterRemovals);
    const toAdd = targetOrderedUris.filter((uri) => !stateAfterRemovalsSet.has(uri));

    if (toAdd.length > 0) {
      await this.addTracks(playlistIdClean, toAdd);
    }

    const finalStateItems = await this.getAllPlaylistTracks(playlistIdClean);
    const finalUris = finalStateItems.map((t) => t.track.uri);

    logger.info(
      `Synchronizing playlist ${playlistIdClean}: ${finalUris.length} tracks actual vs ${targetOrderedUris.length} target.`
    );

    for (let i = 0; i < targetOrderedUris.length; i++) {
      const targetUri = targetOrderedUris[i];
      const actualIndex = finalUris.indexOf(targetUri, i);

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
          // Continue to next track instead of crashing the whole process
        }
      }
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
}
