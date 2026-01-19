import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where
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
   * Fetch all playlists from Firestore.
   * Returns an array of PlaylistConfig objects with their Firestore Document ID attached.
   */
  /**
   * Fetch all playlists for a specific user.
   */
  async getUserPlaylists(uid: string): Promise<(PlaylistConfig & { _docId: string })[]> {
    // Debug Mode: Return mock playlists
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
   * Create or Update a playlist configuration for a user.
   */
  async saveUserPlaylist(uid: string, config: PlaylistConfig, docId?: string): Promise<void> {
    const validatedData = PlaylistConfigSchema.parse(config);
    let targetDocRef;

    if (docId) {
      targetDocRef = doc(db, 'users', uid, 'playlists', docId);
    } else {
      const playlistsRef = collection(db, 'users', uid, 'playlists');
      // optional: check for dupes by config.id?
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
   */
  async deleteUserPlaylist(uid: string, docId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'playlists', docId);
    await deleteDoc(docRef);
  },

  /**
   * Check if user has linked Spotify account.
   */
  /**
   * Check if user has linked Spotify account, and if it's valid.
   */
  async checkSpotifyConnection(uid: string): Promise<{ isLinked: boolean; authError?: string }> {
    // Debug Mode: Always return linked
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
   */
  async getSpotifyProfile(uid: string): Promise<SpotifyProfile | null> {
    // Debug Mode: Return mock profile
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

      // Handle Firestore Timestamp conversion without 'any'
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
