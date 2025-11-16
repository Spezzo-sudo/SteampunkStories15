/**
 * Resource Synchronization API
 *
 * Handles syncing player and settlement resources to/from Supabase.
 * Critical for multiplayer functionality - persists client-side resource
 * production to the database so resources survive page refreshes.
 */

import { getSupabaseClient } from '../supabase';
import type { Resources } from '@/types';
import { ResourceType } from '@/types';

/**
 * Syncs player resources to the database.
 * Called periodically from gameTick to persist resource production.
 *
 * @param playerId - UUID of the player to sync
 * @param resources - Current resources to persist
 * @returns Success status
 */
export async function syncPlayerResources(
  playerId: string,
  resources: Resources
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('players')
      .update({
        orichalkum: Math.floor(resources[ResourceType.Orichalkum]),
        fokuskristalle: Math.floor(resources[ResourceType.Fokuskristalle]),
        vitriol: Math.floor(resources[ResourceType.Vitriol]),
        last_resource_sync: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (error) {
      console.error('[resourceSync] Error syncing player resources:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[resourceSync] Exception syncing player resources:', err);
    return false;
  }
}

/**
 * Loads player resources from the database.
 * Called on login or manual refresh to get server-side resource state.
 *
 * @param playerId - UUID of the player to load
 * @returns Resources object or null if player not found
 */
export async function loadPlayerResources(playerId: string): Promise<Resources | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('players')
      .select('orichalkum, fokuskristalle, vitriol')
      .eq('id', playerId)
      .single();

    if (error || !data) {
      console.error('[resourceSync] Error loading player resources:', error);
      return null;
    }

    return {
      [ResourceType.Orichalkum]: data.orichalkum || 0,
      [ResourceType.Fokuskristalle]: data.fokuskristalle || 0,
      [ResourceType.Vitriol]: data.vitriol || 0,
    };
  } catch (err) {
    console.error('[resourceSync] Exception loading player resources:', err);
    return null;
  }
}

/**
 * Syncs settlement resources to the database.
 * Called when switching settlements or periodically during gameplay.
 *
 * @param settlementId - UUID of the settlement
 * @param resources - Current settlement resources (stored as JSONB)
 * @returns Success status
 */
export async function syncSettlementResources(
  settlementId: string,
  resources: Resources
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const resourcesJson = {
      [ResourceType.Orichalkum]: Math.floor(resources[ResourceType.Orichalkum]),
      [ResourceType.Fokuskristalle]: Math.floor(resources[ResourceType.Fokuskristalle]),
      [ResourceType.Vitriol]: Math.floor(resources[ResourceType.Vitriol]),
    };

    const { error } = await supabase
      .from('settlements')
      .update({
        resources: resourcesJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlementId);

    if (error) {
      console.error('[resourceSync] Error syncing settlement resources:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[resourceSync] Exception syncing settlement resources:', err);
    return false;
  }
}

/**
 * Loads settlement resources from the database.
 * Called when loading a settlement to get server-side resource state.
 *
 * @param settlementId - UUID of the settlement
 * @returns Resources object or null if settlement not found
 */
export async function loadSettlementResources(settlementId: string): Promise<Resources | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('settlements')
      .select('resources')
      .eq('id', settlementId)
      .single();

    if (error || !data) {
      console.error('[resourceSync] Error loading settlement resources:', error);
      return null;
    }

    const resources = data.resources as Record<string, number> | null;
    if (!resources) {
      return null;
    }

    return {
      [ResourceType.Orichalkum]: resources[ResourceType.Orichalkum] || 0,
      [ResourceType.Fokuskristalle]: resources[ResourceType.Fokuskristalle] || 0,
      [ResourceType.Vitriol]: resources[ResourceType.Vitriol] || 0,
    };
  } catch (err) {
    console.error('[resourceSync] Exception loading settlement resources:', err);
    return null;
  }
}

/**
 * Gets the timestamp of the last resource sync from database.
 * Used to display sync status in UI.
 *
 * @param playerId - UUID of the player
 * @returns ISO timestamp or null
 */
export async function getLastResourceSync(playerId: string): Promise<number | null> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('players')
      .select('last_resource_sync')
      .eq('id', playerId)
      .single();

    if (error || !data || !data.last_resource_sync) {
      return null;
    }

    return new Date(data.last_resource_sync).getTime();
  } catch (err) {
    console.error('[resourceSync] Exception getting last resource sync:', err);
    return null;
  }
}
