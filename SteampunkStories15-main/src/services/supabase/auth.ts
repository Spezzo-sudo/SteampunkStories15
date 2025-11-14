/**
 * Supabase Authentication Service
 *
 * This module replaces Firebase Auth with Supabase Auth.
 * Provides sign-in, sign-out, and auth state observation.
 */

import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase';
import { DEFAULT_ADMIN_CREDENTIALS, getDefaultAdminEmail } from '@/config/authConfig';

/**
 * Subscribes to Supabase authentication state changes.
 * Returns an unsubscribe function to clean up the listener.
 */
export const observeAuth = (onChange: (user: User | null) => void): (() => void) => {
  const supabase = getSupabaseClient();

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    onChange(session?.user ?? null);
  });

  // Subscribe to auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      onChange(session?.user ?? null);
    }
  );

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Converts username to email format if needed.
 * Uses a temporary email domain for testing.
 */
const usernameToEmail = (username: string): string =>
  username.includes('@') ? username : `${username}@game.local`;

/**
 * Attempts to sign in with the provided credentials.
 * If user doesn't exist, automatically creates the account.
 */
export const signIn = async (username: string, password: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const email = usernameToEmail(username);

  // Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // If user not found, try to sign up
    if (error.message.includes('Invalid login credentials') || error.message.includes('User not found')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (signUpError) {
        throw new Error(`Anmeldung fehlgeschlagen: ${signUpError.message}`);
      }

      // If email confirmation is disabled, sign up will auto-login
      if (!signUpData.user) {
        throw new Error('Benutzererstellung fehlgeschlagen.');
      }

      return;
    }

    throw new Error(`Anmeldung fehlgeschlagen: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Anmeldung fehlgeschlagen: Kein Benutzer zur�ckgegeben.');
  }
};

/**
 * Signs the current user out of the Supabase session.
 */
export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Abmeldung fehlgeschlagen: ${error.message}`);
  }
};

/**
 * Ensures the default admin account exists.
 * Attempts to sign in, and if user doesn't exist, creates the account.
 */
export const ensureDefaultAdmin = async (username: string, password: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const email = usernameToEmail(username);

  // Check if already signed in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return; // Already authenticated
  }

  // Try to create admin account (will fail if already exists, which is fine)
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    // Ignore "User already registered" errors
    if (error && !error.message.includes('already registered')) {
      console.warn('Could not ensure default admin account:', error.message);
    }
  } catch (error) {
    console.warn('Error ensuring default admin:', error);
  }
};

/**
 * Gets the current authenticated user.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
};
