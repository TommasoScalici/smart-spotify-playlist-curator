import { MandatoryTrack, normalizeSpotifyUri } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

import { SlotManager } from '../../src/core/slot-manager';

describe('VIP Placement Regression: Case Sensitivity & Swap Protection', () => {
  const slotManager = new SlotManager();

  it('should protect VIP tracks from being swapped even with mixed-case URIs', () => {
    // 1. Setup a VIP track with a specific case in config
    const vipUri = 'spotify:track:VipTrackID_MixedCase';
    const mandatory: MandatoryTrack[] = [
      {
        positionRange: { max: 1, min: 1 },
        uri: vipUri
      }
    ];

    // 2. Setup a pool where the same track exists but with different case (simulating mismatch)
    // and multiple tracks from the same artist to trigger anti-clumping swaps.
    const artistA = 'Artist A';
    const survivors = [
      { artist: artistA, uri: 'spotify:track:viptrackid_mixedcase' }, // Duplicate URI (lower case)
      { artist: artistA, uri: 'spotify:track:Other1' },
      { artist: artistA, uri: 'spotify:track:Other2' }
    ];

    const pool = [
      { artist: 'Artist B', uri: 'spotify:track:Pool1' },
      { artist: 'Artist B', uri: 'spotify:track:Pool2' },
      { artist: 'Artist B', uri: 'spotify:track:Pool3' },
      { artist: 'Artist C', uri: 'spotify:track:Pool4' },
      { artist: 'Artist C', uri: 'spotify:track:Pool5' }
    ];

    // 3. Arrange playlist with target slots
    // We run it multiple times to ensure the random shuffle filler doesn't move it
    for (let run = 0; run < 20; run++) {
      const result = slotManager.arrangePlaylist(
        mandatory,
        survivors, // This should be filtered out by SlotManager if logic is correct
        pool,
        20,
        true // shuffle = true triggers fillWithShuffle and Swaps
      );

      // A. The VIP must be at Index 0 (Position 1)
      expect(normalizeSpotifyUri(result[0])).toBe(normalizeSpotifyUri(vipUri));

      // B. There should be NO duplicate of the VIP elsewhere (Pool filtering check)
      const occurrences = result.filter(
        (uri) => normalizeSpotifyUri(uri) === normalizeSpotifyUri(vipUri)
      );
      expect(occurrences, `Duplicate found in run ${run}`).toHaveLength(1);
    }
  });

  it('should NOT move a VIP track to position 52 if it belongs in 1-10', () => {
    const vipUri = 'spotify:track:VIP_1_10';
    const mandatory: MandatoryTrack[] = [{ positionRange: { max: 10, min: 1 }, uri: vipUri }];

    // Large pool to ensure many slots
    const pool = Array.from({ length: 100 }, (_, i) => ({
      artist: `Artist ${i}`,
      uri: `spotify:track:Pool${i}`
    }));

    const result = slotManager.arrangePlaylist(mandatory, [], pool, 100, true);

    const position = result.indexOf(vipUri) + 1;
    expect(position).toBeGreaterThanOrEqual(1);
    expect(position).toBeLessThanOrEqual(10);
    expect(position).not.toBe(52);
  });
});
