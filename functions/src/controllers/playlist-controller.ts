import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { getAuthorizedSpotifyService, persistSpotifyTokens } from '../index';
import { logger } from 'firebase-functions/v2';

// Request Schema
const GetPlaylistMetricsRequestSchema = z.object({
  playlistId: z.string().startsWith('spotify:playlist:')
});

// Response Schema
const PlaylistMetricsSchema = z.object({
  followers: z.number(),
  tracks: z.number(),
  lastUpdated: z.string(), // ISO 8601 timestamp
  imageUrl: z.string().url().optional().nullable(),
  owner: z.string().optional(),
  description: z.string().optional()
});

import { db } from '../config/firebase';

/**
 * Cloud Function: getPlaylistMetrics
 * Fetches real-time metrics for a playlist from Spotify API.
 * Handles token refresh and metadata repair if needed.
 */
export const getPlaylistMetrics = onCall(
  {
    cors: true,
    secrets: [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REFRESH_TOKEN',
      'GOOGLE_AI_API_KEY'
    ]
  },
  async (request) => {
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
      const { service, originalRefreshToken } = await getAuthorizedSpotifyService(uid);

      // Fetch playlist metadata from Spotify
      const playlistData = await service.getPlaylistDetails(spotifyId);

      // Persist any token updates
      await persistSpotifyTokens(uid, service, originalRefreshToken);

      // Fetch latest track addition date
      const latestTrackAddedAt = await service.getLatestTrackAddedAt(
        spotifyId,
        playlistData.totalTracks
      );

      // --- DATA REPAIR & METADATA FETCH ---
      const playlistRef = db.collection('users').doc(uid).collection('playlists').doc(playlistId);
      const playlistSnap = await playlistRef.get();
      let lastCuratedAt: string | null = null;

      if (playlistSnap.exists) {
        const currentData = playlistSnap.data();
        lastCuratedAt = currentData?.lastCuratedAt || null;
        const needsUpdate = !currentData?.imageUrl || !currentData?.owner;

        if (needsUpdate) {
          logger.info(`Repairing metadata for playlist ${spotifyId}`);
          await playlistRef.update({
            imageUrl: playlistData.imageUrl || currentData?.imageUrl || '',
            owner: playlistData.owner || currentData?.owner || 'Unknown'
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
        followers: playlistData.followers || 0,
        tracks: playlistData.totalTracks || 0,
        lastUpdated: latestActivity,
        imageUrl: playlistData.imageUrl,
        owner: playlistData.owner,
        description: playlistData.description
      };

      // Validate response
      const validatedMetrics = PlaylistMetricsSchema.parse(metrics);

      logger.info(`Fetched metrics for playlist ${spotifyId}`, {
        uid,
        metrics: validatedMetrics,
        latestTrackAddedAt,
        lastCuratedAt
      });

      return validatedMetrics;
    } catch (error) {
      logger.error('Failed to fetch playlist metrics', {
        uid,
        playlistId,
        error: error instanceof Error ? error.message : String(error)
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
);
