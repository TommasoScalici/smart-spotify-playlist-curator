import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

export type ActivityType = 'success' | 'info' | 'warning' | 'error' | 'running';

export class FirestoreLogger {
  /**
   * Logs or updates a user-facing activity to Firestore.
   * @param ownerId - The ID of the user owning the activity
   * @param type - The severity type of the activity
   * @param message - The human-readable message to log
   * @param metadata - Optional key-value metadata to attach
   * @param logId - Optional ID to update an existing log entry
   * @returns The ID of the log entry created or updated
   */
  async logActivity(
    ownerId: string,
    type: ActivityType,
    message: string,
    metadata?: Record<string, unknown>,
    logId?: string
  ): Promise<string> {
    if (!ownerId) {
      logger.warn('Cannot log activity without ownerId', { type, message });
      return '';
    }

    try {
      const logsRef = db.collection('users').doc(ownerId).collection('logs');
      // Sanitize metadata to remove undefined values which Firestore doesn't like
      const sanitizedMetadata = JSON.parse(JSON.stringify(metadata || {}));

      const data = {
        type,
        message,
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        read: false,
        deleted: false
      };

      if (logId) {
        // Fetch existing metadata to perform a deep merge in memory
        // This prevents overwriting essential fields like playlistId during progress updates
        const existingDoc = await logsRef.doc(logId).get();
        const existingData = existingDoc.data();

        const mergedMetadata = {
          ...(existingData?.metadata || {}),
          ...sanitizedMetadata
        };

        const updateData = {
          ...data,
          metadata: mergedMetadata
        };

        await logsRef.doc(logId).update(updateData);
        return logId;
      } else {
        const docRef = await logsRef.add(data);
        return docRef.id;
      }
    } catch (error) {
      logger.error('Failed to write activity log to Firestore:', error);
      return '';
    }
  }
}
