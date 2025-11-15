import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration pulled from Vite environment variables.
 */
export const firebaseConfig: FirebaseOptions | null = typeof window !== 'undefined'
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : null;

/**
 * Determines whether the runtime has enough Firebase config to initialize the SDK.
 */
export const hasFirebaseConfig = (config: FirebaseOptions | null = firebaseConfig): config is FirebaseOptions =>
  Boolean(
    config?.apiKey &&
      config?.authDomain &&
      config?.projectId &&
      config?.appId,
  );
