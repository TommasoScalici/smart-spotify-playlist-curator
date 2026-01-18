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
import { PlaylistConfig, PlaylistConfigSchema } from '@smart-spotify-curator/shared';

export const FirestoreService = {
  /**
   * Fetch all playlists from Firestore.
   * Returns an array of PlaylistConfig objects with their Firestore Document ID attached.
   */
  /**
   * Fetch all playlists for a specific user.
   */
  async getUserPlaylists(uid: string): Promise<(PlaylistConfig & { _docId: string })[]> {
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
   * Check if user has linked Spotify account.
   */
  /**
   * Check if user has linked Spotify account, and if it's valid.
   */
  async checkSpotifyConnection(uid: string): Promise<{ isLinked: boolean; authError?: string }> {
    try {
      const docRef = doc(db, 'users', uid, 'secrets', 'spotify');
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { isLinked: false };
      }

      const data = snapshot.data();
      if (data?.status === 'invalid') {
        return { isLinked: true, authError: data.error || 'Authentication failed' };
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
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data().spotifyProfile as SpotifyProfile | null;
    }
    return null;
  }
};

export interface SpotifyProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  product: string;
  linkedAt: string;
}
