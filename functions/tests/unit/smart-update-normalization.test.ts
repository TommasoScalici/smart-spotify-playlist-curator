import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpotifyPlaylistManager } from '../../src/services/spotify/spotify-playlist-manager';

describe('SpotifyPlaylistManager: Smart Update Normalization', () => {
  let manager: SpotifyPlaylistManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSpotify: any;

  beforeEach(() => {
    mockSpotify = {
      playlists: {
        addItemsToPlaylist: vi.fn(),
        getPlaylistItems: vi.fn(),
        movePlaylistItems: vi.fn(),
        removeItemsFromPlaylist: vi.fn()
      }
    };
    manager = new SpotifyPlaylistManager(mockSpotify as unknown as SpotifyApi);
  });

  it('should correctly identify and reorder tracks despite casing differences', async () => {
    const playlistId = 'test-id';

    // Existing tracks in playlist (with varying casing from Spotify)
    const currentItems = {
      items: [
        { track: { uri: 'Spotify:Track:TrackA' } },
        { track: { uri: 'spotify:track:TrackB' } },
        { track: { uri: 'spotify:TRACK:TrackC' } }
      ],
      total: 3
    };

    mockSpotify.playlists.getPlaylistItems.mockResolvedValue(currentItems);

    // Target order (normalized to what we expect in config)
    const targetOrder = ['spotify:track:TrackC', 'spotify:track:TrackA', 'spotify:track:TrackB'];

    await manager.performSmartUpdate(playlistId, targetOrder);

    // 1. Should NOT have removed any tracks (Case-insensitive check)
    expect(mockSpotify.playlists.removeItemsFromPlaylist).not.toHaveBeenCalled();

    // 2. Should NOT have added any tracks
    expect(mockSpotify.playlists.addItemsToPlaylist).not.toHaveBeenCalled();

    // 3. Should have triggered MOVE operations
    // Initial: TrackA (0), TrackB (1), TrackC (2)
    // Target: TrackC (0), TrackA (1), TrackB (2)

    // First target: 'TrackC'. Found at actual index 2. Moved to 0.
    // Result after move: TrackC (0), TrackA (1), TrackB (2).

    expect(mockSpotify.playlists.movePlaylistItems).toHaveBeenCalledWith(playlistId, 2, 0, 1);
  });
});
