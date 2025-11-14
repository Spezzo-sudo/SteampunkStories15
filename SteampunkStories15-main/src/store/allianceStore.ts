import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Alliance } from '@/types';
import { ALLIANCE_DIRECTORY, CURRENT_PLAYER_ID } from '@/lib/mockFactory';
import { fetchAllianceDirectory } from '@/lib/api/alliances';
import { useDirectoryStore } from '@/store/directoryStore';

interface AllianceState {
  alliances: Alliance[];
  invites: Record<string, string>;
  myAllianceId?: string;
  currentPlayerId: string;
  isLoading: boolean;
  isReady: boolean;
  error?: string;
}

interface CreateAlliancePayload {
  tag: string;
  name: string;
  color: string;
}

interface AllianceActions {
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  createAlliance: (payload: CreateAlliancePayload) => void;
  joinAlliance: (inviteCode: string) => void;
  leaveAlliance: () => void;
  setAllianceColor: (color: string) => void;
  addNote: (text: string) => void;
  addPact: (type: 'nap' | 'ally', targetAllianceId: string) => void;
}

const cloneAlliance = (alliance: Alliance): Alliance => ({
  ...alliance,
  members: [...alliance.members],
  ranks: alliance.ranks.map((rank) => ({ ...rank, permissions: { ...rank.permissions } })),
  pacts: alliance.pacts.map((pact) => ({ ...pact })),
  notes: [...alliance.notes],
});

const bootstrapAlliances = () => ALLIANCE_DIRECTORY.map((alliance) => cloneAlliance(alliance));

const buildInvites = (alliances: Alliance[]) =>
  alliances.reduce<Record<string, string>>((acc, alliance) => {
    acc[`${alliance.tag}-JOIN`] = alliance.id;
    return acc;
  }, {});

const resolveCurrentPlayerId = () => useDirectoryStore.getState().currentPlayerId || CURRENT_PLAYER_ID;

export const useAllianceStore = create<AllianceState & AllianceActions>()(
  immer((set, get) => ({
    alliances: [],
    invites: {},
    myAllianceId: undefined,
    currentPlayerId: CURRENT_PLAYER_ID,
    isLoading: false,
    isReady: false,
    error: undefined,

    initialize: async () => {
      if (get().isReady || get().isLoading) {
        return;
      }
      await get().refresh();
    },

    refresh: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = undefined;
      });
      const currentPlayerId = resolveCurrentPlayerId();
      try {
        const response = await fetchAllianceDirectory();
        const alliances = response.alliances.map((alliance) => cloneAlliance(alliance));
        const invites = Object.keys(response.invites ?? {}).length > 0 ? response.invites : buildInvites(alliances);
        const myAllianceId = alliances.find((entry) => entry.members.includes(currentPlayerId))?.id;

        set((state) => {
          state.alliances = alliances;
          state.invites = invites;
          state.currentPlayerId = currentPlayerId;
          state.myAllianceId = myAllianceId;
          state.isLoading = false;
          state.isReady = true;
        });
      } catch (error) {
        console.error('Alliance directory fallback active:', error);
        const alliances = bootstrapAlliances();
        const invites = buildInvites(alliances);
        const myAllianceId = alliances.find((entry) => entry.members.includes(currentPlayerId))?.id;

        set((state) => {
          state.alliances = alliances;
          state.invites = invites;
          state.currentPlayerId = currentPlayerId;
          state.myAllianceId = myAllianceId;
          state.isLoading = false;
          state.isReady = true;
          state.error = error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Allianzen.';
        });
      }
    },

    createAlliance: ({ tag, name, color }) => {
      set((state) => {
        const allianceId = `alliance-${state.alliances.length + 1}-${Date.now()}`;

        if (state.myAllianceId) {
          const oldAlliance = state.alliances.find((a) => a.id === state.myAllianceId);
          if (oldAlliance) {
            oldAlliance.members = oldAlliance.members.filter((m) => m !== state.currentPlayerId);
          }
        }

        const newAlliance: Alliance = {
          id: allianceId,
          tag,
          name,
          color,
          members: [state.currentPlayerId],
          ranks: state.alliances[0]?.ranks.map((rank) => ({ ...rank, permissions: { ...rank.permissions } })) ?? [],
          pacts: [],
          notes: ['* Frisch gegründete Bande – strukturiert eure Kommandokette.'],
        };

        state.alliances.push(newAlliance);
        state.invites[`${tag}-JOIN`] = allianceId;
        state.myAllianceId = allianceId;
      });
    },

    joinAlliance: (inviteCode) => {
      const allianceId = get().invites[inviteCode];
      if (!allianceId) return;

      set((state) => {
        if (state.myAllianceId) {
          const oldAlliance = state.alliances.find((a) => a.id === state.myAllianceId);
          if (oldAlliance) {
            oldAlliance.members = oldAlliance.members.filter((m) => m !== state.currentPlayerId);
          }
        }

        const newAlliance = state.alliances.find((a) => a.id === allianceId);
        if (newAlliance && !newAlliance.members.includes(state.currentPlayerId)) {
          newAlliance.members.push(state.currentPlayerId);
        }
        state.myAllianceId = allianceId;
      });
    },

    leaveAlliance: () => {
      set((state) => {
        if (!state.myAllianceId) return;
        const alliance = state.alliances.find((a) => a.id === state.myAllianceId);
        if (alliance) {
          alliance.members = alliance.members.filter((m) => m !== state.currentPlayerId);
        }
        state.myAllianceId = undefined;
      });
    },

    setAllianceColor: (color) => {
      set((state) => {
        if (!state.myAllianceId) return;
        const alliance = state.alliances.find((a) => a.id === state.myAllianceId);
        if (alliance) {
          alliance.color = color;
        }
      });
    },

    addNote: (text) => {
      set((state) => {
        if (!state.myAllianceId || !text.trim()) return;
        const alliance = state.alliances.find((a) => a.id === state.myAllianceId);
        if (alliance) {
          alliance.notes.push(text.trim());
        }
      });
    },

    addPact: (type, targetAllianceId) => {
      set((state) => {
        if (!state.myAllianceId || !targetAllianceId) return;
        const alliance = state.alliances.find((a) => a.id === state.myAllianceId);
        if (alliance) {
          alliance.pacts.push({
            id: `pact-${alliance.id}-${Date.now()}`,
            type,
            targetAllianceId,
          });
        }
      });
    },
  })),
);
