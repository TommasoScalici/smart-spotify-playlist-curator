import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SpotifyService } from '../../src/services/spotify-service';
import { AiService } from '../../src/services/ai-service';
import { TrackCleaner } from '../../src/core/track-cleaner';
import { SlotManager } from '../../src/core/slot-manager';
import { FirestoreLogger } from '../../src/services/firestore-logger';
import { PlaylistConfig } from '@smart-spotify-curator/shared';

// Mock dependencies
vi.mock('../../src/services/spotify-service');
vi.mock('../../src/services/ai-service');
vi.mock('../../src/core/track-cleaner');
vi.mock('../../src/core/slot-manager');
vi.mock('../../src/services/firestore-logger');
vi.mock('../../src/services/firestore-logger');
vi.mock('../../src/config/firebase', () => ({
  db: {
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ refreshToken: 'mock-refresh-token' })
      }),
      update: vi.fn().mockResolvedValue(undefined)
    })),
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        update: vi.fn().mockResolvedValue(undefined)
      }))
    }))
  }
}));

describe('PlaylistOrchestrator', () => {
  let orchestrator: PlaylistOrchestrator;
  let mockSpotifyService: {
    getPlaylistTracks: ReturnType<typeof vi.fn>;
    getPlaylistMetadata: ReturnType<typeof vi.fn>;
    searchTrack: ReturnType<typeof vi.fn>;
    getTracks: ReturnType<typeof vi.fn>;
    performSmartUpdate: ReturnType<typeof vi.fn>;
  };
  let mockAiService: {
    generateSuggestions: ReturnType<typeof vi.fn>;
  };
  let mockTrackCleaner: {
    processCurrentTracks: ReturnType<typeof vi.fn>;
  };
  let mockSlotManager: {
    arrangePlaylist: ReturnType<typeof vi.fn>;
  };
  let mockFirestoreLogger: {
    logActivity: ReturnType<typeof vi.fn>;
    pruneOldLogs: ReturnType<typeof vi.fn>;
    updateCurationStatus: ReturnType<typeof vi.fn>;
  };

  // Type casting to Bypass strict partial matching for test config
  const mockConfig: PlaylistConfig = {
    id: 'test-playlist',
    name: 'Test Playlist',
    enabled: true,
    ownerId: 'test-user-123', // Required for security: orchestrator fetches user's Spotify token
    settings: { targetTotalTracks: 50 },
    aiGeneration: { overfetchRatio: 2.0 },
    curationRules: { maxTrackAgeDays: 30, removeDuplicates: true },
    mandatoryTracks: []
  } as unknown as PlaylistConfig;

  beforeEach(() => {
    mockSpotifyService = {
      getPlaylistTracks: vi.fn(),
      getPlaylistMetadata: vi.fn(),
      searchTrack: vi.fn(),
      getTracks: vi.fn(),
      performSmartUpdate: vi.fn()
    };
    mockAiService = {
      generateSuggestions: vi.fn()
    };
    mockTrackCleaner = {
      processCurrentTracks: vi.fn()
    };
    mockSlotManager = {
      arrangePlaylist: vi.fn()
    };
    mockFirestoreLogger = {
      logActivity: vi.fn(),
      pruneOldLogs: vi.fn(),
      updateCurationStatus: vi.fn()
    };

    // Mock SpotifyService.createForUser to return our mock service
    // vi.mocked(SpotifyService.createForUser).mockReturnValue(
    //   mockSpotifyService as unknown as SpotifyService
    // );

    orchestrator = new PlaylistOrchestrator(
      mockAiService as unknown as AiService,
      mockTrackCleaner as unknown as TrackCleaner,
      mockSlotManager as unknown as SlotManager,
      mockFirestoreLogger as unknown as FirestoreLogger
    );

    // Default mocks
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockSpotifyService.searchTrack.mockResolvedValue({
      uri: 'spotify:track:new-ai-uri',
      artist: 'A',
      name: 'N',
      addedAt: ''
    });
    mockSpotifyService.getPlaylistMetadata.mockResolvedValue({
      imageUrl: 'http://test-image.com/img.jpg',
      owner: 'Test Owner'
    });
    mockSpotifyService.getTracks.mockResolvedValue([]); // Default empty
    mockAiService.generateSuggestions.mockResolvedValue([{ artist: 'A', track: 'B' }]);
    mockSlotManager.arrangePlaylist.mockReturnValue(['uri1', 'uri2']);
  });

  it('Path 1: Empty Playlist', async () => {
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: [],
      tracksToRemove: [],
      slotsNeeded: 50
    });

    // Mock AI Metadata Fetch
    mockSpotifyService.getTracks.mockResolvedValue([
      {
        uri: 'spotify:track:new-ai-uri',
        artist: 'Artist A',
        name: 'Track A',
        addedAt: ''
      }
    ]);

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object), // config
      expect.any(String), // generated prompt
      105, // count
      expect.any(Array) // excludedTracks
    );
  });

  it('Path 2: Under Target', async () => {
    // 30 tracks existing (under 50)
    mockSpotifyService.getPlaylistTracks.mockResolvedValue(
      new Array(30).fill({
        uri: 'uri',
        addedAt: 'timestamp',
        artist: 'Artist Existing'
      })
    );

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: new Array(30).fill({ uri: 'uri', artist: 'Artist Existing' }),
      tracksToRemove: [],
      slotsNeeded: 20
    });

    mockSpotifyService.getTracks.mockResolvedValue(
      new Array(20).fill({ uri: 'ai-uri', artist: 'AI Artist' })
    );

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalled();
    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object), // config
      expect.any(String), // generated prompt
      45, // count
      expect.any(Array) // excludedTracks
    );
  });

  it('Path 3: Over Target (Aggressive Clean)', async () => {
    // 60 tracks existing
    mockSpotifyService.getPlaylistTracks.mockResolvedValue(
      new Array(60).fill({
        uri: 'uri',
        addedAt: 'timestamp',
        artist: 'Artist'
      })
    );

    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: new Array(35).fill({ uri: 'uri', artist: 'Survivor' }),
      tracksToRemove: ['removed-uri'],
      slotsNeeded: 0
    });

    mockSpotifyService.getTracks.mockResolvedValue([]);

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockTrackCleaner.processCurrentTracks).toHaveBeenCalledWith(
      expect.any(Array),
      mockConfig,
      expect.any(Array),
      35
    );

    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object), // config
      expect.any(String), // generated prompt
      35, // count
      expect.any(Array) // excludedTracks
    );
  });
  it('Dry Run: Should propagate flag and not modify state', async () => {
    const dryRunConfig = { ...mockConfig, dryRun: true };

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockTrackCleaner.processCurrentTracks.mockReturnValue({
      keptTracks: [],
      tracksToRemove: [],
      slotsNeeded: 10
    });
    mockAiService.generateSuggestions.mockResolvedValue([]);
    mockSlotManager.arrangePlaylist.mockReturnValue(['uri1', 'uri2']);

    await orchestrator.curatePlaylist(
      dryRunConfig,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(mockFirestoreLogger.updateCurationStatus).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        isDryRun: true,
        diff: expect.objectContaining({ added: expect.any(Array), removed: expect.any(Array) })
      })
    );

    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      true, // dryRun check
      expect.any(Array)
    );
  });
});
