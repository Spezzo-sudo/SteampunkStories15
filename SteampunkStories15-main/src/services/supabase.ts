/**
 * Supabase Client Singleton
 *
 * This module provides a singleton Supabase client instance for the entire application.
 * It replaces the previous Firebase initialization logic.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabaseConfig';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes and returns the Supabase client instance.
 * Creates the client only once (singleton pattern).
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const config = getSupabaseConfig();

    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
}

/**
 * Returns the current Supabase client instance if initialized, null otherwise.
 */
export function getSupabaseClientIfExists(): SupabaseClient | null {
  return supabaseInstance;
}

/**
 * Checks if Supabase has been initialized.
 */
export function isSupabaseInitialized(): boolean {
  return supabaseInstance !== null;
}
