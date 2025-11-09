import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ensureFirebaseApp } from './initFirebase';

/** Local development stub user when Firebase config is absent. */
let mockUser: User | null = null;

/**
 * Subscribes to Firebase authentication state changes.
 */
export const observeAuth = (onChange: (user: User | null) => void): (() => void) => {
  const app = ensureFirebaseApp();
  if (!app) {
    onChange(mockUser);
    return () => undefined;
  }
  const auth = getAuth(app);
  return onAuthStateChanged(auth, onChange);
};

const usernameToEmail = (username: string) =>
  username.includes('@') ? username : `${username}@steampunk.local`;

const ensureAdminAccount = async (username: string, password: string, authUser: User | null) => {
  if (authUser) {
    return;
  }
  const app = ensureFirebaseApp();
  if (!app) {
    mockUser = {
      uid: 'mock-admin',
      email: usernameToEmail(username),
      displayName: 'Administrator',
      emailVerified: true,
      isAnonymous: false,
      metadata: {} as User['metadata'],
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => undefined,
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({
        token: 'mock-token',
        authTime: Date.now().toString(),
        issuedAtTime: Date.now().toString(),
        expirationTime: Date.now().toString(),
        signInProvider: 'password',
        signInSecondFactor: null,
        claims: {},
      }),
      reload: async () => undefined,
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
      providerId: 'password',
    } as unknown as User;
    return;
  }
  const auth = getAuth(app);
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
  const app = ensureFirebaseApp();
  if (!app) {
    if (username === 'admin' && password === 'admin') {
      mockUser = {
        uid: 'mock-admin',
        email: usernameToEmail(username),
        displayName: 'Administrator',
        emailVerified: true,
        isAnonymous: false,
        metadata: {} as User['metadata'],
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => undefined,
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({
          token: 'mock-token',
          authTime: Date.now().toString(),
          issuedAtTime: Date.now().toString(),
          expirationTime: Date.now().toString(),
          signInProvider: 'password',
          signInSecondFactor: null,
          claims: {},
        }),
        reload: async () => undefined,
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
        providerId: 'password',
      } as unknown as User;
      return;
    }
    throw new Error('Ungültige Zugangsdaten im Offline-Modus.');
  }
  const auth = getAuth(app);
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
  const app = ensureFirebaseApp();
  if (!app) {
    mockUser = null;
    return;
  }
  const auth = getAuth(app);
  await firebaseSignOut(auth);
};

/**
 * Ensures the default admin account exists by attempting a silent sign-in with fallback provisioning.
 */
export const ensureDefaultAdmin = async (username: string, password: string): Promise<void> => {
  const app = ensureFirebaseApp();
  if (!app) {
    return;
  }
  const auth = getAuth(app);
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
