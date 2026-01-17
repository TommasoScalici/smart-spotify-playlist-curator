import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK once
const app = initializeApp();
const db = getFirestore(app);

export { app, db };
