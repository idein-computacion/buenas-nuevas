import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDcKXT_5DFh5PvpOy-3vv4_kKFQttEjSQU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "buenasnuevas-obera.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "buenasnuevas-obera",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "buenasnuevas-obera.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "614694281606",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:614694281606:web:853a64743bb2bf5b0a0c07",
};

export const isFirebaseConfigured = true;

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let _db: Firestore | null = null;

export const getDb = (): Firestore | null => {
  try {
    if (!_db) {
      _db = getFirestore(app);
    }
    return _db;
  } catch (err) {
    console.warn("Firestore service is not initialized yet in Firebase Console:", err);
    return null;
  }
};
