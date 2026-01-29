import { describe, expect, it } from 'vitest';

import { MandatoryTrack } from '@smart-spotify-curator/shared';

import { DiffCalculator } from '../../src/core/diff-calculator';
import { TrackWithMeta } from '../../src/core/types-internal';
import { TrackInfo } from '../../src/services/spotify-service';

describe('DiffCalculator', () => {
  // Mock Data Generators
  const createSpotifyTrack = (id: string, name: string, artist: string): TrackInfo => ({
    uri: `spotify:track:${id}`,
    name,
    artist,
    album: 'Unknown Album',
    addedAt: new Date().toISOString()
  });

  const createKeptTrack = (id: string, name: string, artist: string): TrackWithMeta => ({
    uri: `spotify:track:${id}`,
    name,
    artist,
    album: 'Unknown Album',
    addedAt: new Date(),
    isVip: false
  });

  it('should identify newly added AI tracks', () => {
    const current: TrackInfo[] = [createSpotifyTrack('1', 'Old', 'Artist 1')];
    const kept = [createKeptTrack('1', 'Old', 'Artist 1')];

    // AI adds track 2
    const newAiTracks = [{ uri: 'spotify:track:2', artist: 'Artist 2', track: 'New AI' }];
    const finalUris = ['spotify:track:1', 'spotify:track:2'];
    const mandatory: MandatoryTrack[] = [];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, newAiTracks);

    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual({
      uri: 'spotify:track:2',
      name: 'New AI',
      artist: 'Artist 2'
    });
    expect(result.removed).toHaveLength(0);
  });

  it('should identify re-added mandatory tracks', () => {
    // Current state: Empty (User deleted VIP track)
    const current: TrackInfo[] = [];
    const kept: TrackWithMeta[] = [];

    const mandatory: MandatoryTrack[] = [
      {
        uri: 'spotify:track:vip',
        name: 'VIP Song',
        artist: 'VIP Artist',
        positionRange: { min: 1, max: 1 }
      }
    ];

    // AI adds nothing, but SlotManager puts VIP back
    const newAiTracks: { uri: string; artist: string; track: string }[] = [];
    const finalUris = ['spotify:track:vip'];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, newAiTracks);

    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual({
      uri: 'spotify:track:vip',
      name: 'VIP Song',
      artist: 'VIP Artist'
    });
  });

  it('should identify removed tracks', () => {
    const current = [
      createSpotifyTrack('1', 'Keep Me', 'A1'),
      createSpotifyTrack('2', 'Delete Me', 'A2')
    ];

    const kept = [createKeptTrack('1', 'Keep Me', 'A1')];
    const finalUris = ['spotify:track:1'];

    const result = DiffCalculator.calculate(current, kept, finalUris, [], []);

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toEqual({
      uri: 'spotify:track:2',
      name: 'Delete Me',
      artist: 'A2',
      reason: 'other'
    });
    expect(result.added).toHaveLength(0);
  });

  it('should fallback to "Unknown" for tracks without metadata', () => {
    const current: TrackInfo[] = [];
    const kept: TrackWithMeta[] = [];
    // Mystery track appears in final list but not in AI or VIP list (Should theoretically not happen, but safe fallback)
    const finalUris = ['spotify:track:mystery'];

    const result = DiffCalculator.calculate(current, kept, finalUris, [], []);

    expect(result.added[0]).toEqual({
      uri: 'spotify:track:mystery',
      name: 'Unknown Track',
      artist: 'Unknown Artist'
    });
  });

  it('should identify kept mandatory tracks', () => {
    const current = [createSpotifyTrack('1', 'VIP Song', 'VIP Artist')];
    const kept = [createKeptTrack('1', 'VIP Song', 'VIP Artist')];
    const mandatory: MandatoryTrack[] = [
      {
        uri: 'spotify:track:1',
        name: 'VIP Song',
        artist: 'VIP Artist',
        positionRange: { min: 1, max: 1 }
      }
    ];
    const finalUris = ['spotify:track:1'];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, []);

    expect(result.keptMandatory).toHaveLength(1);
    expect(result.keptMandatory[0]).toEqual({
      uri: 'spotify:track:1',
      name: 'VIP Song',
      artist: 'VIP Artist'
    });
  });

  it('should use explicit removal reasons when provided', () => {
    const current = [createSpotifyTrack('1', 'Duplicate', 'A1')];
    const kept: TrackWithMeta[] = [];
    const finalUris: string[] = [];
    const reasons = new Map<string, 'duplicate' | 'expired' | 'other'>();
    reasons.set('spotify:track:1', 'duplicate');

    const result = DiffCalculator.calculate(current, kept, finalUris, [], [], reasons);

    expect(result.removed[0].reason).toBe('duplicate');
  });
});
