import { PlaylistConfig, TrackDiff } from '@smart-spotify-curator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CurationSession } from '../../src/core/curation/curation-session';
import { CurationEstimator } from '../../src/core/estimator';
import { PlaylistOrchestrator } from '../../src/core/orchestrator';
import { SpotifyService } from '../../src/services/spotify-service';

// Mock Dependencies
vi.mock('../../src/core/orchestrator');
vi.mock('../../src/config/firebase', () => ({
  db: {
    doc: vi.fn().mockReturnValue({
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

describe('CurationEstimator', () => {
  let estimator: CurationEstimator;
  let mockOrchestrator: {
    createPlan: ReturnType<typeof vi.fn>;
  };
  let mockSpotifyService: SpotifyService;

  // Helper to create mock objects...
  const createDiff = (
    duplicates = 0,
    aged = 0,
    artistLimit = 0,
    sizeLimit = 0,
    ai = 0,
    mandatory = 0
  ): { added: TrackDiff[]; removed: TrackDiff[] } => {
    const removed: TrackDiff[] = [];
    const added: TrackDiff[] = [];

    for (let i = 0; i < duplicates; i++)
      removed.push({ artist: 'A', name: 'T', reason: 'duplicate', uri: `dupe:${i}` } as TrackDiff);
    for (let i = 0; i < aged; i++)
      removed.push({ artist: 'A', name: 'T', reason: 'expired', uri: `aged:${i}` } as TrackDiff);
    for (let i = 0; i < artistLimit; i++)
      removed.push({
        artist: 'A',
        name: 'T',
        reason: 'artist_limit',
        uri: `limit:${i}`
      } as TrackDiff);
    for (let i = 0; i < sizeLimit; i++)
      removed.push({ artist: 'A', name: 'T', reason: 'size_limit', uri: `size:${i}` } as TrackDiff);

    for (let i = 0; i < ai; i++)
      added.push({ artist: 'A', isVip: false, name: 'AI', uri: `ai:${i}` } as TrackDiff);
    for (let i = 0; i < mandatory; i++)
      added.push({ artist: 'A', isVip: true, name: 'Man', uri: `man:${i}` } as TrackDiff);

    return { added, removed };
  };

  const mockConfig: PlaylistConfig = {
    aiGeneration: { enabled: true, model: 'gemini', temperature: 0.7, tracksToAdd: 10 },
    curationRules: {
      maxTrackAgeDays: 30,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:test',
    mandatoryTracks: [],
    name: 'Test',
    ownerId: 'uid',
    settings: {
      allowExplicit: true,
      description: 'Desc',
      referenceArtists: [],
      targetTotalTracks: 50
    }
  };

  beforeEach(() => {
    // Reset mocks
    mockOrchestrator = {
      createPlan: vi.fn()
    };
    mockSpotifyService = {} as unknown as SpotifyService;

    // Instantiate with mocked orchestrator
    // We cast mock to any because we mocked the module but here we pass the instance
    estimator = new CurationEstimator(mockOrchestrator as unknown as PlaylistOrchestrator);
  });

  it('Scenario 1: Maps Orchestrator Session to Estimate', async () => {
    // Setup a session result
    const mockSession: Partial<CurationSession> = {
      config: mockConfig,
      currentTracks: Array.from({ length: 20 }, (_, i) => ({
        addedAt: new Date().toISOString(),
        album: 'Album',
        artist: 'Artist',
        name: `Track ${i}`,
        popularity: 50,
        uri: `uri:${i}`
      })),
      diff: createDiff(0, 0, 0, 0, 0, 0),
      finalTrackList: Array(20).fill('uri'),
      newAiTracks: []
    };

    mockOrchestrator.createPlan.mockResolvedValue(mockSession);

    const result = await estimator.estimate(mockConfig, mockSpotifyService, 'uid');

    expect(result.currentTracks).toBe(20);
    expect(result.predictedFinal).toBe(20);
    expect(result.duplicatesToRemove).toBe(0);
    expect(result.planId).toBeDefined();
    // Validate that createPlan was called with dryRun=true
    expect(mockOrchestrator.createPlan).toHaveBeenCalledWith(
      mockConfig,
      mockSpotifyService,
      true,
      expect.any(String),
      undefined
    );
  });

  it('Scenario 2: Counts Removals Correctly', async () => {
    const mockSession: Partial<CurationSession> = {
      config: mockConfig,
      currentTracks: Array.from({ length: 10 }, (_, i) => ({
        addedAt: new Date().toISOString(),
        album: 'Album',
        artist: 'Artist',
        name: `Track ${i}`,
        popularity: 50,
        uri: `uri:${i}`
      })),
      diff: createDiff(2, 3, 1, 1, 0, 0),
      finalTrackList: Array(5).fill('uri'),
      newAiTracks: []
    };

    mockOrchestrator.createPlan.mockResolvedValue(mockSession);

    const result = await estimator.estimate(mockConfig, mockSpotifyService, 'uid');

    expect(result.duplicatesToRemove).toBe(2);
    expect(result.agedOutTracks).toBe(3);
    expect(result.artistLimitRemoved).toBe(1);
    expect(result.sizeLimitRemoved).toBe(1);
  });

  it('Scenario 3: Counts Additions and Assigns Sources', async () => {
    const aiTracks = [
      { artist: 'AI', track: 'Track', uri: 'ai:0' },
      { artist: 'AI', track: 'Track', uri: 'ai:1' },
      { artist: 'AI', track: 'Track', uri: 'ai:2' }
    ];
    const mandatoryTracks = [{ positionRange: { max: 1, min: 1 }, uri: 'man:0' }];

    const mockSession: Partial<CurationSession> = {
      config: { ...mockConfig, mandatoryTracks },
      currentTracks: [],
      diff: createDiff(0, 0, 0, 0, 3, 1),
      finalTrackList: Array(4).fill('uri'),
      newAiTracks: aiTracks
    };

    mockOrchestrator.createPlan.mockResolvedValue(mockSession);

    const result = await estimator.estimate(mockConfig, mockSpotifyService, 'uid');

    expect(result.aiTracksToAdd).toBe(3);
    expect(result.mandatoryToAdd).toBe(1);

    // Check Source Tagging
    expect(result.added?.find((t) => t.uri === 'ai:0')?.source).toBe('ai');
    expect(result.added?.find((t) => t.uri === 'man:0')?.source).toBe('mandatory');
  });
});
