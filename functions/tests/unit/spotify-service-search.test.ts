import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    getPlaylistItems: vi.fn()
  },
  currentUser: {
    profile: vi.fn(),
    playlists: { playlists: vi.fn() }
  },
  search: vi.fn(),
  tracks: { get: vi.fn() }
  // Add other methods if needed by constructor or ensureAccessToken init
};

vi.mock('@spotify/web-api-ts-sdk', () => {
  return {
    SpotifyApi: {
      withAccessToken: vi.fn(() => mockSpotifyInstance)
    }
  };
});

describe('SpotifyService Search Optimization', () => {
  let service: SpotifyService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful refresh logic
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'refreshed-token',
        expires_in: 3600,
        refresh_token: 'new-refresh'
      })
    } as unknown as Response);

    service = new SpotifyService('mock-refresh-token');

    // Mock getMe for User ID check
    mockSpotifyInstance.currentUser.profile.mockResolvedValue({ id: 'test-user-id' });

    // Mock valid token to avoid refresh logic complexity in this specific test suite
    service.setTokens('valid-token', 'refresh-token', 3600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch all playlists in parallel chunks when user has > 50 playlists', async () => {
    const totalPlaylists = 130; // Expect: 1 sequential (0-50) + 2 parallel (50-100, 100-130)

    // Mock sequential first page
    mockSpotifyInstance.currentUser.playlists.playlists.mockResolvedValueOnce({
      total: totalPlaylists,
      items: Array(50)
        .fill(null)
        .map((_, i) => ({
          uri: `spotify:playlist:${i}`,
          name: `Playlist ${i}`,
          owner: { id: 'test-user-id', display_name: 'Test User' },
          description: '',
          images: []
        }))
    });

    // Mock the parallel calls (order not guaranteed, so we mock implementation or return generic filtered)
    // We expect calls with offset 50 and 100.
    mockSpotifyInstance.currentUser.playlists.playlists.mockImplementation(
      async (limit, offset) => {
        if (offset === 0) return { total: 0, items: [] }; // Handle unexpected reentry if any

        const count = Math.min(limit, totalPlaylists - offset);
        return {
          items: Array(count)
            .fill(null)
            .map((_, i) => ({
              uri: `spotify:playlist:${offset + i}`,
              name: `Playlist ${offset + i}`,
              owner: { id: 'test-user-id', display_name: 'Test User' },
              description: '',
              images: []
            }))
        };
      }
    );

    const results = await service.getUserPlaylists();

    expect(results).toHaveLength(totalPlaylists);

    // 1 call for first page + 2 calls for remaining pages (50-100, 100-130)
    // The first call was mocked with `mockResolvedValueOnce`
    // The subsequent calls fell through to `mockImplementation`
    expect(mockSpotifyInstance.currentUser.playlists.playlists).toHaveBeenCalledTimes(3);

    // Verify parallel execution?
    // Hard to strictly verify parallelism in unit test without delays,
    // but we can verify all offsets were requested.
    expect(mockSpotifyInstance.currentUser.playlists.playlists).toHaveBeenCalledWith(50, 0);
    expect(mockSpotifyInstance.currentUser.playlists.playlists).toHaveBeenCalledWith(50, 50);
    expect(mockSpotifyInstance.currentUser.playlists.playlists).toHaveBeenCalledWith(50, 100);
  });

  it('should search and filter locally correctly', async () => {
    // Setup 2 playlists: 1 matching, 1 not
    mockSpotifyInstance.currentUser.playlists.playlists.mockResolvedValueOnce({
      total: 2,
      items: [
        {
          uri: 'uri:1',
          name: 'Rock Classics',
          owner: { id: 'test-user-id', display_name: 'Me' },
          description: 'Best of Rock',
          images: []
        },
        {
          uri: 'uri:2',
          name: 'Jazz Vibes',
          owner: { id: 'test-user-id', display_name: 'Me' },
          description: 'Smooth Jazz',
          images: []
        }
      ]
    });

    const searchResults = await service.searchUserPlaylists('Rock');

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].name).toBe('Rock Classics');
  });

  it('should respect the maxPlaylists hard limit to prevent abuse', async () => {
    // Mock a HUGE number of playlists reported by API
    mockSpotifyInstance.currentUser.playlists.playlists.mockResolvedValueOnce({
      total: 10000,
      items: Array(50)
        .fill(null)
        .map((_, i) => ({
          uri: `spotify:playlist:${i}`,
          name: `Playlist ${i}`,
          owner: { id: 'test-user-id', display_name: 'Test User' },
          description: '',
          images: []
        }))
    });

    // Mock subsequent calls
    mockSpotifyInstance.currentUser.playlists.playlists.mockResolvedValue({ items: [] });

    await service.getUserPlaylists();

    // Max limit is 500.
    // Page 1 (0-50). Remaining 450.
    // 450 / 50 = 9 more calls.
    // Total calls = 1 + 9 = 10.

    expect(mockSpotifyInstance.currentUser.playlists.playlists).toHaveBeenCalledTimes(10);
  });
});
