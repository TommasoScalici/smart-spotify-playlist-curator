import { getPlaylistDocId, PlaylistMetrics } from '@smart-spotify-curator/shared';
import * as logger from 'firebase-functions/logger';

import { db } from '../admin/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from './auth-service.js';

export class PlaylistUseCase {
  public async getMetrics(uid: string, playlistId: string): Promise<PlaylistMetrics> {
    const spotifyId = playlistId.replace('spotify:playlist:', '');
    const { originalRefreshToken, service } = await getAuthorizedSpotifyService(uid);

    // Fetch playlist metadata from Spotify
    const playlistData = await service.getPlaylistDetails(spotifyId);

    // Persist any token updates
    await persistSpotifyTokens(uid, service, originalRefreshToken);

    // Fetch latest track addition date
    const latestTrackAddedAt = await service.getLatestTrackAddedAt(
      spotifyId,
      playlistData.totalTracks
    );

    // Data Repair & Metadata Sync
    const deterministicId = getPlaylistDocId(playlistId);
    const playlistRef = db
      .collection('users')
      .doc(uid)
      .collection('playlists')
      .doc(deterministicId);

    const playlistSnap = await playlistRef.get();
    let lastCuratedAt: null | string = null;

    if (playlistSnap.exists) {
      const currentData = playlistSnap.data();
      lastCuratedAt = currentData?.lastCuratedAt || null;

      const needsUpdate =
        playlistData.imageUrl !== currentData?.imageUrl ||
        playlistData.owner !== currentData?.owner;

      if (needsUpdate) {
        logger.info(`Syncing fresh metadata for playlist ${spotifyId}`);
        await playlistRef.update({
          imageUrl: playlistData.imageUrl || '',
          owner: playlistData.owner || 'Unknown'
        });
      }
    }

    const activityDates = [latestTrackAddedAt, lastCuratedAt].filter(Boolean) as string[];
    const latestActivity =
      activityDates.length > 0
        ? new Date(Math.max(...activityDates.map((d) => new Date(d).getTime()))).toISOString()
        : new Date().toISOString();

    return {
      description: playlistData.description,
      followers: playlistData.followers || 0,
      imageUrl: playlistData.imageUrl,
      lastUpdated: latestActivity,
      owner: playlistData.owner,
      tracks: playlistData.totalTracks || 0
    };
  }
}
