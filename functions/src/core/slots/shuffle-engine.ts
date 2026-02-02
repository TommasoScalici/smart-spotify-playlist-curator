export class ShuffleEngine {
  public static shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Shuffles tracks while enforcing a minimum distance between tracks by the same artist.
   */
  public static shuffleWithRules(
    tracks: { artist: string; name?: string; uri: string }[],
    minArtistDistance = 3
  ): string[] {
    const artistBuckets: Record<string, { artist: string; name?: string; uri: string }[]> = {};
    for (const t of tracks) {
      if (!artistBuckets[t.artist]) artistBuckets[t.artist] = [];
      artistBuckets[t.artist].push(t);
    }

    // Shuffle each bucket internally
    for (const artist in artistBuckets) {
      this.shuffleArray(artistBuckets[artist]);
    }

    const playlist: string[] = [];
    const history: string[] = []; // Track recent artists
    const totalTracks = tracks.length;

    for (let i = 0; i < totalTracks; i++) {
      const allArtists = Object.keys(artistBuckets).filter((a) => artistBuckets[a].length > 0);
      let validCandidates = allArtists.filter((a) => !history.includes(a));

      if (validCandidates.length === 0) {
        validCandidates = allArtists;
      }

      if (validCandidates.length === 0) break;

      // Heuristic: Pick the artist with the MOST remaining tracks
      validCandidates.sort((a, b) => artistBuckets[b].length - artistBuckets[a].length);

      const bestCount = artistBuckets[validCandidates[0]].length;
      const topCandidates = validCandidates.filter((a) => artistBuckets[a].length === bestCount);
      const chosenArtist = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      const track = artistBuckets[chosenArtist].pop();
      if (track) {
        playlist.push(track.uri);
        history.push(chosenArtist);
        if (history.length > minArtistDistance) {
          history.shift();
        }
      }
    }

    return playlist;
  }
}
