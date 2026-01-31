import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaylistConfig } from '@smart-spotify-curator/shared';

import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SlotManager } from '../../src/core/slot-manager';
import { TrackCleaner } from '../../src/core/track-cleaner';
import { AiService } from '../../src/services/ai-service';
import { FirestoreLogger } from '../../src/services/firestore-logger';
import { SpotifyService } from '../../src/services/spotify-service';

// Mock dependencies
vi.mock('../../src/services/spotify-service');
vi.mock('../../src/services/ai-service');
vi.mock('../../src/core/slot-manager');
vi.mock('../../src/services/firestore-logger');

interface MockSpotifyService {
  getPlaylistTracks: ReturnType<typeof vi.fn>;
  searchTrack: ReturnType<typeof vi.fn>;
  performSmartUpdate: ReturnType<typeof vi.fn>;
}

interface MockAiService {
  generateSuggestions: ReturnType<typeof vi.fn>;
}

interface MockSlotManager {
  arrangePlaylist: ReturnType<typeof vi.fn>;
}

interface MockFirestoreLogger {
  logActivity: ReturnType<typeof vi.fn>;
}

describe('PlaylistOrchestrator Edge Cases', () => {
  let orchestrator: PlaylistOrchestrator;
  let mockSpotifyService: MockSpotifyService;
  let mockAiService: MockAiService;
  let mockSlotManager: MockSlotManager;
  let mockFirestoreLogger: MockFirestoreLogger;

  const mockConfig: PlaylistConfig = {
    id: 'spotify:playlist:test',
    name: 'Test Playlist',
    ownerId: 'user1',
    enabled: true,
    settings: { targetTotalTracks: 5, description: '', referenceArtists: [] },
    aiGeneration: { enabled: true, tracksToAdd: 5, model: 'gemini', temperature: 0.7 },
    curationRules: {
      maxTrackAgeDays: 30,
      removeDuplicates: true,
      maxTracksPerArtist: 1,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    mandatoryTracks: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpotifyService = {
      getPlaylistTracks: vi.fn().mockResolvedValue([]),
      searchTrack: vi.fn(),
      performSmartUpdate: vi.fn().mockResolvedValue(undefined)
    };
    mockAiService = {
      generateSuggestions: vi.fn()
    };
    mockSlotManager = {
      arrangePlaylist: vi
        .fn()
        .mockImplementation((_, survivors, ai) =>
          (survivors as { uri: string }[]).concat(ai as { uri: string }[]).map((t) => t.uri)
        )
    };
    mockFirestoreLogger = {
      logActivity: vi.fn().mockResolvedValue('log-id')
    };

    orchestrator = new PlaylistOrchestrator(
      mockAiService as unknown as AiService,
      mockSlotManager as unknown as SlotManager,
      new TrackCleaner(),
      mockFirestoreLogger as unknown as FirestoreLogger
    );
  });

  it('should handle partial search failures (one track fails, others succeed)', async () => {
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', track: 'Track A' },
      { artist: 'Artist B', track: 'Track B' }
    ]);

    // First search fails (null), second succeeds
    mockSpotifyService.searchTrack.mockResolvedValueOnce(null).mockResolvedValueOnce({
      uri: 'uri:B',
      artist: 'Artist B',
      name: 'Track B',
      popularity: 50
    });

    await orchestrator.curatePlaylist(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockSpotifyService.searchTrack).toHaveBeenCalledTimes(2);
    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.arrayContaining([expect.objectContaining({ uri: 'uri:B' })]),
      5,
      true,
      'drop_random'
    );
  });

  it('should handle AI returning zero suggestions', async () => {
    mockAiService.generateSuggestions.mockResolvedValue([]);

    await orchestrator.curatePlaylist(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockSpotifyService.searchTrack).not.toHaveBeenCalled();
    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      [],
      5,
      true,
      'drop_random'
    );
  });

  it('should respect artist limits during AI search', async () => {
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', track: 'Track A1' },
      { artist: 'Artist A', track: 'Track A2' }
    ]);

    mockSpotifyService.searchTrack
      .mockResolvedValueOnce({
        uri: 'uri:A1',
        artist: 'Artist A',
        name: 'Track A1',
        popularity: 50
      })
      .mockResolvedValueOnce({
        uri: 'uri:A2',
        artist: 'Artist A',
        name: 'Track A2',
        popularity: 60
      });

    await orchestrator.curatePlaylist(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    const aiTracks = mockSlotManager.arrangePlaylist.mock.calls[0][2] as { artist: string }[];
    expect(aiTracks.filter((t) => t.artist === 'Artist A')).toHaveLength(1);
  });

  it('should handle API exceptions and log them', async () => {
    mockSpotifyService.getPlaylistTracks.mockRejectedValue(new Error('API Failure'));

    await expect(
      orchestrator.curatePlaylist(
        mockConfig,
        mockSpotifyService as unknown as SpotifyService,
        false
      )
    ).rejects.toThrow('API Failure');

    expect(mockFirestoreLogger.logActivity).toHaveBeenCalledWith(
      'user1',
      'error',
      expect.any(String),
      expect.objectContaining({ error: 'API Failure' }),
      'log-id'
    );
  });
});
