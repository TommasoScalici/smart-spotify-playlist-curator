import { PlaylistConfig, TrackInfo } from '@smart-spotify-curator/shared';

import { TrackWithMeta } from './types-internal';

export type RemovalReason = 'artist_limit' | 'duplicate' | 'expired' | 'size_limit';

export interface RemovedTrack {
  artist: string;
  name: string;
  reason: RemovalReason;
  uri: string;
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
    removedTracks: RemovedTrack[];
    survivingTracks: TrackWithMeta[];
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
      const normalizedName = item.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedArtist = item.artist.toLowerCase().replace(/\s+/g, ' ').trim();
      const normalizedAlbum = item.album.toLowerCase().replace(/\s+/g, ' ').trim();
      const signature = `${normalizedName}:${normalizedArtist}:${normalizedAlbum}`;

      // 1. Deduplication (Same URI or Same Metadata Signature)
      if (
        curationRules.removeDuplicates &&
        (seenUris.has(item.uri) || seenSignatures.has(signature))
      ) {
        removedTracks.push({
          artist: item.artist,
          name: item.name,
          reason: 'duplicate',
          uri: item.uri
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
          artist: item.artist,
          name: item.name,
          reason: 'expired',
          uri: item.uri
        });
        continue;
      }

      // 3. Artist Limit Check (Protect VIPs)
      const primaryArtist = item.artist.split(',')[0].trim().toLowerCase();
      const isVarious = primaryArtist === 'various artists';

      if (!isVarious) {
        const count = artistCounts[primaryArtist] || 0;

        if (!isVip && count >= curationRules.maxTracksPerArtist) {
          removedTracks.push({
            artist: item.artist,
            name: item.name,
            reason: 'artist_limit',
            uri: item.uri
          });
          continue;
        }

        artistCounts[primaryArtist] = count + 1;
      }

      survivingTracks.push({
        addedAt: new Date(item.addedAt),
        album: item.album,
        artist: item.artist,
        isVip,
        name: item.name,
        popularity: item.popularity,
        uri: item.uri
      });
    }

    return { removedTracks, survivingTracks };
  }
}
