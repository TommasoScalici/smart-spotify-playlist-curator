import { MandatoryTrack } from '@smart-spotify-curator/shared';

export class SlotManager {
  /**
   * Arranges tracks into the playlist grid according to VIP rules and filling remaining slots with shuffled content.
   * Steps:
   * 1. Grid Initialization
   * 2. Phase A: Fixed Positions (min == max)
   * 3. Phase B: Ranged VIPs (min != max)
   * 4. Phase C: Stratified Fill (Top 30 Priority for AI)
   * 5. Phase D: Smart Shuffle & Fill Remaining
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
    totalSlots: number,
    shuffle: boolean = true
  ): string[] {
    const playlist: (string | null)[] = new Array(totalSlots).fill(null);

    // Phase A & B: Mandatory Tracks (Always Fixed)
    for (const meta of mandatoryTracks) {
      const { min, max } = meta.positionRange;
      if (min === max) {
        const index = min - 1;
        if (index >= 0 && index < totalSlots && playlist[index] === null) {
          playlist[index] = meta.uri;
        }
      }
    }

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
          // If shuffle is off, pick the first available slot (deterministic)
          // If shuffle is on, pick random
          const chosen = shuffle
            ? rangeSlots[Math.floor(Math.random() * rangeSlots.length)]
            : rangeSlots[0];

          playlist[chosen] = meta.uri;
          placed = true;
        } else {
          // Fallback nearest neighbor (logic handles both cases naturally)
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

    // Phase C: Fallback Placement for Unplaced Mandatory Tracks
    // If ranges were invalid or full, force place them in ANY empty slot.
    const placedUris = new Set(playlist.filter((uri): uri is string => uri !== null));
    for (const meta of mandatoryTracks) {
      if (!placedUris.has(meta.uri)) {
        // Find first empty slot
        const emptyIndex = playlist.indexOf(null);
        if (emptyIndex !== -1) {
          playlist[emptyIndex] = meta.uri;
          placedUris.add(meta.uri);
        }
      }
    }

    const mandatoryUris = new Set(mandatoryTracks.map((m) => m.uri));

    // Pool = Survivors + AI (minus mandatory)
    // IMPORTANT: If shuffle=false, order matters. Survivors first, then AI.
    const pool = [...survivorTracks, ...newAiTracks].filter((t) => !mandatoryUris.has(t.uri));

    if (!shuffle) {
      // SEQUENTIAL FILL
      for (let i = 0; i < totalSlots; i++) {
        if (playlist[i] === null && pool.length > 0) {
          const track = pool.shift();
          if (track) playlist[i] = track.uri;
        }
      }
      return playlist.filter((uri): uri is string => uri !== null);
    }

    // SHUFFLE FILL LOGIC (Existing logic)

    // Prioritize new AI tracks in top 30 slots if possible (Feature Requirement)
    const topSlotsLimit = 30;

    // Note: The original logic prioritized AI tracks specifically.
    // If we want to preserve that behavior, we should prioritize picking AI tracks for empty slots < 30.
    // But then we remove them from the general 'pool'.

    // Re-creating the pools to match original logic style but using the main `pool` source is cleaner,
    // but the original logic had a specific "Phase C" for AI.

    // Let's adapt the original logic:
    const newAiTracksPool = pool.filter((p) => newAiTracks.some((a) => a.uri === p.uri));

    // Original logic: Fill empty slots < 30 with AI tracks first
    for (let i = 0; i < Math.min(topSlotsLimit, totalSlots); i++) {
      if (playlist[i] === null && newAiTracksPool.length > 0) {
        // Random pick or sequential? Original logic was sequential pop() from aiTracksPool (which was copy).
        // Original: const track = newAiTracksPool.shift();
        const track = newAiTracksPool.shift();
        if (track) {
          playlist[i] = track.uri;
          // Remove from main pool reference effectively?
          // We need a unified pool for the Weighted Random Pick phase.
        }
      }
    }

    // Now rebuild the pool for the rest (Survivors + Remaining AI)
    // We already used some AI tracks.
    // The safest way is to filter `pool` by what's NOT in `playlist` yet.
    const currentPlaced = new Set(playlist.filter(Boolean));
    const remainingPool = pool.filter((t) => !currentPlaced.has(t.uri));

    // Group by Artist for Weighted Selection
    const artistBuckets: {
      [artist: string]: { uri: string; artist: string }[];
    } = {};
    for (const t of remainingPool) {
      if (!artistBuckets[t.artist]) artistBuckets[t.artist] = [];
      artistBuckets[t.artist].push(t);
    }

    let artists = Object.keys(artistBuckets);

    // Fill remaining slots
    for (let i = 0; i < totalSlots; i++) {
      if (playlist[i] === null) {
        if (remainingPool.length === 0) break; // Should verify if remainingPool tracks are exhausted

        // Look up previous track's artist to prevent clumping.
        let prevArtist: string | null = null;
        if (i > 0 && playlist[i - 1]) {
          const prevUri = playlist[i - 1];
          const poolMatch = [...survivorTracks, ...newAiTracks].find((t) => t.uri === prevUri);
          if (poolMatch) prevArtist = poolMatch.artist;
        }

        // Weighted Random Pick: Pick an Artist, then pick a track.
        artists = artists.filter((a) => artistBuckets[a].length > 0);

        if (artists.length === 0) break;

        // Anti-Clumping
        let candidates = artists;
        if (prevArtist && artists.length > 1) {
          candidates = artists.filter((a) => a !== prevArtist);
          if (candidates.length === 0) candidates = artists;
        }

        // Round Robin / Random Artist
        const randomArtistIndex = Math.floor(Math.random() * candidates.length);
        const chosenArtist = candidates[randomArtistIndex];

        const track = artistBuckets[chosenArtist].pop(); // Take one
        if (track) {
          playlist[i] = track.uri;
        }
      }
    }

    return playlist.filter((uri): uri is string => uri !== null);
  }
  /**
   * Shuffles tracks while enforcing a minimum distance between tracks by the same artist.
   * Shuffles tracks while enforcing a minimum distance between tracks by the same artist.
   * Steps:
   * 1. Bucket by Artist and shuffle internally
   * 2. Build playlist using "most remaining tracks" heuristic
   * 3. Update history to enforce minimum distance
   */
  public shuffleWithRules(
    tracks: { uri: string; artist: string; name?: string }[],
    minArtistDistance = 3
  ): string[] {
    const artistBuckets: Record<string, { uri: string; artist: string; name?: string }[]> = {};
    for (const t of tracks) {
      if (!artistBuckets[t.artist]) artistBuckets[t.artist] = [];
      artistBuckets[t.artist].push(t);
    }

    // Shuffle each bucket internally to randomize track order for that artist
    for (const artist in artistBuckets) {
      this.shuffleArray(artistBuckets[artist]);
    }

    const playlist: string[] = [];
    const history: string[] = []; // Track recent artists
    const totalTracks = tracks.length;

    for (let i = 0; i < totalTracks; i++) {
      // Find valid candidates (artists with tracks remaining who are NOT in recent history)
      const allArtists = Object.keys(artistBuckets).filter((a) => artistBuckets[a].length > 0);

      let validCandidates = allArtists.filter((a) => !history.includes(a));

      // If everyone is on cooldown/restricted, we must break the rule.
      // In that case, pick from all available artists.
      if (validCandidates.length === 0) {
        validCandidates = allArtists;
      }

      if (validCandidates.length === 0) break; // Should not happen if i < totalTracks

      // Heuristic: Pick the artist with the MOST remaining tracks to avoid running out of "buffer" later.
      // If ties, pick random among top.
      validCandidates.sort((a, b) => artistBuckets[b].length - artistBuckets[a].length);

      const bestCount = artistBuckets[validCandidates[0]].length;
      const topCandidates = validCandidates.filter((a) => artistBuckets[a].length === bestCount);
      const chosenArtist = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      // Place track
      const track = artistBuckets[chosenArtist].pop();
      if (track) {
        playlist.push(track.uri);

        // Update History
        history.push(chosenArtist);
        if (history.length > minArtistDistance) {
          history.shift();
        }
      }
    }

    return playlist;
  }

  private shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
