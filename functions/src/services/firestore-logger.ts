import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

export type ActivityType = 'success' | 'info' | 'warning' | 'error';

export class FirestoreLogger {
  /**
   * Logs a user-facing activity to Firestore.
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
      // Don't fail the curation just because logging failed
      logger.error('Failed to write activity log to Firestore:', error);
    }
  }
  /**
   * Updates the curation status for a specific playlist.
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

    try {
      await db.doc(`users/${ownerId}/playlists/${playlistId}`).update({
        curationStatus: {
          ...status,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      // Log but don't throw, as status updates shouldn't fail the job
      logger.warn('Failed to update curation status', error);
    }
  }
}
