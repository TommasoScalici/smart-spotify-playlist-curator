/* eslint-disable @typescript-eslint/no-explicit-any */
import { SpotifyService } from '../../src/services/spotify-service';
import SpotifyWebApi from 'spotify-web-api-node';

// Mock SpotifyWebApi
// Mock SpotifyWebApi
vi.mock('spotify-web-api-node', () => {
  return {
    default: vi.fn(function () {
      return {
        refreshAccessToken: vi.fn(),
        setAccessToken: vi.fn(),
        getPlaylist: vi.fn(),
        getPlaylistTracks: vi.fn(),
        removeTracksFromPlaylist: vi.fn(),
        reorderTracksInPlaylist: vi.fn(),
        addTracksToPlaylist: vi.fn()
      };
    })
  };
});

// Mock config
vi.mock('../../src/config/env', () => ({
  config: {
    SPOTIFY_CLIENT_ID: 'test',
    SPOTIFY_CLIENT_SECRET: 'test',
    SPOTIFY_REFRESH_TOKEN: 'test'
  }
}));

describe('SpotifyService - Skeleton Strategy', () => {
  let spotifyService: SpotifyService;
  let mockSpotifyApi: {
    refreshAccessToken: ReturnType<typeof vi.fn>;
    setAccessToken: ReturnType<typeof vi.fn>;
    getPlaylist: ReturnType<typeof vi.fn>;
    getPlaylistTracks: ReturnType<typeof vi.fn>;
    removeTracksFromPlaylist: ReturnType<typeof vi.fn>;
    reorderTracksInPlaylist: ReturnType<typeof vi.fn>;
    addTracksToPlaylist: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Clear instance to force new creation with mock
    // @ts-expect-error - Clearing private instance for testing
    SpotifyService.instance = undefined;

    // console.log("SpotifyWebApi type:", typeof SpotifyWebApi);
    // console.log("SpotifyWebApi prototype:", SpotifyWebApi.prototype);

    const MockSpotifyWebApi = vi.fn();
    mockSpotifyApi = {
      refreshAccessToken: vi.fn(),
      setAccessToken: vi.fn(),
      getPlaylist: vi.fn(),
      getPlaylistTracks: vi.fn(),
      removeTracksFromPlaylist: vi.fn(),
      reorderTracksInPlaylist: vi.fn(),
      addTracksToPlaylist: vi.fn()
    } as any;

    (MockSpotifyWebApi as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSpotifyApi);
    vi.mocked(SpotifyWebApi).mockImplementation(function () {
      return mockSpotifyApi as any;
    });

    // Default Mocks
    mockSpotifyApi.refreshAccessToken.mockResolvedValue({
      body: { access_token: 'new-token', expires_in: 3600 }
    } as any);
    mockSpotifyApi.setAccessToken.mockReturnValue();
    mockSpotifyApi.getPlaylist.mockResolvedValue({
      body: { snapshot_id: 'snap1' }
    } as any);

    spotifyService = SpotifyService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
          id: '4',
          type: 'track'
        },
        added_at: '2023-01-01'
      }, // VIP
      {
        track: {
          uri: 'spotify:track:E',
          name: 'E',
          artists: [{ name: 'Art' }],
          id: '5',
          type: 'track'
        },
        added_at: '2023-01-04'
      }
    ];

    mockSpotifyApi.getPlaylistTracks.mockResolvedValue({
      body: { items: currentTracks }
    } as any);

    // Target Order: [A(vip), X, Y, D(vip), Z]
    // X, Y, Z are new. B, C, E are removed.
    const targetOrderedUris = [
      'spotify:track:A',
      'spotify:track:X',
      'spotify:track:Y',
      'spotify:track:D',
      'spotify:track:Z'
    ];

    mockSpotifyApi.removeTracksFromPlaylist.mockResolvedValue({
      body: { snapshot_id: 'snap2' }
    } as any);
    mockSpotifyApi.reorderTracksInPlaylist.mockResolvedValue({
      body: { snapshot_id: 'snap3' }
    } as any);
    mockSpotifyApi.addTracksToPlaylist.mockResolvedValue({ body: { snapshot_id: 'snap4' } } as any);

    // Execute
    await spotifyService.performSmartUpdate(
      playlistId,
      [], // tracksToRemove (legacy, ignored logic)
      [], // tracksToAdd (legacy, ignored logic)
      targetOrderedUris,
      false,
      vipUris
    );

    // Assertions

    // 1. Remove Logic
    // Should remove B, C, E. (Tracks not in Target AND not in VIP)
    // Actually logic is: Remove if NOT (in VIP AND in Target).
    // B -> Not VIP. Remove.
    // C -> Not VIP. Remove.
    // E -> Not VIP. Remove.
    // A -> VIP & Target. Keep.
    // D -> VIP & Target. Keep.

    const expectedRemove = [
      { uri: 'spotify:track:B' },
      { uri: 'spotify:track:C' },
      { uri: 'spotify:track:E' }
    ];
    expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledWith(
      playlistId,
      expectedRemove
    );

    // 2. Reorder Logic
    // Remaining Skeleton: [A, D].
    // Target Backbone: [A, D].
    // Already sorted. Should NOT call reorder.
    expect(mockSpotifyApi.reorderTracksInPlaylist).not.toHaveBeenCalled();

    // 3. Insert Logic
    // Insert [X, Y] at index 1 (After A).
    // Insert [Z] after D.
    // Logic:
    // i=0: A (VIP). Pointer 0 -> 1.
    // i=1: X (Non). Pending [X].
    // i=2: Y (Non). Pending [X, Y].
    // i=3: D (VIP). Flush [X, Y] at 1. Pointer 1 -> 3. Pointer 3 -> 4.
    // i=4: Z (Non). Pending [Z].
    // End. Flush [Z] at 4.

    expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenNthCalledWith(
      1,
      playlistId,
      ['spotify:track:X', 'spotify:track:Y'],
      { position: 1 }
    );
    expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenNthCalledWith(
      2,
      playlistId,
      ['spotify:track:Z'],
      { position: 4 }
    );
  });

  it('should reorder VIPs if they are out of order in skeleton', async () => {
    // Setup: Current [D(vip), A(vip)]. Target [A(vip), D(vip)].
    const playlistId = 'test-playlist-reorder';
    const vipUris = ['spotify:track:A', 'spotify:track:D'];

    const currentTracks = [
      {
        track: { uri: 'spotify:track:D', name: 'D', artists: [], id: '4', type: 'track' },
        added_at: '2023-01-01'
      },
      {
        track: { uri: 'spotify:track:A', name: 'A', artists: [], id: '1', type: 'track' },
        added_at: '2023-01-01'
      }
    ];

    mockSpotifyApi.getPlaylistTracks.mockResolvedValue({
      body: { items: currentTracks }
    } as any);

    const targetOrderedUris = ['spotify:track:A', 'spotify:track:D'];

    mockSpotifyApi.reorderTracksInPlaylist.mockResolvedValue({
      body: { snapshot_id: 'snap2' }
    } as any);

    await spotifyService.performSmartUpdate(playlistId, [], [], targetOrderedUris, false, vipUris);

    // 1. Remove: Nothing to remove.
    expect(mockSpotifyApi.removeTracksFromPlaylist).not.toHaveBeenCalled();

    // 2. Reorder: Skeleton [D, A]. Target [A, D].
    // i=0. Target A. Skeleton[0] = D. Mismatch.
    // Index of A in skeleton is 1.
    // Move 1 -> 0.
    expect(mockSpotifyApi.reorderTracksInPlaylist).toHaveBeenCalledWith(
      playlistId,
      1,
      0,
      expect.any(Object)
    );
  });
});
