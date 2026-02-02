import { MandatoryTrack } from '@smart-spotify-curator/shared';

import { MandatoryTrackPlacer } from './slots/mandatory-track-placer';
import { PoolTrack, SelectionStrategy, SizeLimitStrategy } from './slots/selection-strategy';
import { ShuffleEngine } from './slots/shuffle-engine';
import { SlotFiller } from './slots/slot-filler';

export class SlotManager {
  /**
   * Arranges tracks into the playlist grid.
   */
  public arrangePlaylist(
    mandatoryTracks: MandatoryTrack[],
    survivorTracks: PoolTrack[],
    newAiTracks: PoolTrack[],
    totalSlots: number,
    shuffle = true,
    sizeLimitStrategy: SizeLimitStrategy = 'drop_random'
  ): string[] {
    // 1. Prepare candidate pool first to determine available content
    const mandatoryUris = new Set(mandatoryTracks.map((m) => m.uri));
    let pool = [...survivorTracks, ...newAiTracks].filter((t) => !mandatoryUris.has(t.uri));

    // 2. Resize grid if we have fewer tracks than slots (Sparse Mode)
    // accessible content = unique mandatory + unique pool
    const availableContentCount = mandatoryUris.size + pool.length;
    const effectiveTotalSlots = Math.min(totalSlots, availableContentCount);

    const playlist: (null | string)[] = new Array(effectiveTotalSlots).fill(null);

    // 3. Place Mandatory Tracks
    MandatoryTrackPlacer.place(playlist, mandatoryTracks, shuffle);

    // 3. Selection Phase (Truncation)
    const totalEmptySlots = playlist.filter((s) => s === null).length;
    pool = SelectionStrategy.truncatePool(pool, totalEmptySlots, sizeLimitStrategy);

    if (!shuffle) {
      return SlotFiller.fillSequentially(playlist, pool);
    }

    // 4. Shuffle Fill Logic
    const aiTrackUris = new Set(newAiTracks.map((t) => t.uri));
    const allTracksLookup = [...survivorTracks, ...newAiTracks];

    return SlotFiller.fillWithShuffle(playlist, pool, aiTrackUris, allTracksLookup);
  }

  /**
   * Shuffles tracks while enforcing a minimum distance between tracks by the same artist.
   */
  public shuffleWithRules(
    tracks: { artist: string; name?: string; uri: string }[],
    minArtistDistance = 3
  ): string[] {
    return ShuffleEngine.shuffleWithRules(tracks, minArtistDistance);
  }
}

export type { PoolTrack, SizeLimitStrategy };
