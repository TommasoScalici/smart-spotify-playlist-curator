import { MandatoryTrack } from '../types';

export class SlotManager {
  /**
   * Arranges tracks into the playlist grid according to VIP rules and filling remaining slots with shuffled content.
   * @param mandatoryTracks List of mandatory tracks with position ranges
   * @param survivorTracks URIs of existing tracks that survived cleaning
   * @param newAiTracks URIs of newly generated AI tracks
   * @param totalSlots Total size of the playlist
   * @returns Array of track URIs in their final positions
   */
  public arrangePlaylist(
    mandatoryTracks: MandatoryTrack[],
    survivorTracks: { uri: string; artist: string }[],
    newAiTracks: { uri: string; artist: string }[],
    totalSlots: number
  ): string[] {
    // 1. Grid Initialization
    const playlist: (string | null)[] = new Array(totalSlots).fill(null);

    // 2. Phase A: Fixed Positions (min == max)
    for (const meta of mandatoryTracks) {
      const { min, max } = meta.positionRange;
      if (min === max) {
        const index = min - 1;
        if (index >= 0 && index < totalSlots && playlist[index] === null) {
          playlist[index] = meta.uri;
        }
      }
    }

    // 3. Phase B: Ranged VIPs (min != max)
    for (const meta of mandatoryTracks) {
      const { min, max } = meta.positionRange;
      if (min !== max) {
        const start = Math.max(0, min - 1);
        const end = Math.min(totalSlots - 1, max - 1);
        // Try to place in a random valid slot within range.
        // If full, expand search outward (nearest neighbor).
        let placed = false;
        const rangeSlots = [];
        for (let i = start; i <= end; i++) if (playlist[i] === null) rangeSlots.push(i);

        if (rangeSlots.length > 0) {
          const chosen = rangeSlots[Math.floor(Math.random() * rangeSlots.length)];
          playlist[chosen] = meta.uri;
          placed = true;
        } else {
          let offset = 1;
          while (!placed) {
            const left = start - offset;
            const right = end + offset;
            if (left < 0 && right >= totalSlots) break;

            if (left >= 0 && playlist[left] === null) {
              playlist[left] = meta.uri;
              placed = true;
            } else if (right < totalSlots && playlist[right] === null) {
              playlist[right] = meta.uri;
              placed = true;
            }
            offset++;
          }
        }
      }
    }

    // 4. Phase C: Stratified Fill (Top 30 Priority for AI)
    const topSlotsLimit = 30;
    const newAiTracksPool = [...newAiTracks]; // Copy to mutate

    for (let i = 0; i < Math.min(topSlotsLimit, totalSlots); i++) {
      if (playlist[i] === null && newAiTracksPool.length > 0) {
        const track = newAiTracksPool.shift();
        if (track) playlist[i] = track.uri;
      }
    }

    // 5. Phase D: Smart Shuffle & Fill Remaining
    const mandatoryUris = new Set(mandatoryTracks.map((m) => m.uri));
    // Pool = Survivors + Remaining AI (minus mandatory)
    const pool = [...survivorTracks, ...newAiTracksPool].filter((t) => !mandatoryUris.has(t.uri));

    // Group by Artist for Weighted Selection
    const artistBuckets: {
      [artist: string]: { uri: string; artist: string }[];
    } = {};
    for (const t of pool) {
      if (!artistBuckets[t.artist]) artistBuckets[t.artist] = [];
      artistBuckets[t.artist].push(t);
    }

    let artists = Object.keys(artistBuckets);

    // Fill remaining slots
    for (let i = 0; i < totalSlots; i++) {
      if (playlist[i] === null) {
        if (pool.length === 0) break;

        // Look up previous track's artist to prevent clumping.
        // We check both the pool and mandatory tracks (though mandatory tracks don't store artist metadata effectively here, we do our best with the pool).
        let prevArtist: string | null = null;
        if (i > 0 && playlist[i - 1]) {
          const prevUri = playlist[i - 1];
          // Check pool
          const poolMatch = [...survivorTracks, ...newAiTracks].find((t) => t.uri === prevUri);
          if (poolMatch) prevArtist = poolMatch.artist;
          // If prevUri was a VIP not in our pool, we might miss the artist, but this covers most dynamic cases.
        }

        // Weighted Random Pick: Pick an Artist, then pick a track.
        // Filter out empty buckets
        artists = artists.filter((a) => artistBuckets[a].length > 0);

        if (artists.length === 0) break;

        // Anti-Clumping: Filter out previous artist if possible
        let candidates = artists;
        if (prevArtist && artists.length > 1) {
          candidates = artists.filter((a) => a !== prevArtist);
          // If filtering removed everyone (only 1 artist left and it's the prev one), we must use it.
          if (candidates.length === 0) candidates = artists;
        }

        // Perfect strategy: Round Robin on Artists.
        const randomArtistIndex = Math.floor(Math.random() * candidates.length);
        const chosenArtist = candidates[randomArtistIndex];

        const track = artistBuckets[chosenArtist].pop(); // Take one
        if (track) {
          playlist[i] = track.uri;
          // Bug Fix: Do not splice `artists` here using `randomArtistIndex` (which is from candidates array).
          // The filter at start of loop `artists = artists.filter(...)` will naturally remove empty buckets next iteration.
        }
      }
    }

    return playlist.filter((uri): uri is string => uri !== null);
  }
}
