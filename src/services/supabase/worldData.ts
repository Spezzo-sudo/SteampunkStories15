/**
 * Supabase World Data API
 *
 * Fetches world and region data from Supabase database.
 * Replaces Firebase Firestore worldData.
 */

import { getSupabaseClient } from '../supabase';
import type { Region } from '@/data/types';

/**
 * Lists all regions from the Supabase regions table.
 * Returns an empty array if no regions found or on error.
 */
export const listRegions = async (worldId: string): Promise<Region[]> => {
  try {
    const supabase = getSupabaseClient();

    // Fetch all regions from the database
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('rq', { ascending: true })
      .order('rr', { ascending: true });

    if (error) {
      console.error(`Error fetching regions: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`No regions found for world '${worldId}'. Falling back to an empty array.`);
      return [];
    }

    // Map database columns to Region type
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      RQ: row.rq,
      RR: row.rr,
      tiles: [], // Tiles loaded separately in fetchRegion
    }));
  } catch (error) {
    console.error('Error listing regions:', error);
    return [];
  }
};
