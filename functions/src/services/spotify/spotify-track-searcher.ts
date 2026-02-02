import { MaxInt, SpotifyApi } from '@spotify/web-api-ts-sdk';

import { SearchResult, TrackInfo } from '../../types/spotify';

interface SpotifySearchItem {
  added_at: string;
  track: {
    album: {
      name: string;
    };
    artists: {
      name: string;
    }[];
    name: string;
    popularity: number;
    uri: string;
  };
}

export class SpotifyTrackSearcher {
  constructor(private spotify: SpotifyApi) {}

  public async getLatestTrackAddedAt(
    playlistId: string,
    totalTracks: number
  ): Promise<null | string> {
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

  public async getPlaylistDetails(playlistId: string) {
    const playlistIdClean = playlistId.replace('spotify:playlist:', '');
    const playlist = await this.spotify.playlists.getPlaylist(playlistIdClean);
    return {
      description: playlist.description,
      followers: playlist.followers.total,
      id: playlist.id,
      imageUrl: playlist.images?.[0]?.url,
      name: playlist.name,
      owner: playlist.owner.display_name,
      totalTracks: playlist.tracks.total
    };
  }

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
          addedAt: item.added_at,
          album: item.track.album?.name || '',
          artist: item.track.artists[0]?.name || 'Unknown',
          name: item.track.name,
          popularity: item.track.popularity,
          uri: item.track.uri
        }))
      );

      offset += items.length;
      total = response.total;
    }

    return tracks;
  }

  public async getTrackMetadata(trackUri: string) {
    const trackId = trackUri.replace('spotify:track:', '');
    const track = await this.spotify.tracks.get(trackId);
    return {
      album: track.album.name,
      artist: track.artists[0]?.name || 'Unknown',
      imageUrl: track.album.images?.[0]?.url,
      name: track.name,
      popularity: track.popularity,
      uri: track.uri
    };
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
      addedAt: new Date().toISOString(),
      album: t.album.name,
      artist: t.artists[0]?.name || 'Unknown',
      name: t.name,
      popularity: t.popularity,
      uri: t.uri
    }));
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
      description: p.description,
      imageUrl: p.images?.[0]?.url,
      name: p.name,
      owner: p.owner.display_name,
      ownerId: p.owner.id,
      type: 'playlist' as const,
      uri: p.uri
    }));
  }

  public async search(
    query: string,
    types: ('artist' | 'playlist' | 'track')[],
    limit: number = 20
  ): Promise<SearchResult[]> {
    const response = await this.spotify.search(query, types, undefined, limit as MaxInt<50>);
    const results: SearchResult[] = [];

    if (response.tracks) {
      results.push(
        ...response.tracks.items.map((t) => ({
          artist: t.artists[0]?.name,
          imageUrl: t.album.images?.[0]?.url,
          name: t.name,
          popularity: t.popularity,
          type: 'track' as const,
          uri: t.uri
        }))
      );
    }

    if (response.playlists) {
      results.push(
        ...response.playlists.items.map((p) => ({
          description: p.description,
          imageUrl: p.images[0]?.url,
          name: p.name,
          owner: p.owner.display_name,
          ownerId: p.owner.id,
          type: 'playlist' as const,
          uri: p.uri
        }))
      );
    }

    if (response.artists) {
      results.push(
        ...response.artists.items.map((a) => ({
          imageUrl: a.images[0]?.url,
          name: a.name,
          popularity: a.popularity,
          type: 'artist' as const,
          uri: a.uri
        }))
      );
    }

    return results;
  }

  public async searchUserPlaylists(query: string, limit: number = 20): Promise<SearchResult[]> {
    const all = await this.getUserPlaylists();
    const q = query.toLowerCase();
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, limit);
  }
}
