import * as logger from 'firebase-functions/logger';

import { PlaylistConfig, PlaylistConfigSchema } from '@smart-spotify-curator/shared';

import { db } from '../config/firebase';

const PLAYLISTS_COLLECTION = 'playlists';

export class ConfigService {
  /**
   * Fetches a specific playlist configuration by ID.
   * @param playlistId - The Spotify ID of the playlist
   * @returns The validated configuration or null if not found
   */
  async getPlaylistConfig(playlistId: string): Promise<PlaylistConfig | null> {
    try {
      // Use Collection Group to find the playlist anywhere
      const snapshot = await db
        .collectionGroup(PLAYLISTS_COLLECTION)
        .where('id', '==', playlistId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const data = snapshot.docs[0].data();
      const doc = snapshot.docs[0];
      const ownerId = doc.ref.parent.parent?.id;

      if (!ownerId) {
        logger.warn(`Playlist ${playlistId} has no parent user.`);
        throw new Error('Playlist owner could not be determined.');
      }

      const configWithUser = { ...data, ownerId };
      const parseResult = PlaylistConfigSchema.safeParse(configWithUser);

      if (parseResult.success) {
        return parseResult.data as PlaylistConfig;
      } else {
        logger.error(`Invalid configuration for playlist ${playlistId}:`, {
          issues: parseResult.error.issues,
          receivedData: configWithUser
        });
        throw new Error(
          `Invalid configuration stored for ${playlistId}. Details: ${parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
    } catch (error) {
      logger.error(`Error fetching playlist ${playlistId}:`, error);
      throw error;
    }
  }
}
