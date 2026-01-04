import { collection, getDocs, getDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { PlaylistConfig, PlaylistConfigSchema } from '../types/schemas';

const COLLECTION_NAME = 'playlists';

export const FirestoreService = {
    /**
     * Fetch all playlists from Firestore.
     * Returns an array of PlaylistConfig objects with their Firestore Document ID attached.
     */
    async getAllPlaylists(): Promise<(PlaylistConfig & { _docId: string })[]> {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const playlists: (PlaylistConfig & { _docId: string })[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validate with Zod, but allow passing even if slightly mismatched (log warning?)
            const parseResult = PlaylistConfigSchema.safeParse(data);
            if (parseResult.success) {
                playlists.push({ ...parseResult.data, _docId: doc.id });
            } else {
                // skipping invalid doc
            }
        });

        return playlists;
    },

    /**
     * Create or Update a playlist configuration.
     * Uses the Spotify Playlist URI as a unique identifier logic if possible, 
     * but primarily relies on the Firestore Document ID (_docId) if provided.
     */
    async savePlaylist(config: PlaylistConfig, docId?: string): Promise<void> {
        // Validate before saving
        const validatedData = PlaylistConfigSchema.parse(config);

        let targetDocRef;
        if (docId) {
            targetDocRef = doc(db, COLLECTION_NAME, docId);
        } else {
            // If no docId, check if one exists with the same playlist.id
            const q = query(collection(db, COLLECTION_NAME), where("id", "==", config.id));
            const snap = await getDocs(q);
            if (!snap.empty) {
                targetDocRef = doc(db, COLLECTION_NAME, snap.docs[0].id);
            } else {
                // Create new random ID doc
                targetDocRef = doc(collection(db, COLLECTION_NAME));
            }
        }

        await setDoc(targetDocRef, validatedData, { merge: true });
    },

    /**
     * Fetch a single playlist by its Firestore Document ID.
     */
    async getPlaylistById(docId: string): Promise<PlaylistConfig | null> {
        const docRef = doc(db, COLLECTION_NAME, docId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            const parseResult = PlaylistConfigSchema.safeParse(data);
            if (parseResult.success) {
                return parseResult.data as PlaylistConfig;
            }
            // Invalid data
        }
        return null;
    }
};
