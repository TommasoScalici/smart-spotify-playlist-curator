import { PlaylistConfig, TrackInfo } from '@smart-spotify-curator/shared';
import { TrackWithMeta } from './types-internal';

export type RemovalReason = 'duplicate' | 'expired' | 'artist_limit' | 'size_limit';

export interface RemovedTrack {
  uri: string;
  name: string;
  artist: string;
  reason: RemovalReason;
}

export class TrackCleaner {
  /**
   * Processes current tracks to apply VIP protection, age cleanup, and artist limits.
   * @param currentTracks List of TrackInfo from Spotify
   * @param config The playlist configuration
   * @param vipUris Array of VIP track URIs
   * @returns Surviving tracks and list of removed tracks with reasons
   */
  public processCurrentTracks(
    currentTracks: TrackInfo[],
    config: PlaylistConfig,
    vipUris: string[]
  ): {
    survivingTracks: TrackWithMeta[];
    removedTracks: RemovedTrack[];
  } {
    const { curationRules } = config;
    const now = Date.now();
    const maxAgeMs = curationRules.maxTrackAgeDays * 24 * 60 * 60 * 1000;
    const vipSet = new Set(vipUris);

    const survivingTracks: TrackWithMeta[] = [];
    const removedTracks: RemovedTrack[] = [];

    const seenUris = new Set<string>();
    const seenSignatures = new Set<string>();
    const artistCounts: Record<string, number> = {};

    for (const item of currentTracks) {
      const normalizedName = item.name.trim().toLowerCase();
      const normalizedArtist = item.artist.trim().toLowerCase();
      const normalizedAlbum = item.album.trim().toLowerCase();
      const signature = `${normalizedName}:${normalizedArtist}:${normalizedAlbum}`;

      // 1. Deduplication (Same URI or Same Metadata Signature)
      if (
        curationRules.removeDuplicates &&
        (seenUris.has(item.uri) || seenSignatures.has(signature))
      ) {
        removedTracks.push({
          uri: item.uri,
          name: item.name,
          artist: item.artist,
          reason: 'duplicate'
        });
        continue;
      }
      seenUris.add(item.uri);
      seenSignatures.add(signature);

      const isVip = vipSet.has(item.uri);
      const addedAtTime = new Date(item.addedAt).getTime();

      // 2. Age Check (Protect VIPs)
      if (!isVip && now - addedAtTime > maxAgeMs) {
        removedTracks.push({
          uri: item.uri,
          name: item.name,
          artist: item.artist,
          reason: 'expired'
        });
        continue;
      }

      // 3. Artist Limit Check (Protect VIPs)
      if (!isVip) {
        const primaryArtist = item.artist.split(',')[0].trim().toLowerCase();
        const isVarious = primaryArtist === 'various artists';

        if (!isVarious) {
          const count = artistCounts[primaryArtist] || 0;
          if (count >= curationRules.maxTracksPerArtist) {
            removedTracks.push({
              uri: item.uri,
              name: item.name,
              artist: item.artist,
              reason: 'artist_limit'
            });
            continue;
          }
          artistCounts[primaryArtist] = count + 1;
        }
      }

      survivingTracks.push({
        uri: item.uri,
        artist: item.artist,
        name: item.name,
        album: item.album,
        addedAt: new Date(item.addedAt),
        isVip,
        popularity: item.popularity
      });
    }

    return { survivingTracks, removedTracks };
  }
}
