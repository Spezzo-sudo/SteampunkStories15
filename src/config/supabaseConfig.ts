/**
 * Supabase configuration loaded from environment variables.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Returns the Supabase configuration from environment variables.
 * Throws an error if required variables are missing.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase configuration is incomplete. Please check your .env.local file. ' +
      'Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
    );
  }

  return {
    url,
    anonKey,
  };
}

/**
 * Returns the world ID from environment variables or a default value.
 */
export function getWorldId(): string {
  return import.meta.env.VITE_WORLD_ID || 'playtest-world';
}
