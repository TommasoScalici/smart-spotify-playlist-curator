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

// Create a shared mock instance
const mockSpotifyInstance = {
  playlists: {
    getPlaylistItems: vi.fn(),
    movePlaylistItems: vi.fn(),
    addItemsToPlaylist: vi.fn(),
    removeItemsFromPlaylist: vi.fn()
  },
  currentUser: {
    profile: vi.fn(),
    playlists: { playlists: vi.fn() }
  },
  tracks: { get: vi.fn() },
  search: vi.fn()
};

vi.mock('@spotify/web-api-ts-sdk', () => {
  return {
    SpotifyApi: {
      withAccessToken: vi.fn(() => mockSpotifyInstance)
    }
  };
});

describe('SpotifyService Retry Logic', () => {
  let service: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful refresh logic by default to avoid EnsureAccessToken failing tests
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'refreshed-token',
        expires_in: 3600,
        refresh_token: 'new-refresh'
      })
    } as unknown as Response);

    service = new SpotifyService('mock-refresh-token');

    // Stub delay to avoid waiting
    // We can't spyOn private delay easily, but we can rely on Vitest timers or just let it promise-resolve fast?
    // The service has `private delay(ms)`.
    // Tests might be slow if we don't mock timers.
    // Hack: override delay on the instance
    // Use a type cast to access the private delay method for testing purposes
    (service as unknown as { delay: (ms: number) => Promise<void> }).delay = vi
      .fn()
      .mockResolvedValue(undefined);

    // Force token expiration to 0 to trigger ensureAccessToken -> refresh
    // Or set it to valid to skip refresh?
    // Retry tests usually check "refresh on 401" so we need control.
    // By default, constructor sets expiration to 0? No, sets to 0 epoch?
    // Constructor: this.tokenExpirationEpoch = 0 (implied init).
    // So first call triggers refresh.
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry on 429 Rate Limit', async () => {
    // 1. First call (ensureAccessToken) -> Refresh (succeeds via global.fetch mock)

    // 2. getPlaylistTracks -> 429
    const error429 = { status: 429, headers: { get: () => '1' } };
    mockSpotifyInstance.playlists.getPlaylistItems.mockRejectedValueOnce(error429);

    // 3. Retry -> Success
    mockSpotifyInstance.playlists.getPlaylistItems.mockResolvedValueOnce({ items: [] });

    await service.getPlaylistTracks('test-playlist');

    expect(mockSpotifyInstance.playlists.getPlaylistItems).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalled(); // Initial refresh
  });

  it('should refresh token and retry on 401 Unauthorized', async () => {
    // 1. Initial refresh success (constructor epoch 0)

    // 2. Call fails with 401
    const error401 = { status: 401 };
    mockSpotifyInstance.playlists.getPlaylistItems.mockRejectedValueOnce(error401);

    // 3. Code should trigger REFRESH (ensureAccessToken) again
    // 4. Retry -> Success
    mockSpotifyInstance.playlists.getPlaylistItems.mockResolvedValueOnce({ items: [] });

    await service.getPlaylistTracks('test-playlist');

    expect(global.fetch).toHaveBeenCalledTimes(2); // Initial init + 401 recovery
    expect(mockSpotifyInstance.playlists.getPlaylistItems).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    // 1. Initial refresh success

    // 2. Fail consistently
    const error500 = { status: 500, message: 'Server Error' };
    mockSpotifyInstance.playlists.getPlaylistItems.mockRejectedValue(error500);

    await expect(service.getPlaylistTracks('test-playlist')).rejects.toMatchObject({ status: 500 });

    // Initial + 3 retries = 4
    expect(mockSpotifyInstance.playlists.getPlaylistItems).toHaveBeenCalledTimes(4);
  });
});
