import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { TECH_TREE_NODES, type TechNode } from '@/constants/techTree';
import type { ResourceId } from '@/types/biome';

/**
 * Research progress entry tracking a single technology being researched.
 */
export interface ResearchEntry {
  id: string; // Tech node ID
  startedAt: number; // Timestamp when research started
  completesAt: number; // Timestamp when research will complete
  status: 'researching' | 'completed' | 'cancelled';
  tier: number; // Tech tier for UI sorting
}

/**
 * Research state management.
 * Tracks completed research, active research queue, and tech tree progression.
 */
interface ResearchState {
  // === Research Progress ===
  /** Completed research by tech ID (tech ID -> completion timestamp) */
  completedResearch: Record<string, number>;

  /** Active research queue (max 1 active at a time for now) */
  activeResearch: ResearchEntry | null;

  /** Research history (completed + cancelled) */
  researchHistory: ResearchEntry[];

  // === Resources (for cost validation) ===
  /** Available resources for research (synced from game store) */
  availableResources: Partial<Record<ResourceId, number>>;

  // === UI State ===
  error: string | null;
  isLoading: boolean;
}

interface ResearchActions {
  // === Query Methods ===
  /** Check if a tech has been researched */
  hasResearched: (techId: string) => boolean;

  /** Get completion timestamp for a tech (0 if not completed) */
  getCompletionTime: (techId: string) => number;

  /** Check if a tech's requirements are met */
  canResearch: (techId: string) => { canResearch: boolean; reasons: string[] };

  /** Get all available (unlocked but not researched) techs */
  getAvailableTechs: () => TechNode[];

  /** Get all completed techs */
  getCompletedTechs: () => TechNode[];

  // === Research Operations ===
  /** Start researching a technology */
  startResearch: (techId: string, durationMs: number) => Promise<boolean>;

  /** Complete active research */
  completeResearch: () => void;

  /** Cancel active research (no refund) */
  cancelResearch: () => void;

  // === State Management ===
  /** Update available resources (called by game store) */
  setAvailableResources: (resources: Partial<Record<ResourceId, number>>) => void;

  /** Tick research progress (called by game loop) */
  tickResearch: (now: number) => void;

  /** Reset all research state */
  reset: () => void;
}

const initialState: ResearchState = {
  completedResearch: {},
  activeResearch: null,
  researchHistory: [],
  availableResources: {},
  error: null,
  isLoading: false,
};

/**
 * Zustand store for research and tech tree progression.
 * Manages research queue, completion tracking, and requirement validation.
 */
export const useResearchStore = create<ResearchState & ResearchActions>()(
  immer((set, get) => ({
    ...initialState,

    // ==================== QUERY METHODS ====================

    hasResearched: (techId) => {
      return techId in get().completedResearch;
    },

    getCompletionTime: (techId) => {
      return get().completedResearch[techId] || 0;
    },

    canResearch: (techId) => {
      const reasons: string[] = [];
      const state = get();

      // Find tech node
      const tech = TECH_TREE_NODES.find((t) => t.id === techId);
      if (!tech) {
        return { canResearch: false, reasons: ['Technologie nicht gefunden'] };
      }

      // Check if already completed
      if (state.hasResearched(techId)) {
        reasons.push('Bereits erforscht');
      }

      // Check if already researching
      if (state.activeResearch && state.activeResearch.id === techId) {
        reasons.push('Bereits in Forschung');
      }

      // Check if another research is active (one at a time for now)
      if (state.activeResearch && state.activeResearch.id !== techId) {
        reasons.push('Eine andere Forschung ist bereits aktiv');
      }

      // Check requirements
      for (const reqId of tech.requires) {
        if (!state.hasResearched(reqId)) {
          const reqTech = TECH_TREE_NODES.find((t) => t.id === reqId);
          const reqName = reqTech?.name || reqId;
          reasons.push(`Benötigt: ${reqName}`);
        }
      }

      // Check resource costs
      for (const [resource, amount] of Object.entries(tech.cost)) {
        const available = state.availableResources[resource as ResourceId] || 0;
        if (available < amount) {
          reasons.push(`Nicht genug ${resource} (benötigt: ${amount}, verfügbar: ${available})`);
        }
      }

      return {
        canResearch: reasons.length === 0,
        reasons,
      };
    },

    getAvailableTechs: () => {
      const state = get();
      return TECH_TREE_NODES.filter((tech) => {
        // Not completed
        if (state.hasResearched(tech.id)) {
          return false;
        }
        // Not currently researching
        if (state.activeResearch?.id === tech.id) {
          return false;
        }
        // All requirements met
        const allReqsMet = tech.requires.every((reqId) => state.hasResearched(reqId));
        return allReqsMet;
      });
    },

    getCompletedTechs: () => {
      const state = get();
      const completedIds = Object.keys(state.completedResearch);
      return TECH_TREE_NODES.filter((tech) => completedIds.includes(tech.id)).sort(
        (a, b) => state.completedResearch[a.id] - state.completedResearch[b.id]
      );
    },

    // ==================== RESEARCH OPERATIONS ====================

    startResearch: async (techId, durationMs) => {
      const state = get();
      const validation = state.canResearch(techId);

      if (!validation.canResearch) {
        set((draft) => {
          draft.error = validation.reasons.join(', ');
        });
        console.error('[researchStore] Cannot start research:', validation.reasons);
        return false;
      }

      const tech = TECH_TREE_NODES.find((t) => t.id === techId);
      if (!tech) {
        set((draft) => {
          draft.error = 'Technologie nicht gefunden';
        });
        return false;
      }

      const now = Date.now();

      set((draft) => {
        // Deduct resources (this should be synced with game store in real implementation)
        for (const [resource, amount] of Object.entries(tech.cost)) {
          const current = draft.availableResources[resource as ResourceId] || 0;
          draft.availableResources[resource as ResourceId] = Math.max(0, current - amount);
        }

        // Start research
        draft.activeResearch = {
          id: techId,
          startedAt: now,
          completesAt: now + durationMs,
          status: 'researching',
          tier: tech.tier,
        };

        draft.error = null;
      });

      console.log(`[researchStore] Started research: ${tech.name} (${durationMs}ms)`);
      return true;
    },

    completeResearch: () => {
      const state = get();
      const active = state.activeResearch;

      if (!active || active.status !== 'researching') {
        return;
      }

      set((draft) => {
        // Mark as completed
        draft.completedResearch[active.id] = Date.now();

        // Update history
        const historyEntry = { ...active, status: 'completed' as const };
        draft.researchHistory.push(historyEntry);

        // Clear active research
        draft.activeResearch = null;
      });

      const tech = TECH_TREE_NODES.find((t) => t.id === active.id);
      console.log(`[researchStore] Completed research: ${tech?.name || active.id}`);

      // TODO: Apply research effects (production bonuses, unlock units, etc.)
      // This will need integration with other stores:
      // - gameStore for production bonuses
      // - shipyardStore for unlocking ship blueprints
      // - buildingStore for unlocking buildings
    },

    cancelResearch: () => {
      const state = get();
      const active = state.activeResearch;

      if (!active) {
        return;
      }

      set((draft) => {
        // Update history
        const historyEntry = { ...active, status: 'cancelled' as const };
        draft.researchHistory.push(historyEntry);

        // Clear active research (no refund)
        draft.activeResearch = null;
      });

      const tech = TECH_TREE_NODES.find((t) => t.id === active.id);
      console.log(`[researchStore] Cancelled research: ${tech?.name || active.id}`);
    },

    // ==================== STATE MANAGEMENT ====================

    setAvailableResources: (resources) => {
      set((draft) => {
        draft.availableResources = resources;
      });
    },

    tickResearch: (now) => {
      const state = get();
      const active = state.activeResearch;

      if (!active || active.status !== 'researching') {
        return;
      }

      // Check if research should complete
      if (now >= active.completesAt) {
        get().completeResearch();
      }
    },

    reset: () => {
      set(initialState);
    },
  }))
);
