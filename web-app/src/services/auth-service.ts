import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  IdTokenResult,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserSchema, UserProfile } from '@smart-spotify-curator/shared';

const IS_DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

const MOCK_USER: FirebaseUser = {
  uid: 'debug-user-123',
  email: 'debug@example.com',
  displayName: 'Debug User',
  photoURL: 'https://ui-avatars.com/api/?name=Debug+User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({}) as IdTokenResult,
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'google.com'
} as unknown as FirebaseUser;

export const AuthService = {
  /**
   * Sign in with Google Popup
   * - Authenticates user
   * - Syncs user profile to Firestore
   */
  async signInWithGoogle(): Promise<FirebaseUser> {
    if (IS_DEBUG_MODE) {
      console.warn('[AUTH] Debug Mode Active: Bypassing Google Sign-In');
      await this.syncUserToFirestore(MOCK_USER);
      return MOCK_USER;
    }

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
    if (IS_DEBUG_MODE) {
      // In debug mode, we just let the state change handle it or we could use a custom event
      // For now, reload the page to clear the mock state if needed, or just let onAuthStateChanged handle it
      return;
    }
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

    const now = new Date();

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
    if (IS_DEBUG_MODE) {
      console.warn('[AUTH] Debug Mode Active: Triggering Mock Auth State');
      // Delay slightly to simulate async check
      const timeout = setTimeout(() => callback(MOCK_USER), 100);
      return () => clearTimeout(timeout);
    }
    return onAuthStateChanged(auth, callback);
  }
};
