import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseAuth } from '../firebase';

/** Local development stub user when Firebase config is absent. */
let mockUser: User | null = null;

/**
 * Subscribes to Firebase authentication state changes.
 */
export const observeAuth = (onChange: (user: User | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  if (!auth) {
    // If firebase is not configured, we can use a mock user for offline development.
    onChange(mockUser);
    return () => undefined;
  }
  return onAuthStateChanged(auth, onChange);
};

const usernameToEmail = (username: string) =>
  username.includes('@') ? username : `${username}@steampunk.local`;

const ensureAdminAccount = async (username: string, password: string, authUser: User | null) => {
  if (authUser) {
    return;
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    mockUser = {
      uid: 'mock-admin',
      email: usernameToEmail(username),
      displayName: 'Administrator',
    } as User;
    return;
  }
  const email = usernameToEmail(username);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/user-not-found') {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, email, password);
      return;
    }
    throw error;
  }
};

/**
 * Attempts to authenticate the provided credentials, auto-provisioning an admin account if required.
 */
export const signIn = async (username: string, password: string): Promise<void> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    if (username === 'admin' && password === 'admin1') {
      mockUser = { uid: 'mock-admin', email: usernameToEmail(username), displayName: 'Administrator' } as User;
      return;
    }
    throw new Error('Ungültige Zugangsdaten im Offline-Modus.');
  }
  const email = usernameToEmail(username);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/user-not-found') {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, email, password);
      return;
    }
    throw error;
  }
};

/**
 * Signs the current user out of the Firebase session.
 */
export const signOut = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    mockUser = null;
    return;
  }
  await firebaseSignOut(auth);
};

/**
 * Ensures the default admin account exists by attempting a silent sign-in with fallback provisioning.
 */
export const ensureDefaultAdmin = async (username: string, password: string): Promise<void> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }
  try {
    await ensureAdminAccount(username, password, auth.currentUser);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/operation-not-allowed') {
      console.warn('E-Mail/Passwort Authentifizierung ist im Firebase Projekt deaktiviert.');
      return;
    }
    throw error;
  }
};
