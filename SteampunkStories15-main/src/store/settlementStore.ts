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
import {
  calculateIntelLevel,
  checkScoutDetection,
  generateScoutReportData,
} from '@/lib/scouting';

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
  getScoutReportsForTile: (tileId: string) => ScoutReport[];
  getScoutReportsBySettlement: (settlementId: string) => ScoutReport[];

  // Scout Missions
  planScoutMission: (
    originSettlementId: string,
    shipIds: string[],
    targetTileId: string
  ) => string | null;
  executeScoutMission: (convoyId: string) => Promise<void>;
  progressScoutMissions: (playerId: string) => void;
  loadScoutReports: (playerId: string) => Promise<void>;

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

    getScoutReportsForTile: (tileId) => {
      return get().scoutReports.filter((r) => r.targetTileId === tileId);
    },

    getScoutReportsBySettlement: (settlementId) => {
      return get().scoutReports.filter((r) => r.originSettlementId === settlementId);
    },

    // ==================== SCOUT MISSIONS ====================

    planScoutMission: (originSettlementId, shipIds, targetTileId) => {
      if (!originSettlementId || shipIds.length === 0 || !targetTileId) {
        console.error('planScoutMission: missing required parameters');
        return null;
      }

      // Validate ships belong to settlement
      const settlement = get().settlements.find((s) => s.id === originSettlementId);
      if (!settlement) {
        console.error('planScoutMission: settlement not found');
        return null;
      }

      const ships = get().shipsBySettlement[originSettlementId] || [];
      const validShips = ships.filter((s) => shipIds.includes(s.id));

      if (validShips.length !== shipIds.length) {
        console.error('planScoutMission: some ships not found in settlement');
        return null;
      }

      // Create convoy ID (temporary, would be assigned by API)
      const convoyId = `convoy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const convoy: MilitaryConvoy = {
        id: convoyId,
        playerId: settlement.playerId,
        originSettlementId,
        targetTileId,
        shipIds,
        missionType: 'scout',
        status: 'preparing',
        preparationEndsAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        createdAt: Date.now(),
      };

      set((state) => {
        state.outgoingConvoys.push(convoy);
        // Mark ships as preparing
        validShips.forEach((ship) => {
          const shipIndex = state.shipsBySettlement[originSettlementId].findIndex(
            (s) => s.id === ship.id
          );
          if (shipIndex !== -1) {
            state.shipsBySettlement[originSettlementId][shipIndex].status = 'preparing';
            state.shipsBySettlement[originSettlementId][shipIndex].convoyId = convoyId;
          }
        });
      });

      return convoyId;
    },

    executeScoutMission: async (convoyId) => {
      const convoy = get().outgoingConvoys.find((c) => c.id === convoyId);
      if (!convoy || convoy.missionType !== 'scout') {
        console.error('executeScoutMission: convoy not found or wrong type');
        return;
      }

      // TODO: Call settlementApi.launchConvoy() with scout mission
      // This is a placeholder for the API integration

      set((state) => {
        const convoyIndex = state.outgoingConvoys.findIndex((c) => c.id === convoyId);
        if (convoyIndex !== -1) {
          state.outgoingConvoys[convoyIndex].status = 'en_route';
          state.outgoingConvoys[convoyIndex].departureTime = Date.now();
          // Calculate arrival based on distance (simplified for now)
          state.outgoingConvoys[convoyIndex].arrivalTime = Date.now() + 10 * 60 * 1000; // 10 min demo
        }
      });
    },

    progressScoutMissions: (playerId) => {
      const state = get();
      const now = Date.now();

      // Find scout convoys that have arrived
      const arrivedConvoys = state.outgoingConvoys.filter(
        (c) => c.playerId === playerId &&
                c.missionType === 'scout' &&
                c.status === 'en_route' &&
                c.arrivalTime &&
                c.arrivalTime <= now
      );

      arrivedConvoys.forEach((convoy) => {
        // Get the ships that were on this mission
        const scoutShips = state.shipsBySettlement[convoy.originSettlementId]?.filter((s) =>
          convoy.shipIds.includes(s.id)
        ) || [];

        if (scoutShips.length === 0) return;

        // Calculate intel level based on scout ships
        const intelLevel = calculateIntelLevel(scoutShips);

        // Check if scout was detected
        const detected = checkScoutDetection(intelLevel);

        if (!detected) {
          // Generate scout report with gathered intel
          const reportData = generateScoutReportData(
            {
              owner: undefined, // Would be fetched from tile info in real implementation
              defenses: [],     // Would be fetched from tile defenses
              stationedShips: [], // Would be fetched from stationed ships
            },
            intelLevel
          );

          const scoutReport: ScoutReport = {
            id: `report-${convoy.id}`,
            playerId,
            originSettlementId: convoy.originSettlementId,
            targetTileId: convoy.targetTileId,
            intelLevel,
            reportData,
            createdAt: now,
            expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
          };

          set((state) => {
            // Add scout report
            state.scoutReports.push(scoutReport);
          });
        }

        // Mark ships as stationed again
        set((state) => {
          scoutShips.forEach((ship) => {
            const shipIndex = state.shipsBySettlement[convoy.originSettlementId].findIndex(
              (s) => s.id === ship.id
            );
            if (shipIndex !== -1) {
              state.shipsBySettlement[convoy.originSettlementId][shipIndex].status = 'stationed';
              state.shipsBySettlement[convoy.originSettlementId][shipIndex].convoyId = undefined;
            }
          });
        });

        // Mark convoy as completed
        set((state) => {
          const convoyIndex = state.outgoingConvoys.findIndex((c) => c.id === convoy.id);
          if (convoyIndex !== -1) {
            state.outgoingConvoys[convoyIndex].status = 'completed';
          }
        });
      });
    },

    loadScoutReports: async (playerId) => {
      // TODO: Call settlementApi.getScoutReports(playerId)
      // This is a placeholder for the API integration
      try {
        // Placeholder: would fetch from API
        set((state) => {
          state.error = null;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to load scout reports';
        });
      }
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
