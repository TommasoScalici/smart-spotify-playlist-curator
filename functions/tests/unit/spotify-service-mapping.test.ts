import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpotifyService } from '../../src/services/spotify-service';

// Mock Config
vi.mock('../../src/config/env', () => ({
  config: {
    SPOTIFY_CLIENT_ID: 'test-client',
    SPOTIFY_CLIENT_SECRET: 'test-secret',
    SPOTIFY_REFRESH_TOKEN: 'test-refresh'
  }
}));

const mockSpotifyInstance = {
  playlists: {
    getPlaylistItems: vi.fn()
  },
  search: vi.fn()
};

vi.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: vi.fn(() => mockSpotifyInstance)
  }
}));

describe('SpotifyService - Metadata Mapping', () => {
  let spotifyService: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'refreshed-token', expires_in: 3600 })
    } as unknown as Response);

    spotifyService = new SpotifyService('mock-refresh-token');
  });

  it('getPlaylistTracks: should correctly map track popularity and addedAt', async () => {
    const mockResponse = {
      total: 1,
      items: [
        {
          track: {
            uri: 'spotify:track:1',
            name: 'Track 1',
            artists: [{ name: 'Artist 1' }],
            album: { name: 'Album 1' },
            popularity: 85,
            type: 'track'
          },
          added_at: '2024-01-27T12:00:00Z'
        }
      ]
    };

    mockSpotifyInstance.playlists.getPlaylistItems.mockResolvedValue(mockResponse);

    const tracks = await spotifyService.getPlaylistTracks('playlist-id');

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toEqual({
      uri: 'spotify:track:1',
      name: 'Track 1',
      artist: 'Artist 1',
      album: 'Album 1',
      addedAt: '2024-01-27T12:00:00Z',
      popularity: 85
    });
  });

  it('searchTrack: should correctly map track popularity', async () => {
    const mockSearchResponse = {
      tracks: {
        items: [
          {
            uri: 'spotify:track:search-result',
            name: 'Searched Track',
            artists: [{ name: 'Search Artist' }],
            album: { name: 'Search Album' },
            popularity: 92,
            type: 'track'
          }
        ]
      }
    };

    mockSpotifyInstance.search.mockResolvedValue(mockSearchResponse);

    const track = await spotifyService.searchTrack('query');

    expect(track).not.toBeNull();
    expect(track?.popularity).toBe(92);
    expect(track?.uri).toBe('spotify:track:search-result');
  });
});
