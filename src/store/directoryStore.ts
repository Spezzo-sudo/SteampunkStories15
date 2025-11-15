import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GalaxyPlanet,
  GalaxySystem,
  Player,
  PlayerProfile,
  PlayerPlanetSummary,
} from '@/types';
import { ALLIANCE_DIRECTORY, CURRENT_PLAYER_ID, PLAYER_DIRECTORY, SYSTEM_SNAPSHOT } from '@/lib/mockFactory';
import { formatSystemCoordinate } from '@/lib/hex';

interface DirectoryState {
  systems: GalaxySystem[];
  players: Player[];
  favorites: string[];
  openProfileId: string | null;
  profiles: Record<string, PlayerProfile>;
  currentPlayerId: string;
}

interface DirectoryActions {
  initialize: () => Promise<void>;
  openPlayerProfile: (playerId: string) => void;
  closePlayerProfile: () => void;
  favoritePlanet: (planetId: string) => void;
  getPlanetById: (planetId: string) => GalaxyPlanet | undefined;
  getSystemById: (systemId: string) => GalaxySystem | undefined;
  getAllianceColor: (allianceId?: string) => string | undefined;
  setPlanetOwner: (planetId: string, ownerId: string, allianceId?: string) => void;
  setPlayerAlliance: (playerId: string, allianceId?: string) => void;
}

const deriveProfile = (
  playerId: string,
  systems: GalaxySystem[],
  favorites: string[],
  players: Player[],
): PlayerProfile => {
  const player = players.find((entry) => entry.id === playerId);
  const playerIndex = Math.max(0, players.findIndex((entry) => entry.id === playerId));
  const planets: PlayerPlanetSummary[] = [];
  systems.forEach((system) => {
    system.planets.forEach((planet) => {
      if (planet.ownerId === playerId) {
        planets.push({
          planetId: planet.id,
          systemId: system.id,
          slot: planet.slot,
          biome: planet.biome,
          coordinates: `${formatSystemCoordinate(system)}:${planet.slot}`,
          isFavorite: favorites.includes(planet.id),
        });
      }
    });
  });
  return {
    id: playerId,
    tagline: `${player?.name ?? 'Kommandant'} · Arkana Flotte`,
    lastActiveAt: Date.now() - playerIndex * 60 * 60 * 1000,
    allianceId: player?.allianceId,
    planets,
  };
};

export const useDirectoryStore = create<DirectoryState & DirectoryActions>()(
  immer((set, get) => ({
    systems: SYSTEM_SNAPSHOT,
    players: PLAYER_DIRECTORY,
    favorites: [],
    openProfileId: null,
    profiles: {},
    currentPlayerId: CURRENT_PLAYER_ID,
    initialize: async () => {},

    openPlayerProfile: (playerId) => {
      set((state) => {
        if (!state.profiles[playerId]) {
          state.profiles[playerId] = deriveProfile(playerId, state.systems, state.favorites, state.players);
        }
        state.openProfileId = playerId;
      });
    },

    closePlayerProfile: () => {
      set((state) => {
        state.openProfileId = null;
      });
    },

    favoritePlanet: (planetId) => {
      set((state) => {
        const isFavorite = state.favorites.includes(planetId);
        if (isFavorite) {
          state.favorites = state.favorites.filter((id) => id !== planetId);
        } else {
          state.favorites.push(planetId);
        }
        Object.values(state.profiles).forEach((profile) => {
          profile.planets.forEach((planet) => {
            if (planet.planetId === planetId) {
              planet.isFavorite = !isFavorite;
            }
          });
        });
      });
    },

    getPlanetById: (planetId) => {
      const { systems } = get();
      for (const system of systems) {
        const planet = system.planets.find((entry) => entry.id === planetId);
        if (planet) return planet;
      }
      return undefined;
    },

    getSystemById: (systemId) => get().systems.find((system) => system.id === systemId),

    getAllianceColor: (allianceId) => {
      if (!allianceId) return undefined;
      return ALLIANCE_DIRECTORY.find((entry) => entry.id === allianceId)?.color;
    },

    setPlanetOwner: (planetId, ownerId, allianceId) => {
      set((state) => {
        let previousOwnerId: string | undefined;
        for (const system of state.systems) {
          const planet = system.planets.find((p) => p.id === planetId);
          if (planet) {
            previousOwnerId = planet.ownerId;
            planet.ownerId = ownerId;
            planet.allianceId = allianceId;
            break;
          }
        }

        const affectedOwners = new Set<string>();
        if (previousOwnerId) affectedOwners.add(previousOwnerId);
        affectedOwners.add(ownerId);

        affectedOwners.forEach((playerId) => {
          state.profiles[playerId] = deriveProfile(playerId, state.systems, state.favorites, state.players);
        });
      });
    },

    setPlayerAlliance: (playerId, allianceId) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          player.allianceId = allianceId;
        }
        if (state.profiles[playerId]) {
          state.profiles[playerId].allianceId = allianceId;
        }
      });
    },
  })),
);
