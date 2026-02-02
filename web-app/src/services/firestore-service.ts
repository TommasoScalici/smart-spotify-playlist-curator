import {
  ActivityLog,
  ActivityLogSchema,
  PlaylistConfig,
  PlaylistConfigSchema,
  SpotifyProfile
} from '@smart-spotify-curator/shared';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import { MOCK_PLAYLISTS, MOCK_SPOTIFY_PROFILE } from '../mocks/spotify-mock-data';
import { db } from './firebase';

const IS_DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

export const FirestoreService = {
  /**
   * Check if user has linked Spotify account, and if it's valid.
   * @param uid - The user ID
   * @returns Object with isLinked status and optional authError
   */
  async checkSpotifyConnection(uid: string): Promise<{ authError?: string; isLinked: boolean }> {
    if (IS_DEBUG_MODE) {
      console.warn('[FIRESTORE] Debug Mode: Returning Mock Spotify Connection');
      return { isLinked: true };
    }

    try {
      const profile = await this.getSpotifyProfile(uid);

      if (!profile) {
        return { isLinked: false };
      }

      if (profile.status === 'invalid') {
        return { authError: profile.authError || 'Authentication failed', isLinked: true };
      }

      return { isLinked: true };
    } catch (e) {
      console.error('Error checking connection', e);
      return { isLinked: false };
    }
  },

  /**
   * Soft delete all activity log entries for a user.
   * @param uid - The user ID
   */
  async clearAllActivities(uid: string): Promise<void> {
    const logsRef = collection(db, 'users', uid, 'logs');
    // We fetch current logs to mark them as deleted.
    // We don't use a 'where' query for deletion to ensure we catch legacy logs missing the field.
    const snapshot = await getDocs(query(logsRef, limit(500)));

    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.deleted !== true) {
        batch.update(doc.ref, { deleted: true });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  },

  /**
   * Delete a playlist configuration for a user.
   * @param uid - The user ID
   * @param docId - The Firestore document ID to delete
   */
  async deleteUserPlaylist(uid: string, docId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'playlists', docId);
    await deleteDoc(docRef);
  },

  /**
   * Fetches the public Spotify Profile info stored on the user document.
   * @param uid - The user ID
   * @returns The Spotify profile or null if not found
   */
  async getSpotifyProfile(uid: string): Promise<null | SpotifyProfile> {
    if (IS_DEBUG_MODE) {
      console.warn('[FIRESTORE] Debug Mode: Returning Mock Spotify Profile');
      return {
        avatarUrl: MOCK_SPOTIFY_PROFILE.avatarUrl,
        displayName: MOCK_SPOTIFY_PROFILE.displayName,
        email: MOCK_SPOTIFY_PROFILE.email,
        id: 'debug-spotify-id',
        linkedAt: new Date(),
        product: 'premium',
        status: 'active'
      };
    }

    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const rawProfile = data.spotifyProfile;
      if (!rawProfile) return null;
      const linkedAt =
        rawProfile.linkedAt && typeof rawProfile.linkedAt.toDate === 'function'
          ? rawProfile.linkedAt.toDate()
          : (rawProfile.linkedAt as Date);

      return {
        ...rawProfile,
        linkedAt
      } as SpotifyProfile;
    }
    return null;
  },

  /**
   * Fetch a single playlist by its ID for a user.
   * @param uid - The user ID
   * @param docId - The Firestore document ID
   * @returns The playlist configuration or null if not found
   */
  async getUserPlaylistById(uid: string, docId: string): Promise<null | PlaylistConfig> {
    const docRef = doc(db, 'users', uid, 'playlists', docId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const parseResult = PlaylistConfigSchema.safeParse(data);
      if (parseResult.success) {
        return parseResult.data as PlaylistConfig;
      }
    }
    return null;
  },

  /**
   * Fetch all playlists for a specific user.
   * @param uid - The user ID
   * @returns Array of playlist configurations with Firestore document IDs
   */
  async getUserPlaylists(uid: string): Promise<({ _docId: string } & PlaylistConfig)[]> {
    if (IS_DEBUG_MODE) {
      console.warn('[FIRESTORE] Debug Mode: Returning Mock Playlists');
      return MOCK_PLAYLISTS;
    }

    const playlistsRef = collection(db, 'users', uid, 'playlists');
    const querySnapshot = await getDocs(playlistsRef);
    const playlists: ({ _docId: string } & PlaylistConfig)[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const parseResult = PlaylistConfigSchema.safeParse(data);
      if (parseResult.success) {
        playlists.push({ ...parseResult.data, _docId: doc.id });
      }
    });

    return playlists;
  },

  /**
   * Create or Update a playlist configuration for a user.
   * @param uid - The user ID
   * @param config - Playlist configuration to save
   * @param docId - Optional Firestore document ID for updates
   */
  async saveUserPlaylist(uid: string, config: PlaylistConfig, docId?: string): Promise<void> {
    const validatedData = PlaylistConfigSchema.parse(config);
    let targetDocRef;

    if (docId) {
      targetDocRef = doc(db, 'users', uid, 'playlists', docId);
    } else {
      const playlistsRef = collection(db, 'users', uid, 'playlists');
      // Enforce deterministic ID based on Spotify URI if available
      if (config.id && config.id.startsWith('spotify:playlist:')) {
        const deterministicId = config.id.replace(/:/g, '_');
        targetDocRef = doc(playlistsRef, deterministicId);
      } else {
        // Fallback or legacy check (optional, but good for safety)
        const q = query(playlistsRef, where('id', '==', config.id));
        const snap = await getDocs(q);

        if (!snap.empty) {
          targetDocRef = doc(playlistsRef, snap.docs[0].id);
        } else {
          targetDocRef = doc(playlistsRef); // Random as last resort
        }
      }
    }

    await setDoc(targetDocRef, { ...validatedData, ownerId: uid }, { merge: true });
  },

  /**
   * Soft delete an activity log entry.
   * @param uid - The user ID
   * @param logId - The Firestore document ID of the log
   */
  async softDeleteActivity(uid: string, logId: string): Promise<void> {
    const logRef = doc(db, 'users', uid, 'logs', logId);
    await updateDoc(logRef, { deleted: true });
  },

  /**
   * Subscribe to the latest log entry for a specific playlist.
   * Useful for real-time progress and status tracking.
   * @param uid - The user ID
   * @param playlistId - The Spotify Playlist URI
   * @param callback - Function called with the latest log entry
   */
  subscribeLatestLog(
    uid: string,
    playlistId: string,
    callback: (log: ActivityLog | null) => void
  ): () => void {
    const activityRef = collection(db, 'users', uid, 'logs');
    const q = query(
      activityRef,
      where('metadata.playlistId', '==', playlistId),
      where('deleted', '==', false),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const parseResult = ActivityLogSchema.safeParse(data);
        if (parseResult.success) {
          callback({ ...parseResult.data, id: snapshot.docs[0].id });
        } else {
          console.error('Invalid log data:', parseResult.error);
        }
      } else {
        callback(null);
      }
    });
  },

  /**
   * Subscribe to real-time updates for a user's playlists.
   * @param uid - The user ID
   * @param callback - Function called with updated playlists array
   * @returns Unsubscribe function
   */
  subscribeUserPlaylists(
    uid: string,
    callback: (playlists: ({ _docId: string } & PlaylistConfig)[]) => void
  ): () => void {
    if (IS_DEBUG_MODE) {
      callback(MOCK_PLAYLISTS);
      return () => {};
    }

    const playlistsRef = collection(db, 'users', uid, 'playlists');
    return onSnapshot(
      playlistsRef,
      (snapshot) => {
        const playlists: ({ _docId: string } & PlaylistConfig)[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const parseResult = PlaylistConfigSchema.safeParse(data);
          if (parseResult.success) {
            playlists.push({ ...parseResult.data, _docId: doc.id });
          }
        });
        callback(playlists);
      },
      (error) => {
        console.error('Error in playlists subscription:', error);
      }
    );
  },

  /**
   * Unlinks Spotify account by deleting the credentials and clearing profile info.
   * @param uid - The user ID
   */
  async unlinkSpotifyAccount(uid: string): Promise<void> {
    const secretRef = doc(db, 'users', uid, 'secrets', 'spotify');
    const userRef = doc(db, 'users', uid);

    await Promise.all([
      deleteDoc(secretRef),
      setDoc(userRef, { spotifyProfile: null }, { merge: true }) // Clear profile
    ]);
  }
};
