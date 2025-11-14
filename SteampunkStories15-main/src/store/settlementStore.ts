import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  MilitarySettlement,
  Ship,
  MilitaryConvoy,
  ScoutReport,
  Battle,
  Defense,
} from '@/types';

/**
 * Settlement state management for multi-settlement military system.
 * Tracks settlements, ships, convoys, and military operations per settlement.
 */
interface SettlementState {
  // Settlement Management
  settlements: MilitarySettlement[];
  selectedSettlementId: string | null;

  // Fleet Management (by settlement)
  shipsBySettlement: Record<string, Ship[]>;

  // Convoys & Operations
  outgoingConvoys: MilitaryConvoy[];
  incomingConvoys: MilitaryConvoy[];

  // Intelligence & Combat
  scoutReports: ScoutReport[];
  activeBattles: Battle[];

  // Loading state
  isLoadingSettlements: boolean;
  error: string | null;
}

interface SettlementActions {
  // Settlement Management
  selectSettlement: (settlementId: string) => void;
  loadSettlements: (playerId: string) => Promise<void>;

  // Fleet Queries
  getAvailableShips: (settlementId: string) => Ship[];
  getSettlementShips: (settlementId: string) => Ship[];

  // Ship Management
  addShip: (ship: Ship) => void;
  updateShip: (ship: Ship) => void;
  removeShip: (shipId: string) => void;

  // Settlement Updates
  updateSettlement: (settlement: MilitarySettlement) => void;

  // Convoy Management
  addOutgoingConvoy: (convoy: MilitaryConvoy) => void;
  addIncomingConvoy: (convoy: MilitaryConvoy) => void;
  updateConvoy: (convoyId: string, updates: Partial<MilitaryConvoy>) => void;
  removeConvoy: (convoyId: string) => void;

  // Battle Management
  addBattle: (battle: Battle) => void;
  updateBattle: (battle: Battle) => void;

  // Scout Reports
  addScoutReport: (report: ScoutReport) => void;
  removeExpiredScoutReports: () => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

const initialState: SettlementState = {
  settlements: [],
  selectedSettlementId: null,
  shipsBySettlement: {},
  outgoingConvoys: [],
  incomingConvoys: [],
  scoutReports: [],
  activeBattles: [],
  isLoadingSettlements: false,
  error: null,
};

/**
 * Zustand store for settlement-based military operations.
 * Manages multi-settlement fleets, convoys, and combat tracking.
 */
export const useSettlementStore = create<SettlementState & SettlementActions>()(
  immer((set, get) => ({
    ...initialState,

    // ==================== SETTLEMENT MANAGEMENT ====================

    selectSettlement: (settlementId) => {
      set((state) => {
        state.selectedSettlementId = settlementId;
      });
    },

    loadSettlements: async (playerId) => {
      set((state) => {
        state.isLoadingSettlements = true;
        state.error = null;
      });

      try {
        // TODO: Call settlementApi.getPlayerSettlements(playerId)
        // For now, this is a placeholder for the API integration

        set((state) => {
          state.isLoadingSettlements = false;
        });
      } catch (err) {
        set((state) => {
          state.isLoadingSettlements = false;
          state.error = err instanceof Error ? err.message : 'Failed to load settlements';
        });
      }
    },

    // ==================== FLEET QUERIES ====================

    getAvailableShips: (settlementId) => {
      const ships = get().shipsBySettlement[settlementId] || [];
      // Filter for ships that are stationed and not in convoy
      return ships.filter((ship) => ship.status === 'stationed' && !ship.convoyId);
    },

    getSettlementShips: (settlementId) => {
      return get().shipsBySettlement[settlementId] || [];
    },

    // ==================== SHIP MANAGEMENT ====================

    addShip: (ship) => {
      set((state) => {
        if (!state.shipsBySettlement[ship.settlementId]) {
          state.shipsBySettlement[ship.settlementId] = [];
        }
        state.shipsBySettlement[ship.settlementId].push(ship);
      });
    },

    updateShip: (ship) => {
      set((state) => {
        const ships = state.shipsBySettlement[ship.settlementId];
        if (ships) {
          const index = ships.findIndex((s) => s.id === ship.id);
          if (index !== -1) {
            ships[index] = ship;
          }
        }
      });
    },

    removeShip: (shipId) => {
      set((state) => {
        Object.keys(state.shipsBySettlement).forEach((settlementId) => {
          const ships = state.shipsBySettlement[settlementId];
          const index = ships.findIndex((s) => s.id === shipId);
          if (index !== -1) {
            ships.splice(index, 1);
          }
        });
      });
    },

    // ==================== SETTLEMENT UPDATES ====================

    updateSettlement: (settlement) => {
      set((state) => {
        const index = state.settlements.findIndex((s) => s.id === settlement.id);
        if (index !== -1) {
          state.settlements[index] = settlement;
        }
      });
    },

    // ==================== CONVOY MANAGEMENT ====================

    addOutgoingConvoy: (convoy) => {
      set((state) => {
        state.outgoingConvoys.push(convoy);
      });
    },

    addIncomingConvoy: (convoy) => {
      set((state) => {
        state.incomingConvoys.push(convoy);
      });
    },

    updateConvoy: (convoyId, updates) => {
      set((state) => {
        // Update in outgoing
        const outgoingIndex = state.outgoingConvoys.findIndex((c) => c.id === convoyId);
        if (outgoingIndex !== -1) {
          state.outgoingConvoys[outgoingIndex] = {
            ...state.outgoingConvoys[outgoingIndex],
            ...updates,
          };
        }

        // Update in incoming
        const incomingIndex = state.incomingConvoys.findIndex((c) => c.id === convoyId);
        if (incomingIndex !== -1) {
          state.incomingConvoys[incomingIndex] = {
            ...state.incomingConvoys[incomingIndex],
            ...updates,
          };
        }
      });
    },

    removeConvoy: (convoyId) => {
      set((state) => {
        state.outgoingConvoys = state.outgoingConvoys.filter((c) => c.id !== convoyId);
        state.incomingConvoys = state.incomingConvoys.filter((c) => c.id !== convoyId);
      });
    },

    // ==================== BATTLE MANAGEMENT ====================

    addBattle: (battle) => {
      set((state) => {
        state.activeBattles.push(battle);
      });
    },

    updateBattle: (battle) => {
      set((state) => {
        const index = state.activeBattles.findIndex((b) => b.id === battle.id);
        if (index !== -1) {
          state.activeBattles[index] = battle;
        }
      });
    },

    // ==================== SCOUT REPORTS ====================

    addScoutReport: (report) => {
      set((state) => {
        state.scoutReports.push(report);
      });
    },

    removeExpiredScoutReports: () => {
      set((state) => {
        const now = Date.now();
        state.scoutReports = state.scoutReports.filter((r) => r.expiresAt > now);
      });
    },

    // ==================== UTILITY ====================

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    reset: () => {
      set(initialState);
    },
  }))
);
