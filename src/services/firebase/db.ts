import { getFirestore, type Firestore } from 'firebase/firestore';
import { ensureFirebaseApp } from './initFirebase';

let db: Firestore | null = null;

/**
 * Returns a memoized instance of the Firestore database.
 * Throws an error if Firebase is not initialized.
 */
export const getDb = (): Firestore => {
  if (db) {
    return db;
  }

  const app = ensureFirebaseApp();
  if (!app) {
    throw new Error('Firebase has not been initialized. Cannot access Firestore.');
  }

  db = getFirestore(app);
  return db;
};
