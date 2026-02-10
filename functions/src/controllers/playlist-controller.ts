import { PlaylistMetricsSchema } from '@smart-spotify-curator/shared';
import { logger } from 'firebase-functions/v2';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { db } from '../config/firebase.js';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../services/auth-service.js';

// Request Schema
const GetPlaylistMetricsRequestSchema = z.object({
  playlistId: z.string().startsWith('spotify:playlist:')
});

type GetPlaylistMetricsRequest = z.infer<typeof GetPlaylistMetricsRequestSchema>;

/**
 * Cloud Function Handler: getPlaylistMetrics
 * Fetches real-time metrics for a playlist from Spotify API.
 * Handles token refresh and metadata repair if needed.
 */
export async function getPlaylistMetricsHandler(
  request: CallableRequest<GetPlaylistMetricsRequest>
) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Validate request
  const parseResult = GetPlaylistMetricsRequestSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid playlist ID format');
  }

  const { playlistId } = parseResult.data;
  const spotifyId = playlistId.replace('spotify:playlist:', '');

  try {
    // Get authorized Spotify service with user's token
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

    // --- DATA REPAIR & METADATA SYNC ---
    // Always update imageUrl and owner to keep them fresh (Spotify CDN URLs can expire)
    const playlistRef = db.collection('users').doc(uid).collection('playlists').doc(playlistId);
    const playlistSnap = await playlistRef.get();
    let lastCuratedAt: null | string = null;

    if (playlistSnap.exists) {
      const currentData = playlistSnap.data();
      lastCuratedAt = currentData?.lastCuratedAt || null;

      // Always sync imageUrl and owner from Spotify to prevent stale data
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

    // Determine the most recent activity (either a track added or a curation run)
    const activityDates = [latestTrackAddedAt, lastCuratedAt].filter(Boolean) as string[];
    const latestActivity =
      activityDates.length > 0
        ? new Date(Math.max(...activityDates.map((d) => new Date(d).getTime()))).toISOString()
        : new Date().toISOString(); // Fallback to now if no activity found

    // Extract metrics
    const metrics = {
      description: playlistData.description,
      followers: playlistData.followers || 0,
      imageUrl: playlistData.imageUrl,
      lastUpdated: latestActivity,
      owner: playlistData.owner,
      tracks: playlistData.totalTracks || 0
    };

    // Validate response
    const validatedMetrics = PlaylistMetricsSchema.parse(metrics);

    logger.info(`Fetched metrics for playlist ${spotifyId}`, {
      lastCuratedAt,
      latestTrackAddedAt,
      metrics: validatedMetrics,
      uid
    });

    return validatedMetrics;
  } catch (error) {
    logger.error('Failed to fetch playlist metrics', {
      error: error instanceof Error ? error.message : String(error),
      playlistId,
      uid
    });

    if (error instanceof Error && error.message.includes('invalid_grant')) {
      throw new HttpsError(
        'permission-denied',
        'Spotify connection expired. Please reconnect your account.'
      );
    }

    throw new HttpsError('internal', 'Failed to fetch playlist metrics');
  }
}
