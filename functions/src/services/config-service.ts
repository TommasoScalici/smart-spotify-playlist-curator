import { db } from '../config/firebase';
import { PlaylistConfig } from '../types';
import { PlaylistConfigSchema } from '../config/config';
import * as logger from 'firebase-functions/logger';

const PLAYLISTS_COLLECTION = 'playlists';

export class ConfigService {
  /**
   * Fetches all enabled playlist configurations from Firestore.
   * Validates each config against the Zod schema.
   */
  async getEnabledPlaylists(): Promise<PlaylistConfig[]> {
    try {
      const snapshot = await db.collection(PLAYLISTS_COLLECTION).where('enabled', '==', true).get();

      if (snapshot.empty) {
        logger.info('No enabled playlists found in Firestore.');
        return [];
      }

      const validConfigs: PlaylistConfig[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const parseResult = PlaylistConfigSchema.safeParse(data);

        if (parseResult.success) {
          validConfigs.push(parseResult.data as PlaylistConfig);
        } else {
          logger.error(`Invalid configuration for playlist ${doc.id}:`, parseResult.error);
        }
      }

      return validConfigs;
    } catch (error) {
      logger.error('Error fetching playlists from Firestore:', error);
      throw new Error('Failed to load configuration from database.');
    }
  }

  /**
   * Fetches a specific playlist configuration by ID.
   */
  async getPlaylistConfig(playlistId: string): Promise<PlaylistConfig | null> {
    try {
      // Document IDs should probably map to the spotify playlist ID for easy lookup,
      // or we query by the 'id' field if we use generic auto-ids.
      // Design decision: Use Spotify URI (cleaned) or just query the field.
      // Let's assume we use query for now to be safe on doc ID format.
      const snapshot = await db
        .collection(PLAYLISTS_COLLECTION)
        .where('id', '==', playlistId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const data = snapshot.docs[0].data();
      const parseResult = PlaylistConfigSchema.safeParse(data);

      if (parseResult.success) {
        return parseResult.data as PlaylistConfig;
      } else {
        logger.error(`Invalid configuration for playlist ${playlistId}:`, parseResult.error);
        throw new Error(`Invalid configuration stored for ${playlistId}`);
      }
    } catch (error) {
      logger.error(`Error fetching playlist ${playlistId}:`, error);
      throw error;
    }
  }
}
