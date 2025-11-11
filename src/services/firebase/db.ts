import { getFirebaseFirestore } from '../firebase';
import type { Firestore } from 'firebase/firestore';

/**
 * Returns a memoized instance of the Firestore database.
 * Throws an error if Firebase is not initialized.
 */
export const getDb = (): Firestore => {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    throw new Error('Firebase has not been initialized. Cannot access Firestore.');
  }
  return firestore;
};
