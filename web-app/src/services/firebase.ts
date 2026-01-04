import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    projectId: "smart-spotify-playlist-curator",
    appId: "1:87258871006:web:c874b6cfe6f13fca533e4f",
    storageBucket: "smart-spotify-playlist-curator.firebasestorage.app",
    apiKey: "AIzaSyCsLVYSLUntEZf9-YAXtJENyMBNTWoF6JM",
    authDomain: "smart-spotify-playlist-curator.firebaseapp.com",
    messagingSenderId: "87258871006",
    measurementId: "G-MEASUREMENT_ID", // Optional, skipping for now
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
