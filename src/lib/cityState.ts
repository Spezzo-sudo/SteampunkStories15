/**
 * City State Management System
 *
 * Centralizes logic for calculating settlement capacity, building restrictions,
 * and biome-based constraints. Designed to be extended with future mechanics
 * like City Focus, Population, Tech Level, and Age.
 */

import type { SettlementBuilding } from '@/types';
import { SETTLEMENT_BUILDING_CONFIGS, SETTLEMENT_CAPACITY_BY_LEVEL } from '@/constants';
import { BIOMES } from '@/constants/biomes';

/**
 * Complete state snapshot of a settlement/city for validation and UI display.
 */
export interface CityState {
  // === Current State ===
  /** Number of building capacity slots currently in use */
  usedSlots: number;
  /** Maximum building capacity slots available at current settlement level */
  maxSlots: number;
  /** Remaining available slots */
  availableSlots: number;
  /** True if settlement is at or over capacity */
  isOverCapacity: boolean;

  // === Building Restrictions ===
  /** Building types that can be constructed in this biome */
  allowedBuildings: string[];
  /** Building types explicitly banned in this biome */
  bannedBuildings: string[];

  // === Future Extensibility (not yet implemented) ===
  /** Current population (future: affects production and slots) */
  population?: number;
  /** Max population capacity (future: based on biome + buildings) */
  maxPopulation?: number;
  /** City specialization focus (future: affects bonuses and restrictions) */
  cityFocus?: 'industry' | 'research' | 'trade' | 'military' | 'agriculture';
  /** Settlement technology level (future: unlocks advanced buildings) */
  techLevel?: number;
  /** Age in milliseconds since settlement founding (future: unlock time-gated content) */
  age?: number;
  /** Founded timestamp (future: for age calculations) */
  foundedAt?: number;
}

/**
 * Calculate the complete city state for a settlement.
 *
 * @param settlementId - Unique settlement identifier (for future use)
 * @param biomeId - Biome ID from the hex biome system (e.g., 'aether_nebula', 'trade_hub')
 * @param settlementLevel - Current level of the settlement (1-10)
 * @param buildings - Array of existing buildings in this settlement
 * @returns Complete city state with capacity, restrictions, and extensibility hooks
 */
export const getCityState = (
  settlementId: string,
  biomeId: string,
  settlementLevel: number,
  buildings: SettlementBuilding[],
): CityState => {
  // === Calculate Capacity ===
  const maxSlots = SETTLEMENT_CAPACITY_BY_LEVEL[settlementLevel] || SETTLEMENT_CAPACITY_BY_LEVEL[1];

  let usedSlots = 0;
  buildings.forEach((building) => {
    const config = SETTLEMENT_BUILDING_CONFIGS[building.buildingType];
    if (config) {
      usedSlots += building.level * config.sizePerLevel;
    }
  });

  const availableSlots = Math.max(0, maxSlots - usedSlots);
  const isOverCapacity = usedSlots > maxSlots;

  // === Biome-Based Building Restrictions ===
  const biome = BIOMES[biomeId];
  const allowedBuildings = biome?.build?.allowed || [];
  const bannedBuildings = biome?.build?.banned || [];

  // === Return Complete State ===
  return {
    // Current state
    usedSlots,
    maxSlots,
    availableSlots,
    isOverCapacity,

    // Building restrictions
    allowedBuildings,
    bannedBuildings,

    // Future hooks (undefined for now)
    population: undefined,
    maxPopulation: undefined,
    cityFocus: undefined,
    techLevel: undefined,
    age: undefined,
    foundedAt: undefined,
  };
};

/**
 * Check if a specific building type can be constructed in this settlement.
 *
 * @param cityState - Current city state from getCityState()
 * @param buildingType - Building type ID to validate (e.g., 'orichalkumSchmelze')
 * @param targetLevel - Target level to build/upgrade to
 * @returns Object with canBuild flag and array of blocking reasons
 */
export const canBuildInCity = (
  cityState: CityState,
  buildingType: string,
  targetLevel: number,
): { canBuild: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // Check if building type exists
  const config = SETTLEMENT_BUILDING_CONFIGS[buildingType];
  if (!config) {
    return { canBuild: false, reasons: ['Unbekannter Gebäudetyp'] };
  }

  // Check max level
  if (config.maxLevel && targetLevel > config.maxLevel) {
    reasons.push(`Maximales Level erreicht: ${config.maxLevel}`);
  }

  // Check biome restrictions - if allowed list exists, building must be in it
  if (cityState.allowedBuildings.length > 0 && !cityState.allowedBuildings.includes(buildingType)) {
    reasons.push(`Gebäude nicht erlaubt in diesem Biom (${buildingType})`);
  }

  // Check biome bans - if building is explicitly banned
  if (cityState.bannedBuildings.includes(buildingType)) {
    reasons.push(`Gebäude verboten in diesem Biom (${buildingType})`);
  }

  // Future checks can be added here:
  // - City focus requirements
  // - Tech level requirements
  // - Population requirements
  // - Age-gated buildings

  return {
    canBuild: reasons.length === 0,
    reasons,
  };
};

/**
 * Calculate the size increase from upgrading a building.
 * Useful for checking if an upgrade would exceed capacity.
 *
 * @param buildingType - Building type ID
 * @param currentLevel - Current building level (0 if not built yet)
 * @param targetLevel - Target level to upgrade to
 * @returns Size increase in slots
 */
export const calculateSizeIncrease = (
  buildingType: string,
  currentLevel: number,
  targetLevel: number,
): number => {
  const config = SETTLEMENT_BUILDING_CONFIGS[buildingType];
  if (!config) {
    return 0;
  }

  const oldSize = currentLevel * config.sizePerLevel;
  const newSize = targetLevel * config.sizePerLevel;
  return newSize - oldSize;
};
