import { MandatoryTrack } from '@smart-spotify-curator/shared';

export class MandatoryTrackPlacer {
  public static place(
    playlist: (string | null)[],
    mandatoryTracks: MandatoryTrack[],
    shuffle: boolean = true
  ): void {
    const totalSlots = playlist.length;

    // Phase A: Fixed Positions
    for (const meta of mandatoryTracks) {
      const { min, max } = meta.positionRange;
      if (min === max) {
        const index = min - 1;
        if (index >= 0 && index < totalSlots && playlist[index] === null) {
          playlist[index] = meta.uri;
        }
      }
    }

    // Phase B: Ranged VIPs
    for (const meta of mandatoryTracks) {
      const { min, max } = meta.positionRange;
      if (min !== max) {
        const start = Math.max(0, min - 1);
        const end = Math.min(totalSlots - 1, max - 1);

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
    const placedUris = new Set(playlist.filter((uri): uri is string => uri !== null));
    for (const meta of mandatoryTracks) {
      if (!placedUris.has(meta.uri)) {
        const emptyIndex = playlist.indexOf(null);
        if (emptyIndex !== -1) {
          playlist[emptyIndex] = meta.uri;
          placedUris.add(meta.uri);
        }
      }
    }
  }

  private static placeUsingNearestNeighbor(
    playlist: (string | null)[],
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
