import { getSupabaseClient } from '../supabase';
import type { MilitarySettlement, Ship, MilitaryConvoy } from '@/types';

/**
 * Settlement API - Supabase client for settlement management and military operations.
 * Provides CRUD operations for settlements, ships, and convoys.
 */

/**
 * Get all settlements belonging to a player.
 */
export const getPlayerSettlements = async (
  playerId: string
): Promise<MilitarySettlement[]> => {
  if (!playerId) {
    console.error('getPlayerSettlements: playerId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('player_id', playerId);

    if (error) {
      console.error('[settlementApi] Error fetching settlements:', error);
      return [];
    }

    return (data as MilitarySettlement[]) || [];
  } catch (err) {
    console.error('[settlementApi] getPlayerSettlements error:', err);
    return [];
  }
};

/**
 * Get a single settlement by ID.
 */
export const getSettlement = async (settlementId: string): Promise<MilitarySettlement | null> => {
  if (!settlementId) {
    console.error('getSettlement: settlementId is required');
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('id', settlementId)
      .single();

    if (error) {
      console.error('[settlementApi] Error fetching settlement:', error);
      return null;
    }

    return (data as MilitarySettlement) || null;
  } catch (err) {
    console.error('[settlementApi] getSettlement error:', err);
    return null;
  }
};

/**
 * Get all ships belonging to a settlement.
 */
export const getSettlementShips = async (settlementId: string): Promise<Ship[]> => {
  if (!settlementId) {
    console.error('getSettlementShips: settlementId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ships')
      .select('*')
      .eq('settlement_id', settlementId);

    if (error) {
      console.error('[settlementApi] Error fetching settlement ships:', error);
      return [];
    }

    return (data as Ship[]) || [];
  } catch (err) {
    console.error('[settlementApi] getSettlementShips error:', err);
    return [];
  }
};

/**
 * Get available (stationed, not in convoy) ships for a settlement.
 */
export const getAvailableShips = async (settlementId: string): Promise<Ship[]> => {
  if (!settlementId) {
    console.error('getAvailableShips: settlementId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ships')
      .select('*')
      .eq('settlement_id', settlementId)
      .eq('status', 'stationed')
      .is('convoy_id', null);

    if (error) {
      console.error('[settlementApi] Error fetching available ships:', error);
      return [];
    }

    return (data as Ship[]) || [];
  } catch (err) {
    console.error('[settlementApi] getAvailableShips error:', err);
    return [];
  }
};

/**
 * Create a new settlement.
 */
export const createSettlement = async (
  playerId: string,
  tileId: string,
  name: string
): Promise<MilitarySettlement | null> => {
  if (!playerId || !tileId || !name) {
    console.error('createSettlement: missing required parameters');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const settlement: Omit<MilitarySettlement, 'id'> = {
      playerId,
      tileId,
      name,
      level: 1,
      resources: {
        Orichalkum: 1000,
        Fokuskristalle: 500,
        Vitriol: 500,
      },
      capacities: {
        orichalkum: 5000,
        fokuskristalle: 2500,
        vitriol: 2500,
      },
      energy: {
        production: 100,
        consumption: 50,
        current: 100,
      },
      baseShipIds: [],
      defenseIds: [],
      createdAt: Date.now(),
    };

    const { data, error } = await supabase.from('settlements').insert(settlement).select();

    if (error) {
      console.error('[settlementApi] Error creating settlement:', error);
      return null;
    }

    return (data?.[0] as MilitarySettlement) || null;
  } catch (err) {
    console.error('[settlementApi] createSettlement error:', err);
    return null;
  }
};

/**
 * Update settlement.
 */
export const updateSettlement = async (
  settlementId: string,
  updates: Partial<MilitarySettlement>
): Promise<MilitarySettlement | null> => {
  if (!settlementId) {
    console.error('updateSettlement: settlementId is required');
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('settlements')
      .update(updates)
      .eq('id', settlementId)
      .select()
      .single();

    if (error) {
      console.error('[settlementApi] Error updating settlement:', error);
      return null;
    }

    return (data as MilitarySettlement) || null;
  } catch (err) {
    console.error('[settlementApi] updateSettlement error:', err);
    return null;
  }
};

/**
 * Launch a convoy (scout, attack, transport, etc.) from a settlement.
 */
export const launchConvoy = async (
  playerId: string,
  originSettlementId: string,
  shipIds: string[],
  targetTileId: string,
  missionType: 'scout' | 'attack' | 'transport' | 'station' | 'colonize'
): Promise<MilitaryConvoy | null> => {
  if (!playerId || !originSettlementId || shipIds.length === 0 || !targetTileId) {
    console.error('launchConvoy: missing required parameters');
    return null;
  }

  try {
    const supabase = getSupabaseClient();

    const convoy: Omit<MilitaryConvoy, 'id'> = {
      playerId,
      originSettlementId,
      targetTileId,
      shipIds,
      missionType,
      status: 'preparing',
      preparationEndsAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      createdAt: Date.now(),
    };

    const { data, error } = await supabase.from('convoys').insert(convoy).select();

    if (error) {
      console.error('[settlementApi] Error launching convoy:', error);
      return null;
    }

    // Update ships to mark them as in convoy
    await supabase
      .from('ships')
      .update({ convoy_id: data?.[0]?.id, status: 'preparing' })
      .in('id', shipIds);

    return (data?.[0] as MilitaryConvoy) || null;
  } catch (err) {
    console.error('[settlementApi] launchConvoy error:', err);
    return null;
  }
};

/**
 * Cancel a convoy.
 */
export const cancelConvoy = async (convoyId: string): Promise<boolean> => {
  if (!convoyId) {
    console.error('cancelConvoy: convoyId is required');
    return false;
  }

  try {
    const supabase = getSupabaseClient();

    // Get convoy to get ship IDs
    const { data: convoyData } = await supabase
      .from('convoys')
      .select('*')
      .eq('id', convoyId)
      .single();

    if (convoyData) {
      // Update ships back to stationed
      await supabase
        .from('ships')
        .update({ convoy_id: null, status: 'stationed' })
        .in('id', convoyData.ship_ids || []);
    }

    // Delete convoy
    const { error } = await supabase.from('convoys').delete().eq('id', convoyId);

    if (error) {
      console.error('[settlementApi] Error cancelling convoy:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[settlementApi] cancelConvoy error:', err);
    return false;
  }
};

/**
 * Get all incoming convoys to player's settlements.
 */
export const getIncomingConvoys = async (playerId: string): Promise<MilitaryConvoy[]> => {
  if (!playerId) {
    console.error('getIncomingConvoys: playerId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();

    // Get all settlements first
    const { data: settlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('id')
      .eq('player_id', playerId);

    if (settlementsError || !settlements) {
      return [];
    }

    const settlementIds = settlements.map((s) => s.id);

    // Get convoys targeting those settlements
    const { data, error } = await supabase
      .from('convoys')
      .select('*')
      .neq('player_id', playerId) // Not our own convoys
      .in('target_tile_id', settlementIds);

    if (error) {
      console.error('[settlementApi] Error fetching incoming convoys:', error);
      return [];
    }

    return (data as MilitaryConvoy[]) || [];
  } catch (err) {
    console.error('[settlementApi] getIncomingConvoys error:', err);
    return [];
  }
};

/**
 * Get all outgoing convoys from player's settlements.
 */
export const getOutgoingConvoys = async (playerId: string): Promise<MilitaryConvoy[]> => {
  if (!playerId) {
    console.error('getOutgoingConvoys: playerId is required');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('convoys')
      .select('*')
      .eq('player_id', playerId);

    if (error) {
      console.error('[settlementApi] Error fetching outgoing convoys:', error);
      return [];
    }

    return (data as MilitaryConvoy[]) || [];
  } catch (err) {
    console.error('[settlementApi] getOutgoingConvoys error:', err);
    return [];
  }
};
