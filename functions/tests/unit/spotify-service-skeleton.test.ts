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

describe('SpotifyService - Skeleton Strategy', () => {
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

  it('should execute Skeleton Strategy: Remove Non-VIPs -> Reorder VIPs -> Insert Blocks', async () => {
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

    mockSpotifyInstance.playlists.getPlaylistItems.mockResolvedValue({ items: currentTracks });

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

    // 1. Remove Logic: B, C, E
    const expectedRemove = [
      { uri: 'spotify:track:B', positions: [1] },
      { uri: 'spotify:track:C', positions: [2] },
      { uri: 'spotify:track:E', positions: [4] }
    ];
    expect(mockSpotifyInstance.playlists.removeItemsFromPlaylist).toHaveBeenCalledWith(playlistId, {
      tracks: expectedRemove
    });

    // 2. Reorder Logic: [A, D] -> Sorted already. No call.
    expect(mockSpotifyInstance.playlists.movePlaylistItems).not.toHaveBeenCalled();

    // 3. Insert Logic
    // Insert [X, Y] at index 1
    // Insert [Z] at index 4
    expect(mockSpotifyInstance.playlists.addItemsToPlaylist).toHaveBeenNthCalledWith(
      1,
      playlistId,
      ['spotify:track:X', 'spotify:track:Y'],
      1
    );

    expect(mockSpotifyInstance.playlists.addItemsToPlaylist).toHaveBeenNthCalledWith(
      2,
      playlistId,
      ['spotify:track:Z'],
      4
    );
  });

  it('should reorder VIPs if they are out of order in skeleton', async () => {
    const playlistId = 'test-playlist-reorder';
    const vipUris = ['spotify:track:A', 'spotify:track:D'];

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

    // Explicitly mocking getPlaylist if the code calls it for snapshot_id?
    // In my previous fix I REMOVED the getPlaylist call for snapshot_id.
    // So no need to mock getPlaylist return value for that purpose.

    const targetOrderedUris = ['spotify:track:A', 'spotify:track:D'];

    mockSpotifyInstance.playlists.movePlaylistItems.mockResolvedValue({ snapshot_id: 'snap2' });

    await spotifyService.performSmartUpdate(playlistId, targetOrderedUris, false, vipUris);

    // Reorder: Skeleton [D, A]. Target [A, D].
    // D is at 0. Target is A.
    // A is at 1. Move A (idx 1) to 0.
    // movePlaylistItems(id, start, insert, 1) -> move(id, 1, 0, 1)

    expect(mockSpotifyInstance.playlists.movePlaylistItems).toHaveBeenCalledWith(
      playlistId,
      1,
      0,
      1
    );
  });
});
