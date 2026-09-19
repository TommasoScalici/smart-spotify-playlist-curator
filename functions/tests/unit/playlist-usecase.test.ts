import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../src/admin/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../../src/core/auth-service.js';
import { PlaylistUseCase } from '../../src/core/playlist-usecase.js';

vi.mock('../../src/admin/firebase.js', () => ({
  db: {
    collection: vi.fn()
  }
}));

vi.mock('../../src/core/auth-service.js', () => ({
  getAuthorizedSpotifyService: vi.fn(),
  persistSpotifyTokens: vi.fn()
}));

describe('PlaylistUseCase: getMetrics', () => {
  const mockUid = 'user123';
  const mockPlaylistId = 'spotify:playlist:testPlaylistId';

  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockDoc: ReturnType<typeof vi.fn>;
  let mockService: {
    getLatestTrackAddedAt: ReturnType<typeof vi.fn>;
    getPlaylistDetails: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdate = vi.fn().mockResolvedValue(undefined);
    mockGet = vi.fn();
    mockDoc = vi.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate
    });

    const mockCollection = vi.fn().mockReturnValue({
      doc: mockDoc
    });

    (db.collection as ReturnType<typeof vi.fn>).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: mockCollection
      })
    });

    mockService = {
      getLatestTrackAddedAt: vi.fn().mockResolvedValue('2026-09-18T10:00:00.000Z'),
      getPlaylistDetails: vi.fn().mockResolvedValue({
        description: 'Updated description from Spotify',
        followers: 42,
        id: 'testPlaylistId',
        imageUrl: 'https://spotify.com/new-art.jpg',
        name: 'New Spotify Playlist Name',
        owner: 'Spotify User',
        totalTracks: 25
      })
    };

    (getAuthorizedSpotifyService as ReturnType<typeof vi.fn>).mockResolvedValue({
      originalRefreshToken: 'refresh123',
      service: mockService
    });
    (persistSpotifyTokens as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('syncs updated playlist name, image, and owner to Firestore if changed', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        imageUrl: 'https://spotify.com/old-art.jpg',
        lastCuratedAt: '2026-09-15T10:00:00.000Z',
        name: 'Old Playlist Name',
        owner: 'Old Owner'
      }),
      exists: true
    });

    const useCase = new PlaylistUseCase();
    const metrics = await useCase.getMetrics(mockUid, mockPlaylistId);

    expect(mockUpdate).toHaveBeenCalledWith({
      imageUrl: 'https://spotify.com/new-art.jpg',
      name: 'New Spotify Playlist Name',
      owner: 'Spotify User'
    });

    expect(metrics.name).toBe('New Spotify Playlist Name');
    expect(metrics.followers).toBe(42);
    expect(metrics.tracks).toBe(25);
  });

  it('does not trigger Firestore update if metadata is already identical', async () => {
    mockGet.mockResolvedValue({
      data: () => ({
        imageUrl: 'https://spotify.com/new-art.jpg',
        lastCuratedAt: '2026-09-15T10:00:00.000Z',
        name: 'New Spotify Playlist Name',
        owner: 'Spotify User'
      }),
      exists: true
    });

    const useCase = new PlaylistUseCase();
    const metrics = await useCase.getMetrics(mockUid, mockPlaylistId);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(metrics.name).toBe('New Spotify Playlist Name');
  });
});
