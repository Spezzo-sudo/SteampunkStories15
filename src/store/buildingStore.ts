import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SettlementBuilding, BuildQueueEntry } from '@/types';
import {
  getSettlementBuildings,
  getSettlementBuildQueue,
  upgradeSettlementBuilding,
  queueBuildingConstruction,
  completeBuildQueueEntry,
  cancelBuildQueueEntry,
} from '@/services/supabase/buildingApi';
import { SETTLEMENT_BUILDING_CONFIGS, BUILDINGS, SETTLEMENT_CAPACITY_BY_LEVEL } from '@/constants';
import { getCityState, canBuildInCity, calculateSizeIncrease } from '@/lib/cityState';

/**
 * Settlement building state management.
 * Tracks buildings per settlement and construction queues.
 */
interface BuildingState {
  // Buildings by settlement
  buildingsBySettlement: Record<string, SettlementBuilding[]>;

  // Build queues by settlement
  buildQueuesBySettlement: Record<string, BuildQueueEntry[]>;

  // Loading state
  isLoadingBuildings: Record<string, boolean>;
  error: string | null;
}

interface BuildingActions {
  // Load building data
  loadSettlementBuildings: (settlementId: string) => Promise<void>;
  loadSettlementBuildQueue: (settlementId: string) => Promise<void>;

  // Query methods
  getSettlementBuilding: (settlementId: string, buildingType: string) => SettlementBuilding | undefined;
  getSettlementBuildingLevel: (settlementId: string, buildingType: string) => number;
  getActiveBuilds: (settlementId: string) => BuildQueueEntry[];
  getSettlementCapacity: (settlementId: string, settlementLevel: number) => { used: number; max: number };
  canBuildBuilding: (
    settlementId: string,
    buildingType: string,
    newLevel: number,
    settlementLevel: number,
    biomeId?: string
  ) => { canBuild: boolean; reasons: string[] };

  // Building operations
  queueBuildingUpgrade: (
    settlementId: string,
    buildingType: string,
    targetLevel: number,
    durationSeconds: number,
    costs: { orichalkum: number; fokuskristalle: number; vitriol: number }
  ) => Promise<BuildQueueEntry | null>;

  completeBuild: (queueEntryId: string, settlementId: string, buildingType: string) => Promise<void>;
  cancelBuild: (queueEntryId: string, settlementId: string) => Promise<void>;

  // State updates
  addBuildQueueEntry: (settlementId: string, entry: BuildQueueEntry) => void;
  removeBuildQueueEntry: (settlementId: string, entryId: string) => void;
  updateBuildingLevel: (settlementId: string, building: SettlementBuilding) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

const initialState: BuildingState = {
  buildingsBySettlement: {},
  buildQueuesBySettlement: {},
  isLoadingBuildings: {},
  error: null,
};

/**
 * Zustand store for settlement-specific building management.
 * Handles construction, upgrades, and capacity limits.
 */
export const useBuildingStore = create<BuildingState & BuildingActions>()(
  immer((set, get) => ({
    ...initialState,

    // ==================== LOAD DATA ====================

    loadSettlementBuildings: async (settlementId) => {
      if (!settlementId) {
        set((state) => {
          state.error = 'settlementId is required';
        });
        return;
      }

      set((state) => {
        state.isLoadingBuildings[settlementId] = true;
        state.error = null;
      });

      try {
        const buildings = await getSettlementBuildings(settlementId);
        set((state) => {
          state.buildingsBySettlement[settlementId] = buildings;
          state.isLoadingBuildings[settlementId] = false;
        });
      } catch (err) {
        set((state) => {
          state.isLoadingBuildings[settlementId] = false;
          state.error = err instanceof Error ? err.message : 'Failed to load buildings';
        });
      }
    },

    loadSettlementBuildQueue: async (settlementId) => {
      if (!settlementId) {
        set((state) => {
          state.error = 'settlementId is required';
        });
        return;
      }

      try {
        const queue = await getSettlementBuildQueue(settlementId);
        set((state) => {
          state.buildQueuesBySettlement[settlementId] = queue;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to load build queue';
        });
      }
    },

    // ==================== QUERY METHODS ====================

    getSettlementBuilding: (settlementId, buildingType) => {
      const buildings = get().buildingsBySettlement[settlementId] || [];
      return buildings.find((b) => b.buildingType === buildingType);
    },

    getSettlementBuildingLevel: (settlementId, buildingType) => {
      const building = get().getSettlementBuilding(settlementId, buildingType);
      return building?.level || 0;
    },

    getActiveBuilds: (settlementId) => {
      const queue = get().buildQueuesBySettlement[settlementId] || [];
      return queue.filter((q) => q.status === 'building');
    },

    getSettlementCapacity: (settlementId, settlementLevel) => {
      const buildings = get().buildingsBySettlement[settlementId] || [];
      const maxCapacity = SETTLEMENT_CAPACITY_BY_LEVEL[settlementLevel] || SETTLEMENT_CAPACITY_BY_LEVEL[1];

      let usedCapacity = 0;
      buildings.forEach((building) => {
        const config = SETTLEMENT_BUILDING_CONFIGS[building.buildingType];
        if (config) {
          usedCapacity += building.level * config.sizePerLevel;
        }
      });

      return {
        used: usedCapacity,
        max: maxCapacity,
      };
    },

    canBuildBuilding: (settlementId, buildingType, newLevel, settlementLevel, biomeId) => {
      const reasons: string[] = [];

      // Check if building type exists
      const config = SETTLEMENT_BUILDING_CONFIGS[buildingType];
      if (!config) {
        return {
          canBuild: false,
          reasons: ['Unbekannter Gebäudetyp'],
        };
      }

      // Check max level
      if (config.maxLevel && newLevel > config.maxLevel) {
        reasons.push(`Maximales Level erreicht: ${config.maxLevel}`);
      }

      // Get current buildings for capacity calculation
      const buildings = get().buildingsBySettlement[settlementId] || [];
      const currentBuilding = buildings.find((b) => b.buildingType === buildingType);
      const currentLevel = currentBuilding?.level || 0;

      // If biomeId is provided, use advanced city state validation
      if (biomeId) {
        const cityState = getCityState(settlementId, biomeId, settlementLevel, buildings);

        // Check biome-based building restrictions
        const biomeCheck = canBuildInCity(cityState, buildingType, newLevel);
        if (!biomeCheck.canBuild) {
          reasons.push(...biomeCheck.reasons);
        }

        // Check capacity with size increase
        const sizeIncrease = calculateSizeIncrease(buildingType, currentLevel, newLevel);
        if (cityState.availableSlots < sizeIncrease) {
          reasons.push(
            `Nicht genug Baukapazität (benötigt: ${sizeIncrease}, verfügbar: ${cityState.availableSlots})`
          );
        }
      } else {
        // Fallback: legacy capacity check without biome validation
        const sizeIncrease = calculateSizeIncrease(buildingType, currentLevel, newLevel);
        const { used: usedCapacity, max: maxCapacity } = get().getSettlementCapacity(
          settlementId,
          settlementLevel
        );

        if (usedCapacity + sizeIncrease > maxCapacity) {
          reasons.push(
            `Nicht genug Baukapazität (benötigt: ${sizeIncrease}, verfügbar: ${maxCapacity - usedCapacity})`
          );
        }
      }

      return {
        canBuild: reasons.length === 0,
        reasons,
      };
    },

    // ==================== BUILDING OPERATIONS ====================

    queueBuildingUpgrade: async (settlementId, buildingType, targetLevel, durationSeconds, costs) => {
      if (!settlementId || !buildingType || targetLevel < 1) {
        set((state) => {
          state.error = 'Invalid parameters for queueBuildingUpgrade';
        });
        return null;
      }

      try {
        const currentBuilding = get().getSettlementBuilding(settlementId, buildingType);
        const buildingId = currentBuilding?.id;

        const queueEntry = await queueBuildingConstruction(
          settlementId,
          buildingType,
          targetLevel,
          costs.orichalkum,
          costs.fokuskristalle,
          costs.vitriol,
          durationSeconds,
          buildingId
        );

        if (queueEntry) {
          set((state) => {
            if (!state.buildQueuesBySettlement[settlementId]) {
              state.buildQueuesBySettlement[settlementId] = [];
            }
            state.buildQueuesBySettlement[settlementId].push(queueEntry);
            state.error = null;
          });
        }

        return queueEntry;
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to queue building upgrade';
        });
        return null;
      }
    },

    completeBuild: async (queueEntryId, settlementId, buildingType) => {
      if (!queueEntryId || !settlementId || !buildingType) {
        return;
      }

      try {
        // Complete the queue entry
        await completeBuildQueueEntry(queueEntryId);

        // Find the queue entry to get target level
        const queue = get().buildQueuesBySettlement[settlementId] || [];
        const queueEntry = queue.find((q) => q.id === queueEntryId);

        if (queueEntry) {
          // Update or create building in store
          const currentBuilding = get().getSettlementBuilding(settlementId, buildingType);

          if (currentBuilding) {
            // Upgrade existing building
            const updatedBuilding = {
              ...currentBuilding,
              level: queueEntry.targetLevel,
              lastUpgradedAt: Date.now(),
            };

            set((state) => {
              const buildings = state.buildingsBySettlement[settlementId];
              const index = buildings.findIndex((b) => b.id === currentBuilding.id);
              if (index !== -1) {
                buildings[index] = updatedBuilding;
              }
              // Remove from queue
              const queueIndex = state.buildQueuesBySettlement[settlementId].findIndex(
                (q) => q.id === queueEntryId
              );
              if (queueIndex !== -1) {
                state.buildQueuesBySettlement[settlementId][queueIndex].status = 'completed';
              }
            });
          }
        }
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to complete build';
        });
      }
    },

    cancelBuild: async (queueEntryId, settlementId) => {
      if (!queueEntryId || !settlementId) {
        return;
      }

      try {
        await cancelBuildQueueEntry(queueEntryId);

        set((state) => {
          const queue = state.buildQueuesBySettlement[settlementId];
          if (queue) {
            const index = queue.findIndex((q) => q.id === queueEntryId);
            if (index !== -1) {
              queue[index].status = 'cancelled';
            }
          }
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to cancel build';
        });
      }
    },

    // ==================== STATE UPDATES ====================

    addBuildQueueEntry: (settlementId, entry) => {
      set((state) => {
        if (!state.buildQueuesBySettlement[settlementId]) {
          state.buildQueuesBySettlement[settlementId] = [];
        }
        state.buildQueuesBySettlement[settlementId].push(entry);
      });
    },

    removeBuildQueueEntry: (settlementId, entryId) => {
      set((state) => {
        const queue = state.buildQueuesBySettlement[settlementId];
        if (queue) {
          const index = queue.findIndex((q) => q.id === entryId);
          if (index !== -1) {
            queue.splice(index, 1);
          }
        }
      });
    },

    updateBuildingLevel: (settlementId, building) => {
      set((state) => {
        const buildings = state.buildingsBySettlement[settlementId];
        if (buildings) {
          const index = buildings.findIndex((b) => b.id === building.id);
          if (index !== -1) {
            buildings[index] = building;
          } else {
            buildings.push(building);
          }
        } else {
          state.buildingsBySettlement[settlementId] = [building];
        }
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
