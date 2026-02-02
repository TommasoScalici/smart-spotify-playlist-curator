import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Firebase
vi.mock('firebase/app', () => ({
  getApp: vi.fn(),
  initializeApp: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null
  })),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    if (callback) callback(null);
    return () => {};
  }),
  signInWithPopup: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn()
}));

// Mock Environment Variables
vi.stubGlobal('import.meta', {
  env: {
    VITE_FIREBASE_API_KEY: 'mock-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'mock-auth-domain',
    VITE_FIREBASE_PROJECT_ID: 'mock-project-id'
  }
});

class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserver);
