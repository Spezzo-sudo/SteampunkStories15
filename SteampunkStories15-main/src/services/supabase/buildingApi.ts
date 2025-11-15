import { getSupabaseClient } from '../supabase';
import type { SettlementBuilding, BuildQueueEntry } from '@/types';

/**
 * Settlement Buildings API - Supabase client for settlement-specific building management.
 * Provides CRUD operations for buildings and build queues.
 */

/**
 * Get all buildings in a settlement.
 */
export const getSettlementBuildings = async (
  settlementId: string
): Promise<SettlementBuilding[]> => {
  if (!settlementId) {
    console.error('getSettlementBuildings: settlementId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settlement_buildings')
      .select('*')
      .eq('settlement_id', settlementId);

    if (error) {
      console.error('[buildingApi] Error fetching settlement buildings:', error);
      return [];
    }

    return (data as SettlementBuilding[]) || [];
  } catch (err) {
    console.error('[buildingApi] getSettlementBuildings error:', err);
    return [];
  }
};

/**
 * Get a single building by ID.
 */
export const getSettlementBuilding = async (
  buildingId: string
): Promise<SettlementBuilding | null> => {
  if (!buildingId) {
    console.error('getSettlementBuilding: buildingId is required');
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settlement_buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (error) {
      console.error('[buildingApi] Error fetching building:', error);
      return null;
    }

    return (data as SettlementBuilding) || null;
  } catch (err) {
    console.error('[buildingApi] getSettlementBuilding error:', err);
    return null;
  }
};

/**
 * Create a new building in a settlement.
 */
export const createSettlementBuilding = async (
  settlementId: string,
  buildingType: string,
  level: number = 1
): Promise<SettlementBuilding | null> => {
  if (!settlementId || !buildingType) {
    console.error('createSettlementBuilding: missing required parameters');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const buildingData = {
      settlement_id: settlementId,
      building_type: buildingType,
      level,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('settlement_buildings')
      .insert(buildingData)
      .select()
      .single();

    if (error) {
      console.error('[buildingApi] Error creating building:', error);
      return null;
    }

    return (data as SettlementBuilding) || null;
  } catch (err) {
    console.error('[buildingApi] createSettlementBuilding error:', err);
    return null;
  }
};

/**
 * Upgrade a building to the next level.
 */
export const upgradeSettlementBuilding = async (
  buildingId: string,
  newLevel: number
): Promise<SettlementBuilding | null> => {
  if (!buildingId || newLevel < 1) {
    console.error('upgradeSettlementBuilding: invalid parameters');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('settlement_buildings')
      .update({
        level: newLevel,
        last_upgraded_at: new Date().toISOString(),
      })
      .eq('id', buildingId)
      .select()
      .single();

    if (error) {
      console.error('[buildingApi] Error upgrading building:', error);
      return null;
    }

    return (data as SettlementBuilding) || null;
  } catch (err) {
    console.error('[buildingApi] upgradeSettlementBuilding error:', err);
    return null;
  }
};

/**
 * Get all build queue entries for a settlement.
 */
export const getSettlementBuildQueue = async (
  settlementId: string
): Promise<BuildQueueEntry[]> => {
  if (!settlementId) {
    console.error('getSettlementBuildQueue: settlementId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('build_queue')
      .select('*')
      .eq('settlement_id', settlementId)
      .order('started_at', { ascending: true });

    if (error) {
      console.error('[buildingApi] Error fetching build queue:', error);
      return [];
    }

    return (data as BuildQueueEntry[]) || [];
  } catch (err) {
    console.error('[buildingApi] getSettlementBuildQueue error:', err);
    return [];
  }
};

/**
 * Queue a building construction/upgrade.
 */
export const queueBuildingConstruction = async (
  settlementId: string,
  buildingType: string,
  targetLevel: number,
  costOrichalkum: number,
  costFokuskristalle: number,
  costVitriol: number,
  durationSeconds: number,
  settlementBuildingId?: string
): Promise<BuildQueueEntry | null> => {
  if (!settlementId || !buildingType || targetLevel < 1 || durationSeconds < 0) {
    console.error('queueBuildingConstruction: invalid parameters');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const queueData = {
      settlement_id: settlementId,
      settlement_building_id: settlementBuildingId || null,
      building_type: buildingType,
      target_level: targetLevel,
      cost_orichalkum: costOrichalkum,
      cost_fokuskristalle: costFokuskristalle,
      cost_vitriol: costVitriol,
      started_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      status: 'building',
    };

    const { data, error } = await supabase
      .from('build_queue')
      .insert(queueData)
      .select()
      .single();

    if (error) {
      console.error('[buildingApi] Error queuing building construction:', error);
      return null;
    }

    return (data as BuildQueueEntry) || null;
  } catch (err) {
    console.error('[buildingApi] queueBuildingConstruction error:', err);
    return null;
  }
};

/**
 * Complete a build queue entry (called when build time finishes).
 */
export const completeBuildQueueEntry = async (
  queueEntryId: string
): Promise<BuildQueueEntry | null> => {
  if (!queueEntryId) {
    console.error('completeBuildQueueEntry: queueEntryId is required');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('build_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueEntryId)
      .select()
      .single();

    if (error) {
      console.error('[buildingApi] Error completing queue entry:', error);
      return null;
    }

    return (data as BuildQueueEntry) || null;
  } catch (err) {
    console.error('[buildingApi] completeBuildQueueEntry error:', err);
    return null;
  }
};

/**
 * Cancel a build queue entry.
 */
export const cancelBuildQueueEntry = async (
  queueEntryId: string
): Promise<boolean> => {
  if (!queueEntryId) {
    console.error('cancelBuildQueueEntry: queueEntryId is required');
    return false;
  }

  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('build_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueEntryId);

    if (error) {
      console.error('[buildingApi] Error cancelling queue entry:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[buildingApi] cancelBuildQueueEntry error:', err);
    return false;
  }
};
