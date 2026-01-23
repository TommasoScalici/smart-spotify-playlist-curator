import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SpotifyService } from '../../src/services/spotify-service';
import { AiService } from '../../src/services/ai-service';
import { SlotManager } from '../../src/core/slot-manager';
import { FirestoreLogger } from '../../src/services/firestore-logger';
import { PlaylistConfig } from '@smart-spotify-curator/shared';

// Mock dependencies
vi.mock('../../src/services/spotify-service');
vi.mock('../../src/services/ai-service');
vi.mock('../../src/core/slot-manager');
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
    performSmartUpdate: ReturnType<typeof vi.fn>;
  };
  let mockAiService: {
    generateSuggestions: ReturnType<typeof vi.fn>;
  };
  let mockSlotManager: {
    shuffleWithRules: ReturnType<typeof vi.fn>;
  };
  let mockFirestoreLogger: {
    logActivity: ReturnType<typeof vi.fn>;
    pruneOldLogs: ReturnType<typeof vi.fn>;
    updateCurationStatus: ReturnType<typeof vi.fn>;
  };

  const mockConfig: PlaylistConfig = {
    id: 'spotify:playlist:test-playlist',
    name: 'Test Playlist',
    enabled: true,
    ownerId: 'test-user-123',
    settings: {
      targetTotalTracks: 10,
      description: 'Test',
      allowExplicit: true,
      referenceArtists: []
    },
    aiGeneration: {
      enabled: true,
      tracksToAdd: 10,
      model: 'gemini',
      temperature: 0.7
    },
    curationRules: {
      maxTrackAgeDays: 30,
      removeDuplicates: true,
      maxTracksPerArtist: 2
    },
    mandatoryTracks: []
  };

  beforeEach(() => {
    mockSpotifyService = {
      getPlaylistTracks: vi.fn(),
      getPlaylistMetadata: vi.fn(),
      searchTrack: vi.fn(),
      performSmartUpdate: vi.fn()
    };
    mockAiService = {
      generateSuggestions: vi.fn()
    };
    mockSlotManager = {
      shuffleWithRules: vi.fn()
    };
    mockFirestoreLogger = {
      logActivity: vi.fn(),
      pruneOldLogs: vi.fn(),
      updateCurationStatus: vi.fn()
    };

    orchestrator = new PlaylistOrchestrator(
      mockAiService as unknown as AiService,
      mockSlotManager as unknown as SlotManager,
      mockFirestoreLogger as unknown as FirestoreLogger
    );

    // Default mocks
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockSpotifyService.getPlaylistMetadata.mockResolvedValue({
      imageUrl: 'http://test-image.com/img.jpg',
      owner: 'Test Owner'
    });
    mockAiService.generateSuggestions.mockResolvedValue([{ artist: 'Artist A', track: 'Track B' }]);

    // Default: Mock search for AI suggestions
    mockSpotifyService.searchTrack.mockResolvedValue({
      uri: 'spotify:track:new-ai-uri',
      artist: 'Artist A',
      name: 'Track B',
      addedAt: new Date().toISOString()
    });

    mockSlotManager.shuffleWithRules.mockReturnValue(['spotify:track:uri1', 'spotify:track:uri2']);
  });

  it('Path 1: Full Flow (Empty Playlist -> AI Generation)', async () => {
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);

    // AI Returns 2 tracks
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', track: 'Track A' },
      { artist: 'Artist B', track: 'Track B' }
    ]);

    // Search resolves them
    mockSpotifyService.searchTrack
      .mockResolvedValueOnce({
        uri: 'spotify:track:A',
        artist: 'Artist A',
        name: 'Track A',
        addedAt: ''
      })
      .mockResolvedValueOnce({
        uri: 'spotify:track:B',
        artist: 'Artist B',
        name: 'Track B',
        addedAt: ''
      });

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object), // config
      expect.any(String), // prompt
      15, // tracksToAdd count (10 + 5 buffer)
      expect.any(Array) // exclusion list
    );

    // Expect Shuffle with consolidated list
    expect(mockSlotManager.shuffleWithRules).toHaveBeenCalled();

    // Expect Update
    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalled();
  });

  it('Path 2: Age Verification (Removes Old Tracks)', async () => {
    // Config: 30 days max
    const now = new Date();
    const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago (Old)
    const newDate = new Date(); // Now (Fresh)

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([
      { uri: 'spotify:track:old', name: 'Old', artist: 'A', addedAt: oldDate.toISOString() },
      { uri: 'spotify:track:new', name: 'New', artist: 'B', addedAt: newDate.toISOString() }
    ]);

    // Disable AI for clarity
    const config = { ...mockConfig, aiGeneration: { ...mockConfig.aiGeneration, enabled: false } };

    await orchestrator.curatePlaylist(config, mockSpotifyService as unknown as SpotifyService);

    // Only "new" track should reach the shuffler
    expect(mockSlotManager.shuffleWithRules).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ uri: 'spotify:track:new' })])
    );

    // "old" track should NOT be present
    expect(mockSlotManager.shuffleWithRules).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ uri: 'spotify:track:old' })])
    );
  });

  it('Dry Run: Should propagate flag and likely not update logs/lastCuratedAt (logic dependent)', async () => {
    const dryRunConfig = { ...mockConfig, dryRun: true };

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockAiService.generateSuggestions.mockResolvedValue([]);
    mockSlotManager.shuffleWithRules.mockReturnValue(['uri1', 'uri2']);

    await orchestrator.curatePlaylist(
      dryRunConfig,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      true, // dryRun check
      expect.any(Array)
    );

    // Verify status update includes dryRun flag
    expect(mockFirestoreLogger.updateCurationStatus).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ isDryRun: true })
    );
  });
});
