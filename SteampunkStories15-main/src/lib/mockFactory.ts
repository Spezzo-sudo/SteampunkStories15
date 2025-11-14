import {
  Alliance,
  AlliancePact,
  AllianceRank,
  GalaxyPlanet,
  GalaxySystem,
  PlanetBiome,
  Player,
} from '@/types';
import { createGalaxyCoordinate } from '@/lib/hex';
import { pickBiomeForSector, SectorFeatures } from '@/lib/biomeRules';

interface UniverseSeedOptions {
  allianceCount?: number;
  playerCount?: number;
  systemWidth?: number;
  systemHeight?: number;
}

type RandomFn = () => number;

const PALETTE = ['#facc15', '#f97316', '#38bdf8', '#a855f7', '#34d399', '#f472b6', '#22d3ee', '#f87171'];
const ALLIANCE_NAMES = [
  ['AER', 'Ätherische Expeditionäre'],
  ['BRG', 'Brassgear Garde'],
  ['CLK', 'Clockwork Legion'],
  ['DKR', 'Dunkelkern Syndikat'],
  ['EON', 'Eon Navigatoren'],
  ['FUM', 'Fumarium Hanse'],
  ['GLM', 'Glimmerpakt'],
  ['HEL', 'Helion Konklave'],
  ['IGN', 'Ignis Armada'],
  ['LUX', 'Lux Machina'],
  ['MER', 'Merkurisches Kartell'],
  ['NIM', 'Nimbus Orden'],
  ['OBS', 'Observatoriumskreis'],
  ['PYR', 'Pyroclast Kohorte'],
  ['QUA', 'Quarz Allianz'],
  ['RIM', 'Riftmariner'],
  ['STE', 'Steamvigil'],
  ['ZEN', 'Zenith Gesellschaft'],
];

const PLAYER_NAMES = [
  'Captain Selene',
  'Lord Vraxx',
  'Magister Aurum',
  'Navigator Nyx',
  'Duchess Volta',
  'Maréchal Arcturus',
  'Gilde der Navigatoren',
  'Haus Zephyr',
  'Admiral Ferris',
  'Mechanist Lyra',
  'Guildmaster Brumm',
  'Savant Cressida',
  'Chronicler Vox',
  'Oracle Mira',
  'Skipper Thorne',
  'Graf Obsidian',
];

const PLANET_NAMES = [
  'Chronos Prime',
  'Aetherion',
  'Helios',
  'Rhea',
  'Aurora',
  'Nimbus Reach',
  'Ferrum',
  'Cinderfall',
  'Galanthys',
  'Vigilant Star',
  'Elyss',
  'Mirage',
  'Oberon',
  'Arcadia',
  'Voltspire',
  'Sable Crest',
];

const STAR_CLASSES: SectorFeatures['starClass'][] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

/**
 * Deterministic linear congruential generator to keep mock data stable across reloads.
 */
const createRandom = (seed: number): RandomFn => {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) % 0xffffffff;
    return state / 0xffffffff;
  };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const pseudoNoise = (x: number, y: number, z: number) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return clamp01(value - Math.floor(value));
};

const createSectorFeatures = (sectorQ: number, sectorR: number, sysIndex: number): SectorFeatures => {
  const baseAether = pseudoNoise(sectorQ + 11.2, sectorR + 4.7, sysIndex * 0.53);
  const baseDebris = pseudoNoise(sectorQ + 7.3, sectorR + 12.1, sysIndex * 0.33);
  const baseTraffic = pseudoNoise(sectorQ + 19.4, sectorR + 8.2, sysIndex * 0.22);
  const baseLaw = pseudoNoise(sectorQ + 2.4, sectorR + 25.8, sysIndex * 0.12);
  const baseGravity = pseudoNoise(sectorQ + 17.7, sectorR + 5.1, sysIndex * 0.42);
  const baseHeat = pseudoNoise(sectorQ + 29.9, sectorR + 3.6, sysIndex * 0.71);
  const baseHabitability = pseudoNoise(sectorQ + 9.9, sectorR + 14.4, sysIndex * 0.61);

  const aether = clamp01(0.6 * baseAether + 0.4 * baseGravity);
  const debris = clamp01(0.4 * baseDebris + 0.4 * baseGravity + 0.2 * baseHeat);
  const traffic = clamp01(0.7 * baseTraffic + 0.3 * baseHabitability);
  const law = clamp01(0.5 * baseLaw + 0.3 * (1 - baseDebris) + 0.2 * traffic);
  const gravityShear = clamp01(baseGravity);
  const heat = clamp01(0.7 * baseHeat + 0.3 * baseAether);
  const habitability = clamp01(0.6 * baseHabitability + 0.4 * (1 - baseHeat));
  const starIndex = Math.floor(pseudoNoise(sectorQ, sectorR, sysIndex) * STAR_CLASSES.length) % STAR_CLASSES.length;

  return {
    starClass: STAR_CLASSES[starIndex],
    aether,
    debris,
    traffic,
    law,
    gravityShear,
    heat,
    habitability,
  };
};

/**
 * Picks an entry from a list using the provided random function.
 */
const pick = <T>(items: T[], random: RandomFn) => items[Math.floor(random() * items.length) % items.length];

/**
 * Generates mock players with colors and optional alliance membership.
 */
export const generatePlayers = (count: number, random: RandomFn): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: pick(PLAYER_NAMES, random),
    color: pick(PALETTE, random),
  }));

/**
 * Creates default alliance ranks.
 */
const createAllianceRanks = (): AllianceRank[] => [
  {
    id: 'leader',
    name: 'Leader',
    permissions: { invite: true, remove: true, editNotes: true, managePacts: true },
  },
  {
    id: 'officer',
    name: 'Offizier',
    permissions: { invite: true, remove: true, editNotes: true, managePacts: false },
  },
  {
    id: 'member',
    name: 'Member',
    permissions: { invite: false, remove: false, editNotes: true, managePacts: false },
  },
];

/**
 * Generates mock alliances and assigns players in rough factions.
 */
const generateAlliances = (players: Player[], count: number, random: RandomFn): Alliance[] => {
  const alliances: Alliance[] = [];
  const availablePlayers = [...players];

  for (let index = 0; index < count; index += 1) {
    const [tag, name] = ALLIANCE_NAMES[index % ALLIANCE_NAMES.length];
    const memberCount = 8 + Math.floor(random() * 12);
    const members: string[] = [];
    for (let memberIndex = 0; memberIndex < memberCount; memberIndex += 1) {
      if (availablePlayers.length === 0) {
        break;
      }
      const selectionIndex = Math.floor(random() * availablePlayers.length);
      const [player] = availablePlayers.splice(selectionIndex, 1);
      if (!player) {
        break;
      }
      members.push(player.id);
      player.allianceId = `alliance-${index + 1}`;
    }

    const pactTargets = alliances.length > 0 ? [pick(alliances, random).id] : [];
    const pacts: AlliancePact[] = pactTargets.map((target, pactIndex) => ({
      id: `pact-${index + 1}-${pactIndex + 1}`,
      type: pactIndex % 2 === 0 ? 'ally' : 'nap',
      targetAllianceId: target,
    }));

    alliances.push({
      id: `alliance-${index + 1}`,
      tag,
      name,
      color: pick(PALETTE, random),
      members,
      ranks: createAllianceRanks(),
      pacts,
      notes: ['* Einsatzgebiet: Kernsektor', '* Koordination: tägliche Besprechung 20:00 Uhr'],
    });
  }

  return alliances;
};

/**
 * Generates planets for a given system using players and alliances for ownership.
 */
const generatePlanets = (
  systemId: string,
  slotCount: number,
  random: RandomFn,
  players: Player[],
): GalaxyPlanet[] =>
  Array.from({ length: slotCount }, (_, slotIndex) => {
    const owner = random() > 0.55 ? pick(players, random) : undefined;
    return {
      id: `${systemId}-planet-${slotIndex + 1}`,
      systemId,
      slot: slotIndex + 1,
      name: pick(PLANET_NAMES, random),
      biome: pick(Object.values(PlanetBiome), random),
      ownerId: owner?.id,
      allianceId: owner?.allianceId,
    };
  });

/**
 * Generates a grid of systems sized für 100–500 Spieler Mock-Daten.
 */
export const generateSystems = (
  width: number,
  height: number,
  random: RandomFn,
  players: Player[],
): GalaxySystem[] => {
  const systems: GalaxySystem[] = [];
  const biomeMap = new Map<string, string>();
  const neighborOffsets = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  for (let sectorQ = 0; sectorQ < width; sectorQ += 1) {
    for (let sectorR = 0; sectorR < height; sectorR += 1) {
      const sysIndex = Math.floor(random() * 5);
      const coordinate = createGalaxyCoordinate(sectorQ, sectorR, sysIndex);
      const id = `system-${sectorQ}-${sectorR}-${sysIndex}`;
      const axialKey = `${coordinate.axial.q}:${coordinate.axial.r}`;
      const neighborIds = neighborOffsets
        .map((offset) => biomeMap.get(`${coordinate.axial.q + offset.q}:${coordinate.axial.r + offset.r}`))
        .filter((value): value is string => Boolean(value));

      const features = createSectorFeatures(sectorQ, sectorR, sysIndex);
      const seed =
        (coordinate.axial.q * 73856093) ^
        (coordinate.axial.r * 19349663) ^
        (sysIndex * 83492791) ^
        (sectorQ * 2654435761) ^
        (sectorR * 97531);
      const biome = pickBiomeForSector(features, neighborIds.length ? { ids: neighborIds } : undefined, seed);
      biomeMap.set(axialKey, biome.id);

      systems.push({
        id,
        displayName: `Sektor ${sectorQ}:${sectorR} · ${sysIndex.toString().padStart(2, '0')}`,
        sectorQ,
        sectorR,
        sysIndex,
        axial: coordinate.axial,
        biomeId: biome.id,
        planets: generatePlanets(id, 7, random, players),
      });
    }
  }
  return systems;
};

/**
 * Generates a full universe mock tailored for the Galaxy v3 view.
 */
export const generateUniverse = (seed = 2023, options: UniverseSeedOptions = {}) => {
  const random = createRandom(seed);
  const playerCount = options.playerCount ?? 240;
  const allianceCount = options.allianceCount ?? 18;
  const width = options.systemWidth ?? 55;
  const height = options.systemHeight ?? 55;

  const players = generatePlayers(playerCount, random);
  const alliances = generateAlliances(players, allianceCount, random);
  const systems = generateSystems(width, height, random, players);

  return { systems, players, alliances };
};

const DEFAULT_UNIVERSE = generateUniverse();

/**
 * Exported mock data slices reused by multiple stores and components.
 */
export const SYSTEM_SNAPSHOT = DEFAULT_UNIVERSE.systems;

/**
 * Player directory mock used for the directory store bootstrap.
 */
export const PLAYER_DIRECTORY = DEFAULT_UNIVERSE.players;

/**
 * Alliance directory mock used for the alliance store bootstrap.
 */
export const ALLIANCE_DIRECTORY = DEFAULT_UNIVERSE.alliances;

/**
 * ID of the locally controlled commander für Filtering-Helfer.
 */
export const CURRENT_PLAYER_ID = PLAYER_DIRECTORY[0]?.id ?? 'player-1';
