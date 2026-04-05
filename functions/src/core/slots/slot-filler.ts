import { normalizeSpotifyUri } from '@smart-spotify-curator/shared';

import { PoolTrack } from './selection-strategy';

export class SlotFiller {
  /**
   * Fills empty slots in a playlist grid sequentially.
   */
  public static fillSequentially(playlist: (null | string)[], pool: PoolTrack[]): string[] {
    const workingPool = [...pool];
    const result = [...playlist];
    for (let i = 0; i < result.length; i++) {
      if (result[i] === null && workingPool.length > 0) {
        const track = workingPool.shift();
        if (track) result[i] = track.uri;
      }
    }
    return result.filter((uri): uri is string => uri !== null);
  }

  /**
   * Fills empty slots in a playlist grid using shuffle priority and artist distance rules.
   */
  public static fillWithShuffle(
    playlist: (null | string)[],
    pool: PoolTrack[],
    aiTrackUris: Set<string>,
    allTracks: PoolTrack[],
    mandatoryUris: Set<string>
  ): string[] {
    const totalSlots = playlist.length;
    const topSlotsLimit = 30;
    const result = [...playlist];

    // Record which indices in the grid were placed by MandatoryTrackPlacer.
    // These indices are LOCKED — no swap may touch them.
    const vipIndices = new Set<number>();
    for (let i = 0; i < result.length; i++) {
      if (result[i] !== null && mandatoryUris.has(normalizeSpotifyUri(result[i]!))) {
        vipIndices.add(i);
      }
    }

    // 1. Separate AI tracks for top-30 prioritization
    const normalizedAiUris = new Set([...aiTrackUris].map((u) => normalizeSpotifyUri(u)));
    const aiPool = pool.filter((p) => normalizedAiUris.has(normalizeSpotifyUri(p.uri)));
    const nonAiPool = pool.filter((p) => !normalizedAiUris.has(normalizeSpotifyUri(p.uri)));

    // A. Prioritize AI tracks in top 30 (skip VIP-locked slots)
    for (let i = 0; i < Math.min(topSlotsLimit, totalSlots); i++) {
      if (result[i] === null && aiPool.length > 0) {
        const track = aiPool.shift();
        if (track) result[i] = track.uri;
      }
    }

    // 2. Build Artist Buckets from remaining tracks
    const remainingPool = [...aiPool, ...nonAiPool];
    const artistBuckets: Record<string, PoolTrack[]> = {};
    for (const t of remainingPool) {
      if (!artistBuckets[t.artist]) artistBuckets[t.artist] = [];
      artistBuckets[t.artist].push(t);
    }

    // 3. Fill remaining empty slots
    for (let i = 0; i < totalSlots; i++) {
      if (result[i] === null) {
        const activeArtists = Object.keys(artistBuckets).filter((a) => artistBuckets[a].length > 0);
        if (activeArtists.length === 0) break;

        // Get artist of previous track for anti-clumping
        let prevArtist: null | string = null;
        if (i > 0 && result[i - 1]) {
          const prevUri = result[i - 1];
          const match = allTracks.find((t) => t.uri === prevUri);
          if (match) prevArtist = match.artist;
        }

        let candidates = activeArtists;
        if (prevArtist && activeArtists.length > 1) {
          candidates = activeArtists.filter((a) => a !== prevArtist);
          if (candidates.length === 0) candidates = activeArtists;
        }

        const chosenArtist = candidates[Math.floor(Math.random() * candidates.length)];
        const track = artistBuckets[chosenArtist].pop();
        if (track) result[i] = track.uri;
      }
    }

    const finalResult = result.filter((uri): uri is string => uri !== null);

    // 4. Post-processing: Remove adjacent tracks by the same artist.
    // CRITICAL: Never swap a track at a VIP-locked index.
    for (let i = 1; i < finalResult.length; i++) {
      // Skip if either position is VIP-locked
      if (vipIndices.has(i) || vipIndices.has(i - 1)) continue;

      const prevUri = finalResult[i - 1];
      const currUri = finalResult[i];

      const prevArtist = allTracks.find((t) => t.uri === prevUri)?.artist;
      const currArtist = allTracks.find((t) => t.uri === currUri)?.artist;

      if (prevArtist && currArtist && prevArtist === currArtist) {
        // Find a candidate to swap with `currUri`
        for (let j = 0; j < finalResult.length; j++) {
          if (i === j || j === i - 1) continue;

          // Never swap into or out of a VIP-locked index
          if (vipIndices.has(j)) continue;

          const swapUri = finalResult[j];

          const swapArtist = allTracks.find((t) => t.uri === swapUri)?.artist;
          if (!swapArtist) continue;

          const beforeSwapArtist =
            j > 0 ? allTracks.find((t) => t.uri === finalResult[j - 1])?.artist : null;
          const afterSwapArtist =
            j < finalResult.length - 1
              ? allTracks.find((t) => t.uri === finalResult[j + 1])?.artist
              : null;
          const afterCurrArtist =
            i < finalResult.length - 1
              ? allTracks.find((t) => t.uri === finalResult[i + 1])?.artist
              : null;

          // Check if swapping creates new adjacencies
          if (
            swapArtist !== currArtist && // Current track fits in swap spot?
            beforeSwapArtist !== currArtist &&
            afterSwapArtist !== currArtist &&
            swapArtist !== prevArtist && // Swap track fits in current spot?
            swapArtist !== afterCurrArtist
          ) {
            // Perform swap
            finalResult[i] = swapUri;
            finalResult[j] = currUri;
            break;
          }
        }
      }
    }

    return finalResult;
  }
}
