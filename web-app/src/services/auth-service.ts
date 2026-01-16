import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserSchema, UserProfile } from '@smart-spotify-curator/shared';

export const AuthService = {
  /**
   * Sign in with Google Popup
   * - Authenticates user
   * - Syncs user profile to Firestore
   */
  async signInWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await this.syncUserToFirestore(user);
      return user;
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  },

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Sync Firebase Auth User to Firestore 'users' collection.
   * Creates doc if missing, updates 'lastLoginAt' always.
   */
  async syncUserToFirestore(user: FirebaseUser): Promise<void> {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const now = new Date().toISOString();

    if (userSnap.exists()) {
      // Update lastLoginAt
      await setDoc(userRef, { lastLoginAt: now }, { merge: true });
    } else {
      // Create new User Profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        createdAt: now,
        lastLoginAt: now,
        theme: 'system'
      };

      // Validate with Zod before writing
      const validProfile = UserSchema.parse(newProfile);
      await setDoc(userRef, validProfile);
    }
  },

  /**
   * Observe Auth State
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};
