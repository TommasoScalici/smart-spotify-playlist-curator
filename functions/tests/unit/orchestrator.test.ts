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
    arrangePlaylist: ReturnType<typeof vi.fn>;
  };
  let mockFirestoreLogger: {
    logActivity: ReturnType<typeof vi.fn>;
    pruneOldLogs: ReturnType<typeof vi.fn>;
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
      maxTracksPerArtist: 2,
      shuffleAtEnd: true
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
      arrangePlaylist: vi.fn()
    };
    mockFirestoreLogger = {
      logActivity: vi.fn().mockResolvedValue('mock-log-id'),
      pruneOldLogs: vi.fn()
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
      album: 'Album B',
      addedAt: new Date().toISOString()
    });

    mockSlotManager.arrangePlaylist.mockReturnValue(['spotify:track:uri1', 'spotify:track:uri2']);
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
        album: 'Album A',
        addedAt: ''
      })
      .mockResolvedValueOnce({
        uri: 'spotify:track:B',
        artist: 'Artist B',
        name: 'Track B',
        album: 'Album B',
        addedAt: ''
      });

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object), // config
      expect.any(String), // prompt
      15, // tracksToAdd count (10 + 5 buffer)
      expect.any(Array) // exclusion list
    );

    // Expect Arrange with consolidated list
    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalled();

    // Expect Update
    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalled();
  });

  it('Path 1b: Deduplication Logic (Title Tracks & Identical Tuples)', async () => {
    // Scenario:
    // 1. "Bad Company" (Bad Company, Bad Company) -> Title Track (Should Keep)
    // 2. "Bad Company" (Bad Company, Bad Company) -> EXACT Duplicate (Should Remove)
    // 3. "Different" (Bad Company, Bad Company) -> Same Artist/Album, Diff Name (Should Keep)
    // 4. "Same Name" (Different Artist, Album X) -> Same Name, Diff Artist (Should Keep)

    const now = new Date();
    const tracks = [
      {
        uri: 'uri:1',
        name: 'Bad Company',
        artist: 'Bad Company',
        album: 'Bad Company',
        addedAt: now.toISOString()
      },
      {
        uri: 'uri:2',
        name: 'Bad Company',
        artist: 'Bad Company',
        album: 'Bad Company',
        addedAt: now.toISOString()
      }, // Dupe
      {
        uri: 'uri:3',
        name: 'Different',
        artist: 'Bad Company',
        album: 'Bad Company',
        addedAt: now.toISOString()
      },
      {
        uri: 'uri:4',
        name: 'Bad Company',
        artist: 'Other Artist',
        album: 'Other Album',
        addedAt: now.toISOString()
      }
    ];

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(tracks);

    // AI/SlotManager mocks to return simple pass-through
    mockSlotManager.arrangePlaylist.mockImplementation((_, survivors) =>
      survivors.map((t: { uri: string }) => t.uri)
    );

    await orchestrator.curatePlaylist(mockConfig, mockSpotifyService as unknown as SpotifyService);

    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.arrayContaining([
        expect.objectContaining({ uri: 'uri:1' }),
        expect.objectContaining({ uri: 'uri:3' }),
        expect.objectContaining({ uri: 'uri:4' })
      ]),
      expect.any(Array),
      expect.any(Number),
      true
    );

    // Verify uri:2 is NOT in survivors
    const survivorsArg = mockSlotManager.arrangePlaylist.mock.calls[0][1];
    expect(survivorsArg).not.toContainEqual(expect.objectContaining({ uri: 'uri:2' }));
  });

  it('Path 2: Age Verification (Removes Old Tracks)', async () => {
    // Config: 30 days max
    const now = new Date();
    const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago (Old)
    const newDate = new Date(); // Now (Fresh)

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([
      {
        uri: 'spotify:track:old',
        name: 'Old',
        artist: 'A',
        album: 'Album A',
        addedAt: oldDate.toISOString()
      },
      {
        uri: 'spotify:track:new',
        name: 'New',
        artist: 'B',
        album: 'Album B',
        addedAt: newDate.toISOString()
      }
    ]);

    // Disable AI for clarity
    const config = { ...mockConfig, aiGeneration: { ...mockConfig.aiGeneration, enabled: false } };

    await orchestrator.curatePlaylist(config, mockSpotifyService as unknown as SpotifyService);

    // Only "new" track should reach the arranger
    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array), // mandatory
      expect.arrayContaining([expect.objectContaining({ uri: 'spotify:track:new' })]),
      expect.any(Array), // ai
      expect.any(Number), // total
      true // shuffleAtEnd
    );

    // "old" track should NOT be present in survivors
    const survivorsArg = mockSlotManager.arrangePlaylist.mock.calls[0][1];
    expect(survivorsArg).not.toContainEqual(expect.objectContaining({ uri: 'spotify:track:old' }));
  });

  it('Dry Run: Should propagate flag and likely not update logs/lastCuratedAt (logic dependent)', async () => {
    const dryRunConfig = { ...mockConfig, dryRun: true };

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockAiService.generateSuggestions.mockResolvedValue([]);
    mockSlotManager.arrangePlaylist.mockReturnValue(['uri1', 'uri2']);

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

    // Verify status update includes dryRun flag via logActivity
    expect(mockFirestoreLogger.logActivity).toHaveBeenCalledWith(
      expect.any(String),
      'running',
      expect.any(String),
      expect.objectContaining({ dryRun: true })
    );
  });
});
