import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../src/config/firebase';
import { SpotifyService } from '../../src/services/spotify-service';
import { ConfigService } from '../../src/services/config-service';

// Mock Dependencies
vi.mock('../../src/services/spotify-service');
vi.mock('../../src/services/ai-service');
vi.mock('../../src/core/track-cleaner');
vi.mock('../../src/services/firestore-logger');

// We need to mock ConfigService to control the "Enabled Playlists" return
vi.mock('../../src/services/config-service');

describe('Multi-Tenancy Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process two users with different tokens sequentially', async () => {
    // 1. Setup Mock data
    const mockUserA = { uid: 'user-a', token: 'token-a', playlistId: 'playlist-a' };
    const mockUserB = { uid: 'user-b', token: 'token-b', playlistId: 'playlist-b' };

    // 2. Mock ConfigService
    const mockConfigs = [
      {
        id: mockUserA.playlistId,
        name: 'Playlist A',
        ownerId: mockUserA.uid,
        enabled: true,
        settings: {},
        aiGeneration: {},
        curationRules: {}
      },
      {
        id: mockUserB.playlistId,
        name: 'Playlist B',
        ownerId: mockUserB.uid,
        enabled: true,
        settings: {},
        aiGeneration: {},
        curationRules: {}
      }
    ];

    (
      ConfigService.prototype.getEnabledPlaylists as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockConfigs);

    // 3. Mock Firestore Secrets Fetch
    const mockGet = vi.fn().mockImplementation((path: string) => {
      const pathA = `users/${mockUserA.uid}/secrets/spotify`;
      const pathB = `users/${mockUserB.uid}/secrets/spotify`;

      if (path === pathA) {
        return Promise.resolve({
          exists: true,
          data: () => ({ refreshToken: mockUserA.token, status: 'valid' })
        });
      }
      if (path === pathB) {
        return Promise.resolve({
          exists: true,
          data: () => ({ refreshToken: mockUserB.token, status: 'valid' })
        });
      }
      return Promise.resolve({ exists: false });
    });

    const mockSet = vi.fn();

    (db.doc as unknown) = vi.fn((path: string) => ({
      get: () => mockGet(path),
      set: mockSet
    }));

    // 4. Mock SpotifyService Factory
    const mockSpotifyInstance = {
      getPlaylistTracks: vi.fn().mockResolvedValue([]),
      getPlaylistMetadata: vi.fn().mockResolvedValue({}),
      searchTrack: vi.fn(),
      getTracks: vi.fn(),
      performSmartUpdate: vi.fn()
    };
    (SpotifyService.createForUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSpotifyInstance
    );

    // 5. Run the logic
    // @ts-expect-error - Dynamic import of function entry point
    const { runOrchestrator } = await import('../../src/index');

    await runOrchestrator();

    // 6. Assertions
    const mockCreateForUser = SpotifyService.createForUser as unknown as ReturnType<typeof vi.fn>;
    const calls = mockCreateForUser.mock.calls;

    // Verify tokens were used.
    // We expect 2 distinct tokens to have been used in the factory.
    const tokens = calls.map((c: unknown[]) => c[0]);
    expect(tokens).toContain(mockUserA.token);
    expect(tokens).toContain(mockUserB.token);
  }, 10000);
});
