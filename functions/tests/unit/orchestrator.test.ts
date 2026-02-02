import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

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
      keptMandatory: [],
      removed: []
    }))
  }
}));

vi.mock('../../src/config/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        update: vi.fn().mockResolvedValue(undefined)
      }))
    })),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        data: () => ({ refreshToken: 'mock-refresh-token' }),
        exists: true
      }),
      update: vi.fn().mockResolvedValue(undefined)
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
    aiGeneration: {
      enabled: true,
      model: 'gemini',
      temperature: 0.7,
      tracksToAdd: 10
    },
    curationRules: {
      maxTrackAgeDays: 30,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:test-playlist',
    mandatoryTracks: [],
    name: 'Test Playlist',
    ownerId: 'test-user-123',
    settings: {
      allowExplicit: true,
      description: 'Test',
      referenceArtists: [],
      targetTotalTracks: 10
    }
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
      description: 'Test',
      followers: 100,
      id: 'test-playlist',
      imageUrl: 'http://test-image.com/img.jpg',
      name: 'Test Playlist',
      owner: 'Test Owner',
      totalTracks: 0
    });
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', reasoning: 'Mock reasoning A', track: 'Track B' }
    ]);

    mockSpotifyService.searchTrack.mockResolvedValue({
      addedAt: new Date().toISOString(),
      album: 'Album B',
      artist: 'Artist A',
      name: 'Track B',
      popularity: 50,
      uri: 'spotify:track:new-ai-uri'
    });

    mockSlotManager.arrangePlaylist.mockReturnValue(['spotify:track:uri1', 'spotify:track:uri2']);
  });

  it('Path 1: Full Flow (Empty Playlist -> AI Generation)', async () => {
    mockSpotifyService.getPlaylistTracks.mockResolvedValue([]);
    mockAiService.generateSuggestions.mockResolvedValue([
      { artist: 'Artist A', reasoning: 'Mock reasoning A', track: 'Track A' },
      { artist: 'Artist B', reasoning: 'Mock reasoning B', track: 'Track B' }
    ]);

    mockSpotifyService.searchTrack
      .mockResolvedValueOnce({
        addedAt: '',
        album: 'Album A',
        artist: 'Artist A',
        name: 'Track A',
        popularity: 50,
        uri: 'spotify:track:A'
      })
      .mockResolvedValueOnce({
        addedAt: '',
        album: 'Album B',
        artist: 'Artist B',
        name: 'Track B',
        popularity: 60,
        uri: 'spotify:track:B'
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
        addedAt: now.toISOString(),
        album: 'Bad Company',
        artist: 'Bad Company',
        name: 'Bad Company',
        uri: 'uri:1'
      },
      {
        addedAt: now.toISOString(),
        album: 'Bad Company',
        artist: 'Bad Company',
        name: 'Bad Company',
        uri: 'uri:2'
      },
      {
        addedAt: now.toISOString(),
        album: 'Bad Company',
        artist: 'Bad Company',
        name: 'Different',
        uri: 'uri:3'
      },
      {
        addedAt: now.toISOString(),
        album: 'Other Album',
        artist: 'Other Artist',
        name: 'Bad Company',
        uri: 'uri:4'
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
        addedAt: oldDate.toISOString(),
        album: 'Album A',
        artist: 'A',
        name: 'Old',
        uri: 'spotify:track:old'
      },
      {
        addedAt: newDate.toISOString(),
        album: 'Album B',
        artist: 'B',
        name: 'New',
        uri: 'spotify:track:new'
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
      addedAt: new Date().toISOString(),
      album: `Album ${i}`,
      artist: `Artist ${i}`,
      name: `Track ${i}`,
      popularity: 50,
      uri: `uri:${i}`
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
      expect.any(Array)
    );

    const updateCall = mockSpotifyService.performSmartUpdate.mock.calls[0];
    expect(updateCall[1]).toHaveLength(5); // final tracks length
  });
});
