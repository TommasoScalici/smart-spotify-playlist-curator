import { MandatoryTrack } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

import { SlotManager } from '../../src/core/slot-manager';

describe('SlotManager Edge Cases', () => {
  const slotManager = new SlotManager();

  it('should handle more mandatory tracks than total slots (graceful truncation)', () => {
    const mandatory: MandatoryTrack[] = [
      { positionRange: { max: 1, min: 1 }, uri: 'm1' },
      { positionRange: { max: 2, min: 2 }, uri: 'm2' },
      { positionRange: { max: 3, min: 3 }, uri: 'm3' }
    ];

    // Only 2 slots available
    const result = slotManager.arrangePlaylist(mandatory, [], [], 2);

    expect(result).toHaveLength(2);
    expect(result).toEqual(['m1', 'm2']);
  });

  it('should handle conflicting fixed positions (first one wins)', () => {
    const mandatory: MandatoryTrack[] = [
      { positionRange: { max: 1, min: 1 }, uri: 'winner' },
      { positionRange: { max: 1, min: 1 }, uri: 'loser' }
    ];

    const result = slotManager.arrangePlaylist(mandatory, [], [], 5);

    expect(result[0]).toBe('winner');
    // 'loser' should either be placed elsewhere or dropped if no slots (here it should be placed in next available slot in Phase C)
    expect(result).toContain('loser');
    expect(result.indexOf('loser')).toBeGreaterThan(0);
  });

  it('should place mandatory tracks even if their range is full (fallback to any empty slot)', () => {
    const mandatory: MandatoryTrack[] = [
      { positionRange: { max: 1, min: 1 }, uri: 'fix1' },
      { positionRange: { max: 2, min: 2 }, uri: 'fix2' },
      { positionRange: { max: 2, min: 1 }, uri: 'ranged' } // Range [1,2] is full!
    ];

    const result = slotManager.arrangePlaylist(mandatory, [], [], 5);

    expect(result[0]).toBe('fix1');
    expect(result[1]).toBe('fix2');
    expect(result).toContain('ranged');
    expect(result.indexOf('ranged')).toBeGreaterThan(1);
  });

  it('should return empty array if totalSlots is 0', () => {
    const result = slotManager.arrangePlaylist([], [], [], 0);
    expect(result).toEqual([]);
  });

  it('should handle zero survivors and zero AI tracks (mandatory only)', () => {
    const mandatory: MandatoryTrack[] = [{ positionRange: { max: 1, min: 1 }, uri: 'm1' }];
    const result = slotManager.arrangePlaylist(mandatory, [], [], 5);
    expect(result).toEqual(['m1']); // Filtered out nulls
  });
  it('should maintain fixed position even with sparse content', () => {
    // Target 5 slots. But only 3 tracks total.
    // Mandatory at Pos 3 (Index 2).
    const mandatory = [{ positionRange: { max: 3, min: 3 }, uri: 'fix:3' }];
    const survivors = [
      { artist: 'A', uri: 's:1' },
      { artist: 'B', uri: 's:2' }
    ];

    // Run multiple times
    for (let i = 0; i < 50; i++) {
      const result = slotManager.arrangePlaylist(mandatory, survivors, [], 5, true);
      // Expect length 3
      expect(result).toHaveLength(3);
      // Expect 'fix:3' to be at index 2 (Position 3)
      expect(result.indexOf('fix:3')).toBe(2);
    }
  });
});
