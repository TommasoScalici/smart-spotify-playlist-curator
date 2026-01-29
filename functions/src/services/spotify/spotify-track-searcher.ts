import { MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';

import { SearchResult, TrackInfo } from '../../types/spotify';

interface SpotifySearchItem {
  added_at: string;
  track: {
    uri: string;
    name: string;
    popularity: number;
    album: {
      name: string;
    };
    artists: {
      name: string;
    }[];
  };
}

export class SpotifyTrackSearcher {
  constructor(private spotify: SpotifyApi) {}

  public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');
    let tracks: TrackInfo[] = [];
    let offset = 0;
    let total = 1;

    while (offset < total) {
      const response = await this.spotify.playlists.getPlaylistItems(
        playlistIdClean,
        undefined,
        'items(added_at,track(uri,name,popularity,album(name),artists(name))),total',
        50 as MaxInt<50>,
        offset
      );

      const items = response.items.filter((item) => item.track) as unknown as SpotifySearchItem[];
      tracks = tracks.concat(
        items.map((item: SpotifySearchItem) => ({
          uri: item.track.uri,
          name: item.track.name,
          artist: item.track.artists[0]?.name || 'Unknown',
          album: item.track.album?.name || '',
          addedAt: item.added_at,
          popularity: item.track.popularity
        }))
      );

      offset += items.length;
      total = response.total;
    }

    return tracks;
  }

  public async search(
    query: string,
    types: ('track' | 'playlist' | 'artist')[],
    limit: number = 20
  ): Promise<SearchResult[]> {
    const response = await this.spotify.search(query, types, undefined, limit as MaxInt<50>);
    const results: SearchResult[] = [];

    if (response.tracks) {
      results.push(
        ...response.tracks.items.map((t) => ({
          uri: t.uri,
          name: t.name,
          artist: t.artists[0]?.name,
          imageUrl: t.album.images?.[0]?.url,
          popularity: t.popularity,
          type: 'track' as const
        }))
      );
    }

    if (response.playlists) {
      results.push(
        ...response.playlists.items.map((p) => ({
          uri: p.uri,
          name: p.name,
          owner: p.owner.display_name,
          ownerId: p.owner.id,
          description: p.description,
          imageUrl: p.images[0]?.url,
          type: 'playlist' as const
        }))
      );
    }

    return results;
  }

  public async getTracks(uris: string[]): Promise<TrackInfo[]> {
    if (uris.length === 0) return [];
    const ids = uris.map((uri) => uri.replace('spotify:track:', ''));

    const batches = [];
    for (let i = 0; i < ids.length; i += 50) {
      batches.push(ids.slice(i, i + 50));
    }

    const results = await Promise.all(batches.map((batch) => this.spotify.tracks.get(batch)));
    const allTracks = results.flatMap((r) => r);

    return allTracks.map((t) => ({
      uri: t.uri,
      name: t.name,
      artist: t.artists[0]?.name || 'Unknown',
      album: t.album.name,
      addedAt: new Date().toISOString(),
      popularity: t.popularity
    }));
  }

  public async getPlaylistDetails(playlistId: string) {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');
    const playlist = await this.spotify.playlists.getPlaylist(playlistIdClean);
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.images?.[0]?.url,
      followers: playlist.followers.total,
      totalTracks: playlist.tracks.total,
      owner: playlist.owner.display_name
    };
  }

  public async getLatestTrackAddedAt(
    playlistId: string,
    totalTracks: number
  ): Promise<string | null> {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');
    if (totalTracks === 0) return null;

    const lastTrackBatch = await this.spotify.playlists.getPlaylistItems(
      playlistIdClean,
      undefined,
      'items(added_at)',
      1 as MaxInt<50>,
      Math.max(0, totalTracks - 1)
    );

    return lastTrackBatch.items[0]?.added_at || null;
  }

  public async getTrackMetadata(trackUri: string) {
    const trackId = trackUri.replace('spotify:track:', '');
    const track = await this.spotify.tracks.get(trackId);
    return {
      uri: track.uri,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown',
      album: track.album.name,
      imageUrl: track.album.images?.[0]?.url,
      popularity: track.popularity
    };
  }

  public async getUserPlaylists(): Promise<SearchResult[]> {
    const limit = 50;
    const firstPage = await this.spotify.currentUser.playlists.playlists(limit as MaxInt<50>, 0);
    const total = firstPage.total;
    const allItems = [...firstPage.items];

    if (total > limit) {
      const offsets = [];
      const hardLimit = 500;
      const actualTotal = Math.min(total, hardLimit);

      for (let offset = limit; offset < actualTotal; offset += limit) {
        offsets.push(offset);
      }

      // Parallel fetch batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < offsets.length; i += BATCH_SIZE) {
        const batch = offsets.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((offset) =>
            this.spotify.currentUser.playlists.playlists(limit as MaxInt<50>, offset)
          )
        );
        results.forEach((r) => allItems.push(...r.items));
      }
    }

    return allItems.map((p) => ({
      uri: p.uri,
      name: p.name,
      owner: p.owner.display_name,
      ownerId: p.owner.id,
      description: p.description,
      imageUrl: p.images?.[0]?.url,
      type: 'playlist' as const
    }));
  }

  public async searchUserPlaylists(query: string, limit: number = 20): Promise<SearchResult[]> {
    const all = await this.getUserPlaylists();
    const q = query.toLowerCase();
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, limit);
  }
}
