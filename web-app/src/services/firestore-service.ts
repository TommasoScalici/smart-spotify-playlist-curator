import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import {
  PlaylistConfig,
  PlaylistConfigSchema,
  SpotifyProfile
} from '@smart-spotify-curator/shared';
import { MOCK_PLAYLISTS, MOCK_SPOTIFY_PROFILE } from '../mocks/spotify-mock-data';

const IS_DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

export const FirestoreService = {
  /**
   * Fetch all playlists for a specific user.
   * @param uid - The user ID
   * @returns Array of playlist configurations with Firestore document IDs
   */
  async getUserPlaylists(uid: string): Promise<(PlaylistConfig & { _docId: string })[]> {
    if (IS_DEBUG_MODE) {
      console.warn('[FIRESTORE] Debug Mode: Returning Mock Playlists');
      return MOCK_PLAYLISTS;
    }

    const playlistsRef = collection(db, 'users', uid, 'playlists');
    const querySnapshot = await getDocs(playlistsRef);
    const playlists: (PlaylistConfig & { _docId: string })[] = [];

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
   * Subscribe to real-time updates for a user's playlists.
   * @param uid - The user ID
   * @param callback - Function called with updated playlists array
   * @returns Unsubscribe function
   */
  subscribeUserPlaylists(
    uid: string,
    callback: (playlists: (PlaylistConfig & { _docId: string })[]) => void
  ): () => void {
    if (IS_DEBUG_MODE) {
      callback(MOCK_PLAYLISTS);
      return () => {};
    }

    const playlistsRef = collection(db, 'users', uid, 'playlists');
    return onSnapshot(
      playlistsRef,
      (snapshot) => {
        const playlists: (PlaylistConfig & { _docId: string })[] = [];
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
      const q = query(playlistsRef, where('id', '==', config.id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        targetDocRef = doc(playlistsRef, snap.docs[0].id);
      } else {
        targetDocRef = doc(playlistsRef);
      }
    }

    await setDoc(targetDocRef, { ...validatedData, ownerId: uid }, { merge: true });
  },

  /**
   * Fetch a single playlist by its ID for a user.
   * @param uid - The user ID
   * @param docId - The Firestore document ID
   * @returns The playlist configuration or null if not found
   */
  async getUserPlaylistById(uid: string, docId: string): Promise<PlaylistConfig | null> {
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
   * Delete a playlist configuration for a user.
   * @param uid - The user ID
   * @param docId - The Firestore document ID to delete
   */
  async deleteUserPlaylist(uid: string, docId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'playlists', docId);
    await deleteDoc(docRef);
  },

  /**
   * Check if user has linked Spotify account, and if it's valid.
   * @param uid - The user ID
   * @returns Object with isLinked status and optional authError
   */
  async checkSpotifyConnection(uid: string): Promise<{ isLinked: boolean; authError?: string }> {
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
        return { isLinked: true, authError: profile.authError || 'Authentication failed' };
      }

      return { isLinked: true };
    } catch (e) {
      console.error('Error checking connection', e);
      return { isLinked: false };
    }
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
  },

  /**
   * Fetches the public Spotify Profile info stored on the user document.
   * @param uid - The user ID
   * @returns The Spotify profile or null if not found
   */
  async getSpotifyProfile(uid: string): Promise<SpotifyProfile | null> {
    if (IS_DEBUG_MODE) {
      console.warn('[FIRESTORE] Debug Mode: Returning Mock Spotify Profile');
      return {
        id: 'debug-spotify-id',
        displayName: MOCK_SPOTIFY_PROFILE.displayName,
        email: MOCK_SPOTIFY_PROFILE.email,
        avatarUrl: MOCK_SPOTIFY_PROFILE.avatarUrl,
        product: 'premium',
        linkedAt: new Date(),
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
  }
};
