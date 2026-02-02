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
    allTracks: PoolTrack[]
  ): string[] {
    const totalSlots = playlist.length;
    const topSlotsLimit = 30;
    const result = [...playlist];

    // 1. Separate AI tracks for top-30 prioritization
    const aiPool = pool.filter((p) => aiTrackUris.has(p.uri));
    const nonAiPool = pool.filter((p) => !aiTrackUris.has(p.uri));

    // A. Prioritize AI tracks in top 30
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

    return result.filter((uri): uri is string => uri !== null);
  }
}
