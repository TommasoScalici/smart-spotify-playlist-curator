import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ProcessingResult, TrackWithMeta } from './types-internal';

export class TrackCleaner {
  /**
   * Processes current tracks to apply VIP protection, age cleanup, and size limits.
   * Steps:
   * 1. Map to internal format and Identify VIPs
   * 2. Remove tracks older than maxTrackAgeDays (unless VIP)
   * 3. Enforce max tracks per artist (unless VIP)
   * 4. Enforce hard size limit (removing oldest non-VIPs first)
   * @param currentTracks List of track objects from Spotify (must contain uri and added_at)
   * @param config The playlist configuration
   * @param vipUris Set or array of VIP track URIs
   * @returns ProcessingResult containing kept tracks, tracks to remove, and needed slots
   */
  public processCurrentTracks(
    currentTracks: {
      track: { uri: string; name: string; artists: { name: string }[] };
      added_at: string;
    }[],
    config: PlaylistConfig,
    vipUris: string[],
    targetSizeAfterCleanup?: number // Optional override for aggressive cleaning
  ): ProcessingResult {
    const { curationRules, settings } = config;
    const maxAgeDays = curationRules.maxTrackAgeDays;

    // Use override if provided, otherwise default to settings target
    const effectiveTarget =
      targetSizeAfterCleanup !== undefined ? targetSizeAfterCleanup : settings.targetTotalTracks;

    const now = new Date();

    let tracks: TrackWithMeta[] = currentTracks.map((t, index) => {
      const addedAt = new Date(t.added_at);
      const isVip = vipUris.includes(t.track.uri);
      // Robust artist extraction
      const artist =
        t.track.artists && t.track.artists.length > 0 ? t.track.artists[0].name : 'Unknown Artist';

      return {
        uri: t.track.uri,
        name: t.track.name,
        artist: artist,
        addedAt: addedAt,
        isVip: isVip,
        originalIndex: index
      };
    });

    const removedUris: string[] = [];

    tracks = tracks.filter((track) => {
      if (track.isVip) return true;

      const ageInMs = now.getTime() - track.addedAt.getTime();
      const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

      if (ageInDays > maxAgeDays) {
        removedUris.push(track.uri);
        return false;
      }
      return true;
    });

    // Group by artist
    const artistCounts: { [key: string]: number } = {};
    const tracksAfterArtistLimit: TrackWithMeta[] = [];

    // Process in order (oldest first)

    for (const track of tracks) {
      if (track.isVip) {
        tracksAfterArtistLimit.push(track);
        continue;
      }

      const count = artistCounts[track.artist] || 0;
      const limit = curationRules.maxTracksPerArtist ?? 2;
      if (count < limit) {
        artistCounts[track.artist] = count + 1;
        tracksAfterArtistLimit.push(track);
      } else {
        removedUris.push(track.uri);
      }
    }
    tracks = tracksAfterArtistLimit;

    if (tracks.length > effectiveTarget) {
      const vips = tracks.filter((t) => t.isVip);
      let nonVips = tracks.filter((t) => !t.isVip);

      // Sort non-VIPs by addedAt (Oldest first)
      nonVips.sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

      // Calculate how many we need to remove
      const slotsForNonVips = Math.max(0, effectiveTarget - vips.length);

      if (nonVips.length > slotsForNonVips) {
        const tracksToKeep = nonVips.slice(nonVips.length - slotsForNonVips);
        const tracksToDrop = nonVips.slice(0, nonVips.length - slotsForNonVips);

        tracksToDrop.forEach((t) => removedUris.push(t.uri));
        nonVips = tracksToKeep;
      }

      tracks = [...vips, ...nonVips];
    }

    const slotsNeeded = Math.max(0, effectiveTarget - tracks.length);

    return {
      keptTracks: tracks,
      tracksToRemove: removedUris,
      slotsNeeded: slotsNeeded
    };
  }
}
