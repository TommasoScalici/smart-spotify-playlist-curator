import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

export type ActivityType = 'success' | 'info' | 'warning' | 'error';

export class FirestoreLogger {
  /**
   * Logs a user-facing activity to Firestore.
   * @param ownerId - The ID of the user owning the activity
   * @param type - The severity type of the activity
   * @param message - The human-readable message to log
   * @param metadata - Optional key-value metadata to attach
   */
  async logActivity(
    ownerId: string,
    type: ActivityType,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!ownerId) {
      logger.warn('Cannot log activity without ownerId', { type, message });
      return;
    }

    try {
      await db
        .collection('users')
        .doc(ownerId)
        .collection('logs')
        .add({
          type,
          message,
          metadata: metadata || {},
          timestamp: new Date().toISOString(),
          read: false
        });
    } catch (error) {
      logger.error('Failed to write activity log to Firestore:', error);
    }
  }
  /**
   * Updates the curation status for a specific playlist.
   * @param ownerId - The ID of the playlist owner
   * @param playlistId - The ID of the playlist being updated
   * @param status - The status object containing state, progress, and diff
   */
  async updateCurationStatus(
    ownerId: string,
    playlistId: string,
    status: {
      state: 'idle' | 'running' | 'completed' | 'error';
      progress: number;
      step?: string;
      isDryRun?: boolean;
      diff?: {
        added: { uri: string; name: string; artist: string }[];
        removed: { uri: string; name: string; artist: string }[];
      };
    }
  ): Promise<void> {
    if (!ownerId || !playlistId) return;

    // Sanitize ID to match frontend's underscore-based deterministic ID
    const sanitizedId = playlistId.replace(/:/g, '_');

    try {
      await db.doc(`users/${ownerId}/playlists/${sanitizedId}`).update({
        curationStatus: {
          ...status,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.warn('Failed to update curation status', error);
    }
  }
}
