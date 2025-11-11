import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig as PUBLIC_FIREBASE_CONFIG } from '../config/firebaseConfig';

// --- Singleton instances ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

/**
 * Initializes the Firebase app and returns the singleton instance.
 * This function can be called multiple times, but will only initialize the app once.
 */
export function ensureFirebaseApp(): FirebaseApp | null {
  if (!app && PUBLIC_FIREBASE_CONFIG?.apiKey) {
    try {
      app = initializeApp(PUBLIC_FIREBASE_CONFIG);
    } catch (e) {
      console.error('Failed to initialize Firebase:', e);
      return null;
    }
  }
  return app;
}

/**
 * Returns the singleton auth instance.
 */
export function getFirebaseAuth(): Auth | null {
  if (!auth) {
    const currentApp = ensureFirebaseApp();
    if (currentApp) {
      auth = getAuth(currentApp);
    }
  }
  return auth;
}

/**
 * Returns the singleton firestore instance.
 */
export function getFirebaseFirestore(): Firestore | null {
  if (!firestore) {
    const currentApp = ensureFirebaseApp();
    if (currentApp) {
      firestore = getFirestore(currentApp);
    }
  }
  return firestore;
}
