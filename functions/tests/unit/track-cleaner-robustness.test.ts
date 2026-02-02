import { PlaylistConfig, TrackInfo } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

import { TrackCleaner } from '../../src/core/track-cleaner';

describe('TrackCleaner Robustness', () => {
  const mockConfig: PlaylistConfig = {
    aiGeneration: { enabled: false, model: 'gemini', temperature: 0.7, tracksToAdd: 0 },
    curationRules: {
      maxTrackAgeDays: 100,
      maxTracksPerArtist: 10,
      removeDuplicates: true,
      shuffleAtEnd: false,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'test',
    mandatoryTracks: [],
    name: 'Test',
    ownerId: 'user',
    settings: { description: '', referenceArtists: [], targetTotalTracks: 20 }
  };

  const baseTrack: TrackInfo = {
    addedAt: new Date().toISOString(),
    album: 'Album',
    artist: 'Artist',
    name: 'Song',
    popularity: 50,
    uri: 'spotify:track:1'
  };

  it('should treat names with extra whitespace as duplicates', () => {
    const cleaner = new TrackCleaner();
    const tracks: TrackInfo[] = [
      { ...baseTrack, name: 'Song Title', uri: 'u1' },
      { ...baseTrack, name: '  Song   Title  ', uri: 'u2' } // Should be duplicate
    ];

    const result = cleaner.processCurrentTracks(tracks, mockConfig, []);

    // Expect strict cleaner to catch this
    // Note: Current implementation might fail this test until we fix it
    expect(result.survivingTracks).toHaveLength(1);
    expect(result.removedTracks[0].reason).toBe('duplicate');
  });

  it('should be case insensitive', () => {
    const cleaner = new TrackCleaner();
    const tracks: TrackInfo[] = [
      { ...baseTrack, artist: 'ARTIST', name: 'song title', uri: 'u1' },
      { ...baseTrack, artist: 'Artist', name: 'Song Title', uri: 'u2' }
    ];

    const result = cleaner.processCurrentTracks(tracks, mockConfig, []);
    expect(result.survivingTracks).toHaveLength(1);
    expect(result.removedTracks[0].reason).toBe('duplicate');
  });

  it('should deduplicate multiple artists permutations if string matches exactly (Simple Normalization)', () => {
    // NOTE: Spotify API joins artists with comma usually.
    // "Artist A, Artist B" vs "Artist A, Artist B"
    const cleaner = new TrackCleaner();
    const tracks: TrackInfo[] = [
      { ...baseTrack, artist: 'A, B', uri: 'u1' },
      { ...baseTrack, artist: 'a, b', uri: 'u2' }
    ];

    const result = cleaner.processCurrentTracks(tracks, mockConfig, []);
    expect(result.survivingTracks).toHaveLength(1);
  });

  it('should protect VIP tracks from age expiration', () => {
    const cleaner = new TrackCleaner();
    const now = Date.now();
    const oldDate = new Date(now - 200 * 24 * 60 * 60 * 1000).toISOString(); // 200 days old

    const tracks: TrackInfo[] = [
      { ...baseTrack, addedAt: oldDate, name: 'Song A', uri: 'vip:1' }, // VIP
      { ...baseTrack, addedAt: oldDate, name: 'Song B', uri: 'normal:1' } // Normal
    ];

    // config has maxAge 100 days
    const result = cleaner.processCurrentTracks(tracks, mockConfig, ['vip:1']);

    expect(result.survivingTracks).toHaveLength(1);
    expect(result.survivingTracks[0].uri).toBe('vip:1');
    expect(result.removedTracks[0].reason).toBe('expired');
  });

  it('should protect VIP tracks from artist limits', () => {
    const cleaner = new TrackCleaner();
    const tracks: TrackInfo[] = [
      { ...baseTrack, artist: 'Overplayed', name: 'Song 1', uri: 'vip:1' },
      { ...baseTrack, artist: 'Overplayed', name: 'Song 2', uri: 'vip:2' },
      { ...baseTrack, artist: 'Overplayed', name: 'Song 3', uri: 'vip:3' },
      { ...baseTrack, artist: 'Overplayed', name: 'Song 4', uri: 'normal:1' }
    ];

    // limit is 10 in mockConfig, let's make it strict for this call
    const strictConfig = {
      ...mockConfig,
      curationRules: { ...mockConfig.curationRules, maxTracksPerArtist: 1 }
    };

    // All VIPs should be kept, Normal should be removed because VIPs already exceeded count
    const result = cleaner.processCurrentTracks(tracks, strictConfig, ['vip:1', 'vip:2', 'vip:3']);

    expect(result.survivingTracks).toHaveLength(3);
    const uris = result.survivingTracks.map((t) => t.uri);
    expect(uris).toContain('vip:1');
    expect(uris).toContain('vip:2');
    expect(uris).toContain('vip:3');
    expect(result.removedTracks[0].uri).toBe('normal:1');
    expect(result.removedTracks[0].reason).toBe('artist_limit');
  });
});
