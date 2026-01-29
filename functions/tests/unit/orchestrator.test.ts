import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

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

// Mock DiffCalculator to avoid crash when mock data is inconsistent
vi.mock('../../src/core/diff-calculator', () => ({
  DiffCalculator: {
    calculate: vi.fn(() => ({
      added: [],
      removed: [],
      keptMandatory: []
    }))
  }
}));

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
  let mockSpotifyService: Mocked<SpotifyService>;
  let mockAiService: Mocked<AiService>;
  let mockSlotManager: Mocked<SlotManager>;
  let mockFirestoreLogger: Mocked<FirestoreLogger>;

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
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    mandatoryTracks: []
  };

  beforeEach(() => {
    mockSpotifyService = vi.mocked(new SpotifyService('mock-token'));
    mockAiService = vi.mocked(new AiService());
    mockSlotManager = vi.mocked(new SlotManager());
    mockFirestoreLogger = vi.mocked(new FirestoreLogger());

    orchestrator = new PlaylistOrchestrator(
      mockAiService,
      mockSlotManager,
      new TrackCleaner(),
      mockFirestoreLogger
    );

    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockSpotifyService.getPlaylistDetails.mockResolvedValue({
      id: 'test-playlist',
      name: 'Test Playlist',
      description: 'Test',
      followers: 100,
      totalTracks: 0,
      imageUrl: 'http://test-image.com/img.jpg',
      owner: 'Test Owner'
    });
    mockAiService.generateSuggestions.mockResolvedValue([{ artist: 'Artist A', track: 'Track B' }]);

    mockSpotifyService.searchTrack.mockResolvedValue({
      uri: 'spotify:track:new-ai-uri',
      artist: 'Artist A',
      name: 'Track B',
      album: 'Album B',
      addedAt: new Date().toISOString(),
      popularity: 50
    });

    mockSlotManager.arrangePlaylist.mockReturnValue(['spotify:track:uri1', 'spotify:track:uri2']);
  });

  it('Path 1: Full Flow (Empty Playlist -> AI Generation)', async () => {
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', track: 'Track A' },
      { artist: 'Artist B', track: 'Track B' }
    ]);

    mockSpotifyService.searchTrack
      .mockResolvedValueOnce({
        uri: 'spotify:track:A',
        artist: 'Artist A',
        name: 'Track A',
        album: 'Album A',
        addedAt: '',
        popularity: 50
      })
      .mockResolvedValueOnce({
        uri: 'spotify:track:B',
        artist: 'Artist B',
        name: 'Track B',
        album: 'Album B',
        addedAt: '',
        popularity: 60
      });

    await orchestrator.curatePlaylist(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockAiService.generateSuggestions).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      15,
      expect.any(Array)
    );
    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
      10,
      true,
      'drop_random'
    );
    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalled();
  });

  it('Path 1b: Deduplication Logic', async () => {
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
      },
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
    mockSlotManager.arrangePlaylist.mockImplementation((_, survivors) =>
      (survivors as { uri: string }[]).map((t) => t.uri)
    );

    await orchestrator.curatePlaylist(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.arrayContaining([
        expect.objectContaining({ uri: 'uri:1' }),
        expect.objectContaining({ uri: 'uri:3' }),
        expect.objectContaining({ uri: 'uri:4' })
      ]),
      expect.any(Array),
      expect.any(Number),
      true,
      'drop_random'
    );
  });

  it('Path 2: Age Verification', async () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const newDate = new Date();

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

    const config = { ...mockConfig, aiGeneration: { ...mockConfig.aiGeneration, enabled: false } };
    await orchestrator.curatePlaylist(
      config,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.arrayContaining([expect.objectContaining({ uri: 'spotify:track:new' })]),
      expect.any(Array),
      expect.any(Number),
      true,
      'drop_random'
    );
  });

  it('Path 4: Size Limit Truncation', async () => {
    // Config target is 5 tracks
    const limitConfig = {
      ...mockConfig,
      settings: { ...mockConfig.settings, targetTotalTracks: 5 }
    };

    // We have 10 tracks in the playlist
    const manyTracks = Array.from({ length: 10 }, (_, i) => ({
      uri: `uri:${i}`,
      name: `Track ${i}`,
      artist: `Artist ${i}`,
      album: `Album ${i}`,
      addedAt: new Date().toISOString(),
      popularity: 50
    }));

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(manyTracks);

    // SlotManager should be called and we check if it produces exactly 5 tracks
    mockSlotManager.arrangePlaylist.mockImplementation((_, survivors, ai, totalSlots) => {
      const pool = [...survivors, ...ai];
      return pool.slice(0, totalSlots).map((t) => t.uri);
    });

    await orchestrator.curatePlaylist(
      limitConfig,
      mockSpotifyService as unknown as SpotifyService,
      false
    );

    expect(mockSlotManager.arrangePlaylist).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array), // survivors
      expect.any(Array), // AI tracks
      5, // Target slots is 5
      true,
      'drop_random'
    );

    // Verify lengths manually
    const arrangeCall = mockSlotManager.arrangePlaylist.mock.calls[0];
    expect(arrangeCall[1]).toHaveLength(10); // survivors length

    expect(mockSpotifyService.performSmartUpdate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      false
    );

    const updateCall = mockSpotifyService.performSmartUpdate.mock.calls[0];
    expect(updateCall[1]).toHaveLength(5); // final tracks length
  });
});
