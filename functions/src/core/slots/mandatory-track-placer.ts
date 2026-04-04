import { MandatoryTrack, normalizeSpotifyUri } from '@smart-spotify-curator/shared';

export class MandatoryTrackPlacer {
  public static place(
    playlist: (null | string)[],
    mandatoryTracks: MandatoryTrack[],
    shuffle: boolean = true
  ): void {
    const totalSlots = playlist.length;

    // Phase A: Fixed Positions
    for (const meta of mandatoryTracks) {
      const { max, min } = meta.positionRange;
      if (min === max) {
        const index = min - 1;
        if (index >= 0 && index < totalSlots && playlist[index] === null) {
          playlist[index] = meta.uri;
        }
      }
    }

    // Phase B: Ranged VIPs
    for (const meta of mandatoryTracks) {
      const { max, min } = meta.positionRange;
      if (min !== max) {
        const start = Math.max(0, Math.min(totalSlots - 1, min - 1));
        const end = Math.max(start, Math.min(totalSlots - 1, max - 1));

        const rangeSlots = [];
        for (let i = start; i <= end; i++) {
          if (playlist[i] === null) rangeSlots.push(i);
        }

        if (rangeSlots.length > 0) {
          const chosen = shuffle
            ? rangeSlots[Math.floor(Math.random() * rangeSlots.length)]
            : rangeSlots[0];
          playlist[chosen] = meta.uri;
        } else {
          // Fallback nearest neighbor
          this.placeUsingNearestNeighbor(playlist, meta.uri, start, end);
        }
      }
    }

    // Phase C: Fallback for unplaced tracks
    const targetCount = new Map<string, number>();
    for (const m of mandatoryTracks) {
      const norm = normalizeSpotifyUri(m.uri);
      targetCount.set(norm, (targetCount.get(norm) || 0) + 1);
    }

    const actualCount = new Map<string, number>();
    playlist.forEach((uri) => {
      if (uri !== null) {
        const norm = normalizeSpotifyUri(uri);
        actualCount.set(norm, (actualCount.get(norm) || 0) + 1);
      }
    });

    for (const meta of mandatoryTracks) {
      const norm = normalizeSpotifyUri(meta.uri);
      const target = targetCount.get(norm) || 1; // At least one
      const current = actualCount.get(norm) || 0;

      if (current < target) {
        const emptyIndex = playlist.indexOf(null);
        if (emptyIndex !== -1) {
          playlist[emptyIndex] = meta.uri;
          actualCount.set(norm, current + 1);
        }
      }
    }
  }

  private static placeUsingNearestNeighbor(
    playlist: (null | string)[],
    uri: string,
    start: number,
    end: number
  ): void {
    let offset = 1;
    let placed = false;
    const totalSlots = playlist.length;

    while (!placed) {
      const left = start - offset;
      const right = end + offset;
      if (left < 0 && right >= totalSlots) break;

      if (left >= 0 && playlist[left] === null) {
        playlist[left] = uri;
        placed = true;
      } else if (right < totalSlots && playlist[right] === null) {
        playlist[right] = uri;
        placed = true;
      }
      offset++;
    }
  }
}
