import { describe, expect, it } from 'vitest';

import { MandatoryTrack } from '@smart-spotify-curator/shared';

import { SlotManager } from '../../src/core/slot-manager';

describe('SlotManager - Size Limit Strategies', () => {
  const slotManager = new SlotManager();

  const createTrack = (id: string, ageDays: number, popularity: number) => {
    const addedAt = new Date();
    addedAt.setDate(addedAt.getDate() - ageDays);
    return {
      uri: `spotify:track:${id}`,
      artist: 'Artist A',
      addedAt,
      popularity
    };
  };

  const pool = [
    createTrack('OLD_POPULAR', 10, 90), // Oldest
    createTrack('MID_NICH', 5, 20),
    createTrack('NEW_POP_STAR', 1, 95), // Newest, Most Popular
    createTrack('MID_UNPOP', 4, 10) // Least Popular
  ];

  const mandatory: MandatoryTrack[] = [];

  it('drop_newest strategy: should keep the oldest tracks', () => {
    // Want to keep 2 tracks. Oldest are OLD_POPULAR (10d) and MID_NICH (5d)
    const result = slotManager.arrangePlaylist(mandatory, pool, [], 2, false, 'drop_newest');
    expect(result).toHaveLength(2);
    expect(result).toContain('spotify:track:OLD_POPULAR');
    expect(result).toContain('spotify:track:MID_NICH');
  });

  it('drop_oldest strategy: should keep the newest tracks', () => {
    // Newest are NEW_POP_STAR (1d) and MID_UNPOP (4d)
    const result = slotManager.arrangePlaylist(mandatory, pool, [], 2, false, 'drop_oldest');
    expect(result).toHaveLength(2);
    expect(result).toContain('spotify:track:NEW_POP_STAR');
    expect(result).toContain('spotify:track:MID_UNPOP');
  });

  it('drop_most_popular strategy: should keep the least popular (niche)', () => {
    // Least popular are MID_UNPOP (10) and MID_NICH (20)
    const result = slotManager.arrangePlaylist(mandatory, pool, [], 2, false, 'drop_most_popular');
    expect(result).toHaveLength(2);
    expect(result).toContain('spotify:track:MID_UNPOP');
    expect(result).toContain('spotify:track:MID_NICH');
  });

  it('drop_least_popular strategy: should keep the most popular (hits)', () => {
    // Most popular are NEW_POP_STAR (95) and OLD_POPULAR (90)
    const result = slotManager.arrangePlaylist(mandatory, pool, [], 2, false, 'drop_least_popular');
    expect(result).toHaveLength(2);
    expect(result).toContain('spotify:track:NEW_POP_STAR');
    expect(result).toContain('spotify:track:OLD_POPULAR');
  });

  it('drop_random strategy: should return requested number of tracks', () => {
    const result = slotManager.arrangePlaylist(mandatory, pool, [], 2, false, 'drop_random');
    expect(result).toHaveLength(2);
  });

  it('should handle missing metadata gracefully (defaulting to 0/epoch)', () => {
    const poorPool = [
      { uri: 'no_meta_1', artist: 'A' },
      { uri: 'no_meta_2', artist: 'B' }
    ];
    // Should not crash and return results
    const result = slotManager.arrangePlaylist(
      mandatory,
      poorPool,
      [],
      1,
      false,
      'drop_most_popular'
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBeDefined();
  });
});
