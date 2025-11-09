import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig, hasFirebaseConfig } from '@/config/firebaseConfig';

/**
 * Lazily initializes the Firebase app instance when configuration is available.
 */
export const ensureFirebaseApp = (config = firebaseConfig): FirebaseApp | null => {
  if (!hasFirebaseConfig(config)) {
    return null;
  }
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }
  return initializeApp(config);
};
