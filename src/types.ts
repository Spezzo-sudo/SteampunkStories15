export enum ResourceType {
  Orichalkum = 'Orichalkum',
  Fokuskristalle = 'Fokuskristalle',
  Vitriol = 'Vitriol',
}

export type Resources = Record<ResourceType, number>;
export type Storage = Resources;

/**
 * Requirements for building construction or upgrade.
 */
export interface BuildingRequirement {
  type: 'research' | 'building' | 'energy';
  id: string;
  level?: number;
}

export interface Building {
  id: string;
  name: string;
  description: string;
  image: string;
  baseCost: Resources;
  costMultiplier: number;
  baseProduction: Resources;
  productionMultiplier?: number;
  baseEnergyConsumption?: number;
  energyConsumptionMultiplier?: number;
  baseEnergySupply?: number;
  energySupplyMultiplier?: number;
  maxLevel?: number;
  requires?: BuildingRequirement[];
  unlocks?: UnlockEffect[];
}

/**
 * Configuration for a settlement building type (immutable reference data).
 */
export interface BuildingConfig {
  buildingType: string;
  displayName: string;
  description?: string;
  sizePerLevel: number; // Capacity cost per building level
  maxLevel?: number; // Max level allowed, null = unlimited
  productionType?: 'orichalkum' | 'fokuskristalle' | 'vitriol' | 'energy' | null; // null for storage/utility
}

/**
 * A settlement-specific building instance.
 */
export interface SettlementBuilding {
  id: string;
  settlementId: string;
  buildingType: string;
  level: number;
  createdAt: number;
  lastUpgradedAt?: number;
}

/**
 * A queued building construction/upgrade.
 */
export interface BuildQueueEntry {
  id: string;
  settlementId: string;
  settlementBuildingId?: string;
  buildingType: string;
  targetLevel: number;
  costOrichalkum: number;
  costFokuskristalle: number;
  costVitriol: number;
  startedAt: number;
  durationSeconds: number;
  completedAt?: number;
  status: 'building' | 'completed' | 'cancelled';
}

/**
 * Requirements for research completion.
 */
export interface ResearchRequirement {
  type: 'research' | 'building';
  id: string;
  level?: number;
}

/**
 * Unlock effects from completing research or buildings.
 */
export interface UnlockEffect {
  type: 'building' | 'ship' | 'mission';
  id: string;
}

export interface Research {
  id: string;
  name: string;
  description: string;
  image: string;
  baseCost: Resources;
  costMultiplier: number;
  maxLevel?: number;
  requires?: ResearchRequirement[];
  unlocks?: UnlockEffect[];
}

export interface ShipBlueprint {
  id: string;
  name: string;
  description: string;
  image: string;
  role: 'Aufklärung' | 'Transport' | 'Angriff' | 'Unterstützung' | 'Kolonisation';
  hangarSlots: number;
  baseCost: Resources;
  buildTimeSeconds: number;
  crew: number;
  cargo: number;
  requiredWerftLevel?: number;
  requiredResearch?: Array<{ id: string; level?: number }>;
}

/**
 * Progress state tracked for a queued shipyard order.
 */
export interface ShipBuildOrder {
  id: string;
  blueprintId: string;
  quantity: number;
  costPaid: Resources; // Actual cost paid (with werft bonuses applied)
  startTime: number;
  endTime: number;
  status: 'queued' | 'building' | 'completed' | 'cancelled';
}

export enum View {
  Uebersicht = 'Uebersicht',
  Gebaeude = 'Gebaeude',
  Forschung = 'Forschung',
  Werft = 'Werft',
  Galaxie = 'Galaxie',
  Bande = 'Bande',
  Techtree = 'Techtree',
}

export interface BuildQueueItem {
  entityId: string;
  level: number;
  startTime: number;
  endTime: number;
}

export enum PlanetBiome {
  Messingwueste = 'Messingwueste',
  Aethermoor = 'Aethermoor',
  Dampfarchipel = 'Dampfarchipel',
  Uhrwerksteppe = 'Uhrwerksteppe',
  Glimmerkluft = 'Glimmerkluft',
}

export interface AxialCoordinates {
  q: number;
  r: number;
}

export interface GalaxyCoordinates {
  sectorQ: number;
  sectorR: number;
  sysIndex: number;
  axial: AxialCoordinates;
}

export interface GalaxyPlanet {
  id: string;
  systemId: string;
  slot: number;
  name: string;
  biome: PlanetBiome;
  ownerId?: string;
  allianceId?: string;
}

export interface GalaxySystem extends GalaxyCoordinates {
  id: string;
  displayName: string;
  planets: GalaxyPlanet[];
  biomeId?: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  allianceId?: string;
}

export interface PlayerPlanetSummary {
  planetId: string;
  systemId: string;
  slot: number;
  biome: PlanetBiome;
  coordinates: string;
  isFavorite: boolean;
}

export interface PlayerProfile {
  id: string;
  tagline: string;
  lastActiveAt: number;
  allianceId?: string;
  planets: PlayerPlanetSummary[];
}

export interface AllianceRankPermissions {
  invite: boolean;
  remove: boolean;
  editNotes: boolean;
  managePacts: boolean;
}

export interface AllianceRank {
  id: string;
  name: string;
  permissions: AllianceRankPermissions;
}

export interface AlliancePact {
  id: string;
  type: 'nap' | 'ally';
  targetAllianceId: string;
}

export interface Alliance {
  id: string;
  tag: string;
  name: string;
  color: string;
  members: string[];
  ranks: AllianceRank[];
  pacts: AlliancePact[];
  notes: string[];
}

export interface MessageRoom {
  id: string;
  type: 'alliance' | 'direct';
  title: string;
  participantIds: string[];
}

export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  createdAt: number;
}

/**
 * Supported mission archetypes for fleet actions planned in the galaxy view.
 */
export enum MissionType {
  Angriff = 'attack',
  Transport = 'transport',
  Spionage = 'spy',
  Stationierung = 'station',
  Kolonisierung = 'colonize',
}

/**
 * Lifecycle states that every mission transitions through while progressing over time.
 */
export enum MissionStatus {
  Geplant = 'planned',
  Unterwegs = 'enroute',
  Abgeschlossen = 'completed',
}

/**
 * Descriptor for a mission waypoint, capturing ownership and slot metadata.
 */
export interface MissionLocation {
  systemId: string;
  planetId: string;
  slot: number;
  planetName: string;
  ownerId?: string;
  allianceId?: string;
}

/**
 * Mission entity tracked on the client to simulate travel and resolution of fleet orders.
 */
export interface Mission {
  id: string;
  type: MissionType;
  commanderId: string;
  origin: MissionLocation;
  target: MissionLocation;
  status: MissionStatus;
  plannedAt: number;
  launchAt: number;
  arrivalAt: number;
  travelDuration: number;
}

/**
 * ============================================
 * MILITARY SYSTEM TYPES (Settlement-centric)
 * ============================================
 */

/**
 * Player settlement serving as military operations base.
 * Each settlement has its own fleet, resources, and defenses.
 */
export interface MilitarySettlement {
  id: string;
  playerId: string;
  tileId: string;
  name: string;
  level: number;

  // Local resource storage
  resources: Resources;
  capacities: {
    orichalkum: number;
    fokuskristalle: number;
    vitriol: number;
  };

  // Energy system
  energy: {
    production: number;
    consumption: number;
    current: number;
  };

  // Military
  baseShipIds: string[];
  defenseIds: string[];

  // Timing
  createdAt: number;
  lastHarvestedAt?: number;
}

/**
 * Ship instance assigned to a settlement.
 * Ships can be stationed or deployed in convoys.
 */
export interface Ship {
  id: string;
  playerId: string;
  settlementId: string; // HOME BASE
  blueprintId: string;
  name: string;

  // Status
  status: 'stationed' | 'preparing' | 'en_route' | 'in_combat' | 'damaged' | 'destroyed';
  currentTileId?: string;
  convoyId?: string;

  // Health
  hullIntegrity: number; // 0-100

  // Stats (from blueprint)
  attack: number;
  defense: number;
  speed: number;
  cargoCapacity: number;
  currentCargo: Resources;

  // Timing
  createdAt: number;
  damagedAt?: number;
}

/**
 * Defensive structure on a tile.
 * Structures belong to a settlement and defend against attacks.
 */
export interface Defense {
  id: string;
  settlementId: string;
  tileId: string;
  type: string; // 'tesla_batterie', 'dampfkanone', etc.
  level: number;
  hullIntegrity: number; // 0-100
  createdAt: number;
}

/**
 * Scout report revealing intel about a target tile.
 * Intel level determines how much information is revealed.
 */
export interface ScoutReport {
  id: string;
  playerId: string;
  originSettlementId: string;
  targetTileId: string;
  intelLevel: number; // 1-5
  reportData: {
    owner?: string;
    defenseCount?: number;
    defenseTypes?: string[];
    stationedShipCount?: number;
    stationedShips?: Ship[];
  };
  expiresAt: number;
  createdAt: number;
}

/**
 * Battle record tracking combat outcome.
 * Battles occur when convoys with attack mission arrive at target.
 */
export interface Battle {
  id: string;
  attackerId: string;
  attackerSettlementId: string;
  defenderId: string;
  defenderSettlementId?: string;
  tileId: string;
  convoyId: string;

  status: 'ongoing' | 'attacker_won' | 'defender_won' | 'stalemate';

  forces: {
    attackerShips: Ship[];
    defenderShips: Ship[];
    defenses: Defense[];
  };

  battleReport?: {
    rounds: number;
    attackerCasualites: number;
    defenderCasualites: number;
    plunder: Resources;
    survivors: {
      attacker: Ship[];
      defender: Ship[];
    };
  };

  startedAt: number;
  endedAt?: number;
  createdAt: number;
}

/**
 * Military convoy representing fleet movement or mission.
 * Convoys are created from settlements and execute military operations.
 */
export interface MilitaryConvoy {
  id: string;
  playerId: string;
  originSettlementId: string;
  targetTileId: string;

  shipIds: string[];
  missionType: 'scout' | 'attack' | 'transport' | 'station' | 'colonize';

  status: 'preparing' | 'en_route' | 'arrived' | 'completed' | 'cancelled';

  cargo?: Resources;

  // Timing
  preparationEndsAt: number;
  departureTime?: number;
  arrivalTime?: number;
  endedAt?: number; // When mission was completed or cancelled
  createdAt: number;
}

/**
 * ============================================
 * COMBAT SYSTEM TYPES
 * ============================================
 */

/**
 * Ship snapshot for combat calculations.
 * Captures ship state at the moment battle begins.
 */
export interface CombatShip {
  id: string;
  name: string;
  attack: number;
  defense: number;
  speed: number;
  cargoCapacity: number;
  hullIntegrity: number; // 0-100
  crew: number; // Total crew count
}

/**
 * Casualty breakdown from combat round.
 * Tracks crew losses and ship damage.
 */
export interface CombatLosses {
  shipId: string;
  shipName: string;
  crewLost: number; // Absolute count
  hullDamageTaken: number; // Percentage points lost
  status: 'operational' | 'damaged' | 'destroyed';
}

/**
 * Detailed combat round result.
 * Represents one turn of the battle (6 rounds maximum).
 */
export interface BattleRound {
  roundNumber: number;
  attackerScore: number; // Total attack power before modifiers
  defenderScore: number; // Total defense power
  attackerCasualties: CombatLosses[];
  defenderCasualties: CombatLosses[];
  attackerHullAdvantage: number; // Average hull% - attacker hull% defender hull%
}

/**
 * Comprehensive battle report with all combat details.
 * Generated when attack convoy reaches target tile.
 */
export interface BattleReport {
  id: string;
  battleId: string; // Reference to Battle record
  attackerSettlementId: string;
  defenderSettlementId?: string; // Null if defending stationary defenses only
  tileId: string;

  // Combat flow
  rounds: BattleRound[];
  totalRounds: number; // 1-6 actual rounds fought
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';

  // Final state
  attackerLosses: {
    totalCrewLost: number;
    totalShipsDestroyed: number;
    totalShipsDamaged: number;
    survivors: CombatShip[];
  };
  defenderLosses: {
    totalCrewLost: number;
    totalShipsDestroyed: number;
    totalShipsDamaged: number;
    survivors: CombatShip[];
  };

  // Plunder calculation
  plunderAvailable: Resources;
  plunderTaken: Resources;
  cargoCapacityUsed: number;

  // Timing
  createdAt: number;
}

/**
 * Wiki article for in-game handbook.
 */
export interface WikiArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  searchTags: string[];
  order?: number;
}

/**
 * Wiki data structure for all articles.
 */
export interface WikiData {
  articles: WikiArticle[];
  version: string;
}
