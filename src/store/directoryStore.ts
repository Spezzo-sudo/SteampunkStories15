import { create } from 'zustand';
import {
  GalaxyPlanet,
  GalaxySystem,
  Player,
  PlayerProfile,
  PlayerPlanetSummary,
} from '@/types';
import { fetchDirectorySnapshot } from '@/lib/api/directory';
import { ALLIANCE_DIRECTORY, CURRENT_PLAYER_ID, PLAYER_DIRECTORY, SYSTEM_SNAPSHOT } from '@/lib/mockFactory';
import { formatSystemCoordinate } from '@/lib/hex';

interface DirectoryState {
  systems: GalaxySystem[];
  players: Player[];
  favorites: string[];
  openProfileId: string | null;
  profiles: Record<string, PlayerProfile>;
  currentPlayerId: string;
  allianceColors: Record<string, string>;
  isLoading: boolean;
  isReady: boolean;
  loadProgress: number;
  error?: string;
}

interface DirectoryActions {
  openPlayerProfile: (playerId: string) => void;
  closePlayerProfile: () => void;
  favoritePlanet: (planetId: string) => void;
  getPlanetById: (planetId: string) => GalaxyPlanet | undefined;
  getSystemById: (systemId: string) => GalaxySystem | undefined;
  getAllianceColor: (allianceId?: string) => string | undefined;
  setPlanetOwner: (planetId: string, ownerId: string, allianceId?: string) => void;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
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

const buildAllianceColorMap = (alliances: { id: string; color: string }[]): Record<string, string> =>
  alliances.reduce<Record<string, string>>((accumulator, alliance) => {
    accumulator[alliance.id] = alliance.color;
    return accumulator;
  }, {});

const collectPlanetIds = (systems: GalaxySystem[]): Set<string> => {
  const ids = new Set<string>();
  systems.forEach((system) => {
    system.planets.forEach((planet) => {
      ids.add(planet.id);
    });
  });
  return ids;
};

const sanitizeFavorites = (favorites: string[], systems: GalaxySystem[]): string[] => {
  const validIds = collectPlanetIds(systems);
  return favorites.filter((planetId) => validIds.has(planetId));
};

const rebuildProfiles = (
  existingProfiles: Record<string, PlayerProfile>,
  systems: GalaxySystem[],
  favorites: string[],
  players: Player[],
): Record<string, PlayerProfile> =>
  Object.keys(existingProfiles).reduce<Record<string, PlayerProfile>>((accumulator, playerId) => {
    accumulator[playerId] = deriveProfile(playerId, systems, favorites, players);
    return accumulator;
  }, {});

/**
 * Zustand store for directory, profile and favorites state management.
 */
export const useDirectoryStore = create<DirectoryState & DirectoryActions>((set, get) => ({
  systems: SYSTEM_SNAPSHOT,
  players: PLAYER_DIRECTORY,
  favorites: [],
  openProfileId: null,
  profiles: {},
  currentPlayerId: CURRENT_PLAYER_ID,
  allianceColors: buildAllianceColorMap(ALLIANCE_DIRECTORY),
  isLoading: false,
  isReady: false,
  loadProgress: 0,
  error: undefined,

  openPlayerProfile: (playerId) => {
    set((state) => {
      if (state.profiles[playerId]) {
        return { openProfileId: playerId };
      }
      const profile = deriveProfile(playerId, state.systems, state.favorites, state.players);
      return {
        openProfileId: playerId,
        profiles: { ...state.profiles, [playerId]: profile },
      };
    });
  },

  closePlayerProfile: () => set({ openProfileId: null }),

  favoritePlanet: (planetId) => {
    set((state) => {
      const isFavorite = state.favorites.includes(planetId);
      const favorites = isFavorite
        ? state.favorites.filter((id) => id !== planetId)
        : [...state.favorites, planetId];
      const profiles = Object.fromEntries(
        Object.entries(state.profiles).map(([playerId, profile]) => {
          const planets = profile.planets.map((planet) =>
            planet.planetId === planetId ? { ...planet, isFavorite: !isFavorite } : planet,
          );
          return [playerId, { ...profile, planets }];
        }),
      );
      return { favorites, profiles };
    });
  },

  getPlanetById: (planetId) => {
    const { systems } = get();
    for (const system of systems) {
      const planet = system.planets.find((entry) => entry.id === planetId);
      if (planet) {
        return planet;
      }
    }
    return undefined;
  },

  getSystemById: (systemId) => get().systems.find((system) => system.id === systemId),

  getAllianceColor: (allianceId) => {
    if (!allianceId) {
      return undefined;
    }
    const colors = get().allianceColors;
    if (colors[allianceId]) {
      return colors[allianceId];
    }
    const fallback = ALLIANCE_DIRECTORY.find((entry) => entry.id === allianceId);
    return fallback?.color;
  },

  setPlanetOwner: (planetId, ownerId, allianceId) => {
    set((state) => {
      let updatedSystems = state.systems;
      let previousOwnerId: string | undefined;
      updatedSystems = state.systems.map((system) => {
        const planets = system.planets.map((planet) => {
          if (planet.id !== planetId) {
            return planet;
          }
          previousOwnerId = planet.ownerId;
          return {
            ...planet,
            ownerId,
            allianceId,
          };
        });
        return { ...system, planets };
      });

      const profiles = { ...state.profiles };
      const affectedOwners = new Set<string>();
      if (previousOwnerId) {
        affectedOwners.add(previousOwnerId);
      }
      affectedOwners.add(ownerId);
      affectedOwners.forEach((playerId) => {
        profiles[playerId] = deriveProfile(playerId, updatedSystems, state.favorites, state.players);
      });

      return {
        systems: updatedSystems,
        profiles,
      };
    });
  },

  initialize: async () => {
    if (get().isReady || get().isLoading) {
      return;
    }
    await get().refresh();
  },

  refresh: async () => {
    set({ isLoading: true, error: undefined, loadProgress: 5 });
    try {
      const responsePromise = fetchDirectorySnapshot();
      set({ loadProgress: 35 });
      const response = await responsePromise;
      set({ loadProgress: 75 });
      set((state) => {
        const favorites = sanitizeFavorites(state.favorites, response.systems);
        const profiles = rebuildProfiles(state.profiles, response.systems, favorites, response.players);
        return {
          systems: response.systems,
          players: response.players,
          favorites,
          profiles,
          currentPlayerId: response.currentPlayerId,
          allianceColors: buildAllianceColorMap(response.alliances),
          isLoading: false,
          isReady: true,
          loadProgress: 100,
        };
      });
    } catch (error) {
      console.error('Directory snapshot fallback active:', error);
      set({ loadProgress: 90 });
      set((state) => {
        const favorites = sanitizeFavorites(state.favorites, SYSTEM_SNAPSHOT);
        const profiles = rebuildProfiles(state.profiles, SYSTEM_SNAPSHOT, favorites, PLAYER_DIRECTORY);
        return {
          systems: SYSTEM_SNAPSHOT,
          players: PLAYER_DIRECTORY,
          favorites,
          profiles,
          currentPlayerId: CURRENT_PLAYER_ID,
          allianceColors: buildAllianceColorMap(ALLIANCE_DIRECTORY),
          isLoading: false,
          isReady: true,
          loadProgress: 100,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden des Verzeichnisses.',
        };
      });
    }
  },
}));
