import { describe, it, expect } from 'vitest';
import { SlotManager } from '../../src/core/slot-manager';
import { MandatoryTrack } from '@smart-spotify-curator/shared';

describe('SlotManager Edge Cases', () => {
  const slotManager = new SlotManager();

  it('should handle more mandatory tracks than total slots (graceful truncation)', () => {
    const mandatory: MandatoryTrack[] = [
      { uri: 'm1', positionRange: { min: 1, max: 1 } },
      { uri: 'm2', positionRange: { min: 2, max: 2 } },
      { uri: 'm3', positionRange: { min: 3, max: 3 } }
    ];

    // Only 2 slots available
    const result = slotManager.arrangePlaylist(mandatory, [], [], 2);

    expect(result).toHaveLength(2);
    expect(result).toEqual(['m1', 'm2']);
  });

  it('should handle conflicting fixed positions (first one wins)', () => {
    const mandatory: MandatoryTrack[] = [
      { uri: 'winner', positionRange: { min: 1, max: 1 } },
      { uri: 'loser', positionRange: { min: 1, max: 1 } }
    ];

    const result = slotManager.arrangePlaylist(mandatory, [], [], 5);

    expect(result[0]).toBe('winner');
    // 'loser' should either be placed elsewhere or dropped if no slots (here it should be placed in next available slot in Phase C)
    expect(result).toContain('loser');
    expect(result.indexOf('loser')).toBeGreaterThan(0);
  });

  it('should place mandatory tracks even if their range is full (fallback to any empty slot)', () => {
    const mandatory: MandatoryTrack[] = [
      { uri: 'fix1', positionRange: { min: 1, max: 1 } },
      { uri: 'fix2', positionRange: { min: 2, max: 2 } },
      { uri: 'ranged', positionRange: { min: 1, max: 2 } } // Range [1,2] is full!
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
    const mandatory: MandatoryTrack[] = [{ uri: 'm1', positionRange: { min: 1, max: 1 } }];
    const result = slotManager.arrangePlaylist(mandatory, [], [], 5);
    expect(result).toEqual(['m1']); // Filtered out nulls
  });
});
