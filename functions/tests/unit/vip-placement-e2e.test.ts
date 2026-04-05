import { MandatoryTrack, normalizeSpotifyUri } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

import { SlotManager } from '../../src/core/slot-manager';

/**
 * End-to-end test that simulates the exact user scenario:
 * - 10 VIP tracks with various position ranges (fixed + ranged)
 * - 50+ survivor tracks (some of which ARE the VIP tracks — already in playlist)
 * - AI-suggested tracks
 * - Shuffle mode ON
 *
 * Verifies:
 * 1. Every VIP ends up within its declared positionRange
 * 2. No VIP URI appears more than once in the final list
 * 3. No URI from the VIP list appears outside its range
 */
describe('VIP Placement E2E: Full Scenario', () => {
  const slotManager = new SlotManager();

  // Mirror the user's actual config from screenshots
  const mandatoryTracks: MandatoryTrack[] = [
    { positionRange: { max: 30, min: 5 }, uri: 'spotify:track:DreamshapedWill' },
    { positionRange: { max: 30, min: 5 }, uri: 'spotify:track:NightWandering' },
    { positionRange: { max: 20, min: 3 }, uri: 'spotify:track:PareidolieSilenziose' },
    { positionRange: { max: 20, min: 3 }, uri: 'spotify:track:EchiDiVelluto' },
    { positionRange: { max: 20, min: 3 }, uri: 'spotify:track:DiscromiaViolenta' },
    { positionRange: { max: 20, min: 3 }, uri: 'spotify:track:ImmagineResidua' },
    { positionRange: { max: 15, min: 15 }, uri: 'spotify:track:InnerPeacePt1' }, // FIXED position
    { positionRange: { max: 16, min: 16 }, uri: 'spotify:track:InnerPeacePt2' }, // FIXED position
    { positionRange: { max: 40, min: 20 }, uri: 'spotify:track:DepthsOfTheSea' },
    { positionRange: { max: 50, min: 25 }, uri: 'spotify:track:Rain' }
  ];

  // Survivors include the VIP tracks (they're already in the playlist!)
  // This is the critical scenario: VIPs exist as both survivors AND mandatory
  const survivorTracks = [
    // VIP tracks already in the playlist (should be filtered from pool by Fix #1)
    { artist: 'Tommaso Scalici', uri: 'spotify:track:DreamshapedWill' },
    { artist: 'Tommaso Scalici', uri: 'spotify:track:NightWandering' },
    { artist: 'Tommaso Scalici', uri: 'spotify:track:PareidolieSilenziose' },
    { artist: 'Tommaso Scalici', uri: 'spotify:track:EchiDiVelluto' },
    { artist: 'Tommaso Scalici', uri: 'spotify:track:DiscromiaViolenta' },
    { artist: 'Tommaso Scalici', uri: 'spotify:track:ImmagineResidua' },
    { artist: 'Harry Bertora', uri: 'spotify:track:InnerPeacePt1' },
    { artist: 'Harry Bertora', uri: 'spotify:track:InnerPeacePt2' },
    { artist: 'Artax One', uri: 'spotify:track:DepthsOfTheSea' },
    { artist: 'Ephraim Maaler', uri: 'spotify:track:Rain' },
    // Regular survivors (non-VIP)
    ...Array.from({ length: 40 }, (_, i) => ({
      artist: `Artist ${String.fromCharCode(65 + (i % 20))}`,
      uri: `spotify:track:Survivor${i}`
    }))
  ];

  // New AI tracks
  const aiTracks = Array.from({ length: 15 }, (_, i) => ({
    artist: `AI Artist ${String.fromCharCode(65 + (i % 10))}`,
    uri: `spotify:track:AI${i}`
  }));

  const ITERATIONS = 100;

  it(`should place ALL VIP tracks within their declared ranges across ${ITERATIONS} shuffled runs`, () => {
    for (let run = 0; run < ITERATIONS; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        survivorTracks,
        aiTracks,
        65, // target total tracks
        true, // shuffle = true
        'drop_random'
      );

      // Check each mandatory track
      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const index = result.findIndex((uri) => normalizeSpotifyUri(uri) === normVip);

        // Must be present
        expect(index, `VIP ${vip.uri} not found in result (run ${run})`).toBeGreaterThanOrEqual(0);

        const position = index + 1; // Convert 0-indexed to 1-indexed

        // Must be within range
        expect(
          position,
          `VIP ${vip.uri} at position ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (run ${run})`
        ).toBeGreaterThanOrEqual(vip.positionRange.min);
        expect(
          position,
          `VIP ${vip.uri} at position ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (run ${run})`
        ).toBeLessThanOrEqual(vip.positionRange.max);
      }
    }
  });

  it('should never produce duplicate VIP URIs in the final list', () => {
    for (let run = 0; run < ITERATIONS; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        survivorTracks,
        aiTracks,
        65,
        true,
        'drop_random'
      );

      // Check no VIP URI appears more than once
      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const occurrences = result.filter((uri) => normalizeSpotifyUri(uri) === normVip);
        expect(
          occurrences.length,
          `VIP ${vip.uri} appears ${occurrences.length} times (run ${run})`
        ).toBe(1);
      }
    }
  });

  it('should respect fixed positions (min === max)', () => {
    for (let run = 0; run < ITERATIONS; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        survivorTracks,
        aiTracks,
        65,
        true,
        'drop_random'
      );

      // InnerPeacePt1 must be at position 15 (index 14)
      const pt1Index = result.findIndex(
        (uri) => normalizeSpotifyUri(uri) === normalizeSpotifyUri('spotify:track:InnerPeacePt1')
      );
      expect(pt1Index, `InnerPeacePt1 at index ${pt1Index}, expected 14 (run ${run})`).toBe(14);

      // InnerPeacePt2 must be at position 16 (index 15)
      const pt2Index = result.findIndex(
        (uri) => normalizeSpotifyUri(uri) === normalizeSpotifyUri('spotify:track:InnerPeacePt2')
      );
      expect(pt2Index, `InnerPeacePt2 at index ${pt2Index}, expected 15 (run ${run})`).toBe(15);
    }
  });

  it('should work correctly with shuffle DISABLED', () => {
    for (let run = 0; run < 10; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        survivorTracks,
        aiTracks,
        65,
        false, // shuffle = false
        'drop_random'
      );

      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const index = result.findIndex((uri) => normalizeSpotifyUri(uri) === normVip);
        expect(index, `VIP ${vip.uri} not found (sequential, run ${run})`).toBeGreaterThanOrEqual(
          0
        );

        const position = index + 1;
        expect(
          position,
          `VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (sequential, run ${run})`
        ).toBeGreaterThanOrEqual(vip.positionRange.min);
        expect(
          position,
          `VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (sequential, run ${run})`
        ).toBeLessThanOrEqual(vip.positionRange.max);
      }

      // No duplicates in sequential mode either
      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const occurrences = result.filter((uri) => normalizeSpotifyUri(uri) === normVip);
        expect(occurrences.length, `Duplicate VIP ${vip.uri} (sequential, run ${run})`).toBe(1);
      }
    }
  });

  it('should work when VIP tracks are NOT already in survivors (new VIPs)', () => {
    // Only non-VIP survivors
    const freshSurvivors = Array.from({ length: 40 }, (_, i) => ({
      artist: `Artist ${String.fromCharCode(65 + (i % 20))}`,
      uri: `spotify:track:Fresh${i}`
    }));

    for (let run = 0; run < ITERATIONS; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        freshSurvivors,
        aiTracks,
        65,
        true,
        'drop_random'
      );

      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const index = result.findIndex((uri) => normalizeSpotifyUri(uri) === normVip);
        expect(index, `New VIP ${vip.uri} not found (run ${run})`).toBeGreaterThanOrEqual(0);

        const position = index + 1;
        expect(
          position,
          `New VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (run ${run})`
        ).toBeGreaterThanOrEqual(vip.positionRange.min);
        expect(
          position,
          `New VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (run ${run})`
        ).toBeLessThanOrEqual(vip.positionRange.max);
      }
    }
  });

  it('should work with AI suggestions disabled (empty aiTracks)', () => {
    for (let run = 0; run < ITERATIONS; run++) {
      const result = slotManager.arrangePlaylist(
        mandatoryTracks,
        survivorTracks,
        [], // No AI tracks
        65,
        true,
        'drop_random'
      );

      for (const vip of mandatoryTracks) {
        const normVip = normalizeSpotifyUri(vip.uri);
        const index = result.findIndex((uri) => normalizeSpotifyUri(uri) === normVip);
        expect(index, `VIP ${vip.uri} not found (no AI, run ${run})`).toBeGreaterThanOrEqual(0);

        const position = index + 1;
        expect(
          position,
          `VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (no AI, run ${run})`
        ).toBeGreaterThanOrEqual(vip.positionRange.min);
        expect(
          position,
          `VIP ${vip.uri} at pos ${position}, expected ${vip.positionRange.min}-${vip.positionRange.max} (no AI, run ${run})`
        ).toBeLessThanOrEqual(vip.positionRange.max);
      }
    }
  });
});
