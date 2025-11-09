import { getFirestore, type Firestore } from 'firebase/firestore';
import { ensureFirebaseApp } from './initFirebase';

/**
 * Returns the Firestore instance when Firebase is configured; otherwise null.
 */
export const getDb = (): Firestore | null => {
  const app = ensureFirebaseApp();
  if (!app) {
    return null;
  }
  return getFirestore(app);
};
