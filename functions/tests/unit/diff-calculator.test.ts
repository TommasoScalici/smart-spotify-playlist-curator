import { MandatoryTrack, normalizeSpotifyUri, TrackInfo } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

import { DiffCalculator } from '../../src/core/diff-calculator';
import { TrackWithMeta } from '../../src/core/types-internal';

describe('DiffCalculator', () => {
  // Mock Data Generators
  const createSpotifyTrack = (id: string, name: string, artist: string): TrackInfo => ({
    addedAt: new Date().toISOString(),
    album: 'Unknown Album',
    artist,
    name,
    uri: `spotify:track:${id}`
  });

  const createKeptTrack = (id: string, name: string, artist: string): TrackWithMeta => ({
    addedAt: new Date(),
    album: 'Unknown Album',
    artist,
    isVip: false,
    name,
    uri: `spotify:track:${id}`
  });

  it('should identify newly added AI tracks', () => {
    const current: TrackInfo[] = [createSpotifyTrack('1', 'Old', 'Artist 1')];
    const kept = [createKeptTrack('1', 'Old', 'Artist 1')];

    // AI adds track 2
    const newAiTracks = [{ artist: 'Artist 2', track: 'New AI', uri: 'spotify:track:2' }];
    const finalUris = ['spotify:track:1', 'spotify:track:2'];
    const mandatory: MandatoryTrack[] = [];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, newAiTracks);

    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual({
      artist: 'Artist 2',
      name: 'New AI',
      reason: 'ai_suggestion',
      uri: 'spotify:track:2'
    });
    expect(result.removed).toHaveLength(0);
  });

  it('should identify re-added mandatory tracks', () => {
    // Current state: Empty (User deleted VIP track)
    const current: TrackInfo[] = [];
    const kept: TrackWithMeta[] = [];

    const mandatory: MandatoryTrack[] = [
      {
        artist: 'VIP Artist',
        name: 'VIP Song',
        positionRange: { max: 1, min: 1 },
        uri: 'spotify:track:vip'
      }
    ];

    // AI adds nothing, but SlotManager puts VIP back
    const newAiTracks: { artist: string; track: string; uri: string }[] = [];
    const finalUris = ['spotify:track:vip'];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, newAiTracks);

    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual({
      artist: 'VIP Artist',
      name: 'VIP Song',
      reason: 'vip_readd',
      uri: 'spotify:track:vip'
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
      artist: 'A2',
      name: 'Delete Me',
      reason: 'other',
      uri: 'spotify:track:2'
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
      artist: 'Unknown Artist',
      name: 'Unknown Track',
      reason: 'other',
      uri: 'spotify:track:mystery'
    });
  });

  it('should identify kept mandatory tracks', () => {
    const current = [createSpotifyTrack('1', 'VIP Song', 'VIP Artist')];
    const kept = [createKeptTrack('1', 'VIP Song', 'VIP Artist')];
    const mandatory: MandatoryTrack[] = [
      {
        artist: 'VIP Artist',
        name: 'VIP Song',
        positionRange: { max: 1, min: 1 },
        uri: 'spotify:track:1'
      }
    ];
    const finalUris = ['spotify:track:1'];

    const result = DiffCalculator.calculate(current, kept, finalUris, mandatory, []);

    expect(result.keptMandatory).toHaveLength(1);
    expect(result.keptMandatory[0]).toEqual({
      artist: 'VIP Artist',
      name: 'VIP Song',
      uri: 'spotify:track:1'
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

  describe('URI Normalization & Case Sensitivity', () => {
    it('should correctly identify added tracks despite prefix casing differences', () => {
      const kept = [createKeptTrack('ConsistentID', 'Track', 'Artist')];
      const finalUris = [
        'Spotify:Track:ConsistentID', // Different prefix casing, same ID
        'spotify:track:NewTrack'
      ];

      const result = DiffCalculator.calculate(
        [],
        kept,
        finalUris,
        [],
        [{ artist: 'Artist', track: 'New Track', uri: 'spotify:track:NewTrack' }]
      );

      // 'Spotify:Track:ConsistentID' should be considered KEPT because it matches 'spotify:track:ConsistentID' normalized
      expect(result.added).toHaveLength(1);
      expect(result.added[0].uri).toBe('spotify:track:NewTrack');
    });

    it('should correctly identify kept mandatory tracks despite prefix casing differences', () => {
      const mandatory: MandatoryTrack[] = [
        {
          artist: 'Artist',
          name: 'VIP',
          positionRange: { max: 1, min: 1 },
          uri: 'spotify:track:VipID'
        }
      ];
      const finalUris = [
        'Spotify:Track:VipID' // Different prefix casing
      ];

      const result = DiffCalculator.calculate([], [], finalUris, mandatory, []);

      expect(result.keptMandatory).toHaveLength(1);
      expect(normalizeSpotifyUri(result.keptMandatory[0].uri)).toBe(
        normalizeSpotifyUri('spotify:track:VipID')
      );
    });

    it('should treat different track ID casing as distinct tracks (IDs are case-sensitive)', () => {
      const current = [createSpotifyTrack('caseid', 'Lower', 'A1')];
      const kept = [createKeptTrack('caseid', 'Lower', 'A1')];
      const finalUris = ['spotify:track:CASEID']; // Different ID casing = Different Track

      const result = DiffCalculator.calculate(current, kept, finalUris, [], []);

      // Original lower track was removed, upper track was added
      expect(result.removed).toHaveLength(1);
      expect(result.added).toHaveLength(1);
      expect(result.removed[0].uri).toBe('spotify:track:caseid');
      expect(result.added[0].uri).toBe('spotify:track:CASEID');
    });
  });
});
