import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    getPlaylistItems: vi.fn(),
    removeItemsFromPlaylist: vi.fn(),
    movePlaylistItems: vi.fn(),
    addItemsToPlaylist: vi.fn(),
    getPlaylist: vi.fn()
  }
};

vi.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: vi.fn(() => mockSpotifyInstance)
  }
}));

describe('SpotifyService - Smart Update', () => {
  let spotifyService: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'refreshed-token', expires_in: 3600 })
    } as unknown as Response);

    spotifyService = new SpotifyService('mock-refresh-token');
    // Use a type cast to access the private delay method for testing purposes
    (spotifyService as unknown as { delay: (ms: number) => Promise<void> }).delay = vi
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute Smart Update: Remove -> Add -> Sort', async () => {
    // Setup
    const playlistId = 'test-playlist';
    const vipUris = ['spotify:track:A', 'spotify:track:D'];

    // Current State: [A(vip), B, C, D(vip), E]
    const currentTracks = [
      {
        track: {
          uri: 'spotify:track:A',
          name: 'A',
          artists: [{ name: 'Art' }],
          album: { name: 'Album A' },
          id: '1',
          type: 'track'
        },
        added_at: '2023-01-01'
      },
      {
        track: {
          uri: 'spotify:track:B',
          name: 'B',
          artists: [{ name: 'Art' }],
          album: { name: 'Album B' },
          id: '2',
          type: 'track'
        },
        added_at: '2023-01-02'
      },
      {
        track: {
          uri: 'spotify:track:C',
          name: 'C',
          artists: [{ name: 'Art' }],
          album: { name: 'Album C' },
          id: '3',
          type: 'track'
        },
        added_at: '2023-01-03'
      },
      {
        track: {
          uri: 'spotify:track:D',
          name: 'D',
          artists: [{ name: 'Art' }],
          album: { name: 'Album D' },
          id: '4',
          type: 'track'
        },
        added_at: '2023-01-01'
      },
      {
        track: {
          uri: 'spotify:track:E',
          name: 'E',
          artists: [{ name: 'Art' }],
          album: { name: 'Album E' },
          id: '5',
          type: 'track'
        },
        added_at: '2023-01-04'
      }
    ];

    // Mock response to change state between calls!
    mockSpotifyInstance.playlists.getPlaylistItems
      .mockResolvedValueOnce({ total: 5, items: currentTracks }) // Stage 1 fetch
      .mockResolvedValueOnce({ total: 2, items: [currentTracks[0], currentTracks[3]] }) // After removals [A, D]
      .mockResolvedValueOnce({
        total: 5,
        items: [
          currentTracks[0],
          currentTracks[3],
          {
            track: {
              uri: 'spotify:track:X',
              type: 'track',
              artists: [{ name: 'Art' }],
              name: 'X',
              album: { name: 'X' }
            }
          },
          {
            track: {
              uri: 'spotify:track:Y',
              type: 'track',
              artists: [{ name: 'Art' }],
              name: 'Y',
              album: { name: 'Y' }
            }
          },
          {
            track: {
              uri: 'spotify:track:Z',
              type: 'track',
              artists: [{ name: 'Art' }],
              name: 'Z',
              album: { name: 'Z' }
            }
          }
        ]
      }); // After additions [A, D, X, Y, Z]

    // Target Order: [A(vip), X, Y, D(vip), Z]
    const targetOrderedUris = [
      'spotify:track:A',
      'spotify:track:X',
      'spotify:track:Y',
      'spotify:track:D',
      'spotify:track:Z'
    ];

    mockSpotifyInstance.playlists.removeItemsFromPlaylist.mockResolvedValue({
      snapshot_id: 'snap2'
    });
    mockSpotifyInstance.playlists.movePlaylistItems.mockResolvedValue({ snapshot_id: 'snap3' });
    mockSpotifyInstance.playlists.addItemsToPlaylist.mockResolvedValue({ snapshot_id: 'snap4' });

    // Execute
    await spotifyService.performSmartUpdate(playlistId, targetOrderedUris, false, vipUris);

    // 1. Remove Logic: B, C, E.
    expect(mockSpotifyInstance.playlists.removeItemsFromPlaylist).toHaveBeenCalledWith(
      playlistId,
      expect.objectContaining({
        tracks: expect.arrayContaining([
          { uri: 'spotify:track:E', positions: [4] },
          { uri: 'spotify:track:C', positions: [2] },
          { uri: 'spotify:track:B', positions: [1] }
        ])
      })
    );

    // 2. Addition Logic: Adds [X, Y, Z] to the end
    expect(mockSpotifyInstance.playlists.addItemsToPlaylist).toHaveBeenCalledWith(
      playlistId,
      expect.arrayContaining(['spotify:track:X', 'spotify:track:Y', 'spotify:track:Z']),
      undefined
    );

    // 3. Reorder Logic: Matches the sort steps
    // Current is [A, D, X, Y, Z]. Target is [A, X, Y, D, Z].
    // i=0: [A] matches.
    // i=1: [D] != [X]. Find [X] at 2. Move 2 to 1. New: [A, X, D, Y, Z]
    // i=2: [D] != [Y]. Find [Y] at 3. Move 3 to 2. New: [A, X, Y, D, Z]
    // i=3: [D] matches.
    // i=4: [Z] matches.
    expect(mockSpotifyInstance.playlists.movePlaylistItems).toHaveBeenCalledTimes(2);
    expect(mockSpotifyInstance.playlists.movePlaylistItems).toHaveBeenNthCalledWith(
      1,
      playlistId,
      2,
      1,
      1
    );
    expect(mockSpotifyInstance.playlists.movePlaylistItems).toHaveBeenNthCalledWith(
      2,
      playlistId,
      3,
      2,
      1
    );
  });

  it('should reorder tracks if they are out of order', async () => {
    const playlistId = 'test-playlist-reorder';

    const currentTracks = [
      {
        track: {
          uri: 'spotify:track:D',
          name: 'D',
          artists: [],
          album: { name: 'Album D' },
          id: '4',
          type: 'track'
        },
        added_at: '2023-01-01'
      },
      {
        track: {
          uri: 'spotify:track:A',
          name: 'A',
          artists: [],
          album: { name: 'Album A' },
          id: '1',
          type: 'track'
        },
        added_at: '2023-01-01'
      }
    ];

    mockSpotifyInstance.playlists.getPlaylistItems.mockResolvedValue({ items: currentTracks });
    mockSpotifyInstance.playlists.movePlaylistItems.mockResolvedValue({ snapshot_id: 'snap2' });

    // Target: [A, D]
    await spotifyService.performSmartUpdate(
      playlistId,
      ['spotify:track:A', 'spotify:track:D'],
      false,
      []
    );

    // Initial: [D, A].
    // i=0: [D] != [A]. Find [A] at 1. Move 1 to 0. -> [A, D]
    expect(mockSpotifyInstance.playlists.movePlaylistItems).toHaveBeenCalledWith(
      playlistId,
      1,
      0,
      1
    );
  });
});
