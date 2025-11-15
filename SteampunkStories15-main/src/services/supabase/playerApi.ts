/**
 * Supabase Player API
 *
 * Handles player profile operations using Supabase database.
 * Replaces Firebase Firestore playerApi.
 */

import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase';
import type { PlayerProfile } from '@/data/types';

/**
 * Fetches or creates a player profile for the given user.
 * If the profile doesn't exist, creates a new one with default values.
 */
export async function fetchOrCreatePlayerProfile(user: User): Promise<PlayerProfile> {
  const supabase = getSupabaseClient();

  console.log('[playerApi] Fetching or creating player for user:', user.id);

  // Try to fetch existing player
  const { data: existingPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingPlayer) {
    console.log('[playerApi] Found existing player:', existingPlayer.id);
    // Map database columns to PlayerProfile type
    return {
      uid: existingPlayer.user_id,
      name: existingPlayer.username,
      hasPlacedHome: existingPlayer.has_placed_home,
    };
  }

  // User doesn't exist in players table, create a new player
  const username = user.email?.split('@')[0] || user.id.substring(0, 8);

  console.log('[playerApi] Creating new player for user:', user.id, 'with username:', username);

  const newPlayer = {
    user_id: user.id,
    username,
    faction: 'neutral',
    has_placed_home: false,
    // Resources start with defaults from schema
  };

  const { data: createdPlayer, error: createError } = await supabase
    .from('players')
    .insert([newPlayer])
    .select()
    .single();

  if (createError) {
    console.error('[playerApi] Error creating player:', createError);
    throw new Error(`Failed to create player profile: ${createError.message}`);
  }

  if (!createdPlayer) {
    console.error('[playerApi] No data returned after creating player');
    throw new Error('Failed to create player profile: No data returned');
  }

  console.log('[playerApi] Successfully created player:', createdPlayer.id);
  return {
    uid: createdPlayer.user_id,
    name: createdPlayer.username,
    hasPlacedHome: createdPlayer.has_placed_home,
  };
}

/**
 * Updates a player profile with the provided partial data.
 */
export async function updatePlayerProfile(
  uid: string,
  updates: Partial<{
    name: string;
    hasPlacedHome: boolean;
    allianceId: string;
    lastActiveAt: number;
  }>
): Promise<void> {
  const supabase = getSupabaseClient();

  // Map PlayerProfile fields to database columns
  const dbUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    dbUpdates.username = updates.name;
  }
  if (updates.hasPlacedHome !== undefined) {
    dbUpdates.has_placed_home = updates.hasPlacedHome;
  }
  if (updates.allianceId !== undefined) {
    dbUpdates.alliance_id = updates.allianceId;
  }
  if (updates.lastActiveAt !== undefined) {
    dbUpdates.last_active = new Date(updates.lastActiveAt).toISOString();
  }

  const { error } = await supabase
    .from('players')
    .update(dbUpdates)
    .eq('user_id', uid);

  if (error) {
    throw new Error(`Failed to update player profile: ${error.message}`);
  }
}

/**
 * Fetches a player profile by user ID.
 */
export async function getPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', uid)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    uid: data.user_id,
    name: data.username,
    hasPlacedHome: data.has_placed_home,
  };
}
