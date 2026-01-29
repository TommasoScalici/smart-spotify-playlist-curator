import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MandatoryTrack, PlaylistConfig } from '@smart-spotify-curator/shared';

import { CurationEstimator } from '../../src/core/estimator';
import { SpotifyService, TrackInfo } from '../../src/services/spotify-service';

// Mock Dependencies
vi.mock('../../src/services/spotify-service');

describe('CurationEstimator', () => {
  let estimator: CurationEstimator;
  let mockSpotifyService: {
    getPlaylistTracks: ReturnType<typeof vi.fn>;
  };

  // Helper to create mock tracks
  const createTrack = (id: string, artist: string, addedAt: string): TrackInfo => ({
    uri: `spotify:track:${id}`,
    name: `Track ${id}`,
    artist,
    album: `Album ${id}`,
    addedAt, // ISO String
    popularity: 50
  });

  const createMandatoryTrack = (id: string): MandatoryTrack => ({
    uri: `spotify:track:${id}`,
    name: `Mandatory ${id}`,
    artist: 'Mandatory Artist',
    positionRange: { min: 1, max: 10 }
  });

  const mockConfig: PlaylistConfig = {
    id: 'spotify:playlist:test-playlist',
    name: 'Test Playlist',
    enabled: true,
    ownerId: 'user-123',
    settings: {
      targetTotalTracks: 50,
      description: 'Test Description',
      allowExplicit: false,
      referenceArtists: []
    },
    aiGeneration: {
      enabled: true,
      tracksToAdd: 10,
      model: 'gemini-1.5-flash',
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
    estimator = new CurationEstimator();
    mockSpotifyService = {
      getPlaylistTracks: vi.fn()
    };
  });

  it('Scenario 1: No Changes Needed', async () => {
    // Setup: 20 tracks, all fresh, no duplicates, AI disabled
    const now = new Date();
    const existingTracks = Array.from({ length: 20 }, (_, i) =>
      createTrack(`${i}`, `Artist ${i}`, now.toISOString())
    );

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(existingTracks);

    const config: PlaylistConfig = {
      ...mockConfig,
      aiGeneration: { ...mockConfig.aiGeneration, enabled: false }
    };

    const result = await estimator.estimate(
      config,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(result).toEqual({
      currentTracks: 20,
      duplicatesToRemove: 0,
      agedOutTracks: 0,
      artistLimitRemoved: 0,
      sizeLimitRemoved: 0,
      mandatoryToAdd: 0,
      aiTracksToAdd: 0,
      predictedFinal: 20
    });
  });

  it('Scenario 2: Deduplication Logic', async () => {
    // Setup: 3 tracks, 2 are identical (uri: '1')
    const now = new Date();
    const existingTracks = [
      createTrack('1', 'Artist A', now.toISOString()),
      createTrack('1', 'Artist A', now.toISOString()), // Duplicate
      createTrack('2', 'Artist B', now.toISOString())
    ];

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(existingTracks);

    const config: PlaylistConfig = {
      ...mockConfig,
      aiGeneration: { ...mockConfig.aiGeneration, enabled: false }
    };

    const result = await estimator.estimate(
      config,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(result).toEqual({
      currentTracks: 3,
      duplicatesToRemove: 1, // 3 - 1 = 2
      agedOutTracks: 0,
      artistLimitRemoved: 0,
      sizeLimitRemoved: 0,
      mandatoryToAdd: 0,
      aiTracksToAdd: 0,
      predictedFinal: 2
    });
  });

  it('Scenario 3: Age Cleanup', async () => {
    // Setup: 2 tracks, 1 old (60 days), 1 fresh
    const now = new Date();
    const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

    const existingTracks = [
      createTrack('1', 'Old Artist', oldDate.toISOString()),
      createTrack('2', 'Fresh Artist', now.toISOString())
    ];

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(existingTracks);

    const result = await estimator.estimate(
      mockConfig,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(result).toEqual({
      currentTracks: 2,
      duplicatesToRemove: 0,
      agedOutTracks: 1, // The old one
      artistLimitRemoved: 0,
      sizeLimitRemoved: 0,
      mandatoryToAdd: 0,
      aiTracksToAdd: 10, // Default config has 10
      predictedFinal: 11 // (2 - 1) + 10 = 11
    });
  });

  it('Scenario 4: Mandatory Tracks Injection', async () => {
    // Setup: 5 existing
    const now = new Date();
    const existingTracks = Array.from({ length: 5 }, (_, i) =>
      createTrack(`${i}`, `Artist ${i}`, now.toISOString())
    );

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(existingTracks);

    const config: PlaylistConfig = {
      ...mockConfig,
      mandatoryTracks: [createMandatoryTrack('mandatory1'), createMandatoryTrack('mandatory2')],
      aiGeneration: { ...mockConfig.aiGeneration, enabled: false }
    };

    const result = await estimator.estimate(
      config,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(result.mandatoryToAdd).toBe(2);
    expect(result.predictedFinal).toBe(7); // 5 + 2
  });

  it('Scenario 5: Full Combination (Dedup + Age + Mandatory + AI)', async () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const existingTracks = [
      createTrack('1', 'Dupe A', now.toISOString()),
      createTrack('1', 'Dupe A', now.toISOString()), // -1 Duplicate
      createTrack('2', 'Old B', oldDate.toISOString()), // -1 Aged
      createTrack('3', 'Fresh C', now.toISOString()) // Keep
    ];

    mockSpotifyService.getPlaylistTracks.mockResolvedValue(existingTracks);

    const config: PlaylistConfig = {
      ...mockConfig,
      mandatoryTracks: [createMandatoryTrack('mandatory1')], // +1
      aiGeneration: { enabled: true, tracksToAdd: 5, model: 'gemini', temperature: 0.7 } // +5
    };

    const result = await estimator.estimate(
      config,
      mockSpotifyService as unknown as SpotifyService
    );

    expect(result).toEqual({
      currentTracks: 4,
      duplicatesToRemove: 1,
      agedOutTracks: 1,
      artistLimitRemoved: 0,
      sizeLimitRemoved: 0,
      mandatoryToAdd: 1,
      aiTracksToAdd: 5,
      predictedFinal: 8 // (4 - 1 - 1) + 1 + 5 = 8
    });
  });
});
