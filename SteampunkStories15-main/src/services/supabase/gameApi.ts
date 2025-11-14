/**
 * Supabase Game API
 *
 * Fetches game data (regions, tiles) from Supabase database.
 * Replaces Firebase Firestore gameApi.
 */

import { getSupabaseClient } from '../supabase';
import type { Region, Tile } from '@/data/types';

/**
 * Fetches a region and its tiles from Supabase.
 * @param worldId The ID of the world (currently unused, but kept for API compatibility).
 * @param regionId The ID of the region.
 * @returns The region with its tiles, or null if not found.
 */
export const fetchRegion = async (worldId: string, regionId: string): Promise<Region | null> => {
  if (!worldId || !regionId) {
    console.error('fetchRegion was called with an undefined worldId or regionId');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    // Fetch region data
    const { data: regionData, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .eq('id', regionId)
      .single();

    if (regionError || !regionData) {
      console.warn(`[fetchRegion] Region ${regionId} not found in world ${worldId}.`, regionError);
      return null;
    }

    // Fetch tiles for this region
    const { data: tilesData, error: tilesError } = await supabase
      .from('tiles')
      .select('*')
      .eq('region_id', regionId);

    if (tilesError) {
      console.error(`[fetchRegion] Error fetching tiles for region ${regionId}:`, tilesError);
    }

    // Map database columns to application types
    const region: Region = {
      id: regionData.id,
      name: regionData.name,
      RQ: regionData.rq,
      RR: regionData.rr,
      tiles: (tilesData || []).map((tileRow) => ({
        q: tileRow.q,
        r: tileRow.r,
        biome: tileRow.biome,
        regionId: regionId,
        allianceId: tileRow.alliance_id || undefined,
        hasSettlement: tileRow.owner_id ? {
          playerId: tileRow.owner_id,
          icon: 'TOWN' as const
        } : undefined,
      })),
    };

    return region;
  } catch (error) {
    console.error('Error fetching region:', error);
    return null;
  }
};
