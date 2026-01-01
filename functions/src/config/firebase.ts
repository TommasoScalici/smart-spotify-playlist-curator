import * as admin from "firebase-admin";

// Check if app is already initialized to avoid "default app already defined" error
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
