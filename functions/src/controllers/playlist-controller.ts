import { PlaylistMetricsSchema } from '@smart-spotify-curator/shared';
import { logger } from 'firebase-functions/v2';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { PlaylistUseCase } from '../core/playlist-usecase.js';

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

  try {
    const useCase = new PlaylistUseCase();
    const metrics = await useCase.getMetrics(uid, playlistId);

    // Validate response
    const validatedMetrics = PlaylistMetricsSchema.parse(metrics);

    logger.info(`Fetched metrics for playlist ${playlistId}`, {
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
