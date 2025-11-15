/**
 * Tech Tree Requirement Validation System
 *
 * Centralized logic for checking if buildings, research, ships, and missions
 * can be constructed/researched/launched based on prerequisites.
 */

import type {
  Building,
  BuildingRequirement,
  Research,
  ResearchRequirement,
  ShipBlueprint,
  MissionType,
} from '@/types';
import { BUILDINGS, RESEARCH, SHIP_BLUEPRINTS } from '@/constants';
import { MISSION_REQUIREMENTS } from '@/constants/missions';

/**
 * Validation result indicating whether action is possible and why not if blocked.
 */
export interface ValidationResult {
  canDo: boolean;
  missing: string[];
  energyBlocked?: boolean;
}

/**
 * Checks if all research prerequisites are met.
 * @param researchId - ID of research to check
 * @param currentResearch - Player's current research levels
 * @param currentBuildings - Player's current building levels
 * @returns Validation result with list of missing requirements
 */
export const canResearch = (
  researchId: string,
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>
): ValidationResult => {
  const research = RESEARCH[researchId as keyof typeof RESEARCH];
  if (!research) {
    return { canDo: false, missing: ['Forschung nicht gefunden'] };
  }

  if (!research.requires || research.requires.length === 0) {
    return { canDo: true, missing: [] };
  }

  const missing: string[] = [];

  for (const req of research.requires) {
    if (req.type === 'research') {
      const researchName = RESEARCH[req.id as keyof typeof RESEARCH]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentResearch[req.id] || 0;

      if (currentLevel < requiredLevel) {
        missing.push(`${researchName} Stufe ${requiredLevel}`);
      }
    } else if (req.type === 'building') {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;

      if (currentLevel < requiredLevel) {
        missing.push(`${buildingName} Level ${requiredLevel}`);
      }
    }
  }

  return {
    canDo: missing.length === 0,
    missing,
  };
};

/**
 * Checks if a building can be built or upgraded.
 * @param buildingId - ID of building
 * @param targetLevel - Target level to build/upgrade to
 * @param currentResearch - Player's current research levels
 * @param currentBuildings - Player's current building levels
 * @param currentEnergy - Current energy capacity and consumption
 * @returns Validation result with energy blocking flag if applicable
 */
export const canBuildOrUpgrade = (
  buildingId: string,
  targetLevel: number,
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>,
  currentEnergy: { capacity: number; consumption: number }
): ValidationResult => {
  const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
  if (!building) {
    return { canDo: false, missing: ['Gebäude nicht gefunden'] };
  }

  // Check max level
  if (building.maxLevel && targetLevel > building.maxLevel) {
    return {
      canDo: false,
      missing: [`Maximales Level: ${building.maxLevel}`],
    };
  }

  // Check prerequisites
  if (!building.requires || building.requires.length === 0) {
    return { canDo: true, missing: [] };
  }

  const missing: string[] = [];
  let energyBlocked = false;

  for (const req of building.requires) {
    if (req.type === 'research') {
      const researchName = RESEARCH[req.id as keyof typeof RESEARCH]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentResearch[req.id] || 0;

      if (currentLevel < requiredLevel) {
        missing.push(`${researchName} Stufe ${requiredLevel}`);
      }
    } else if (req.type === 'building') {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;

      if (currentLevel < requiredLevel) {
        missing.push(`${buildingName} Level ${requiredLevel}`);
      }
    } else if (req.type === 'energy') {
      // Check if building would exceed energy capacity
      const energyConsumption = building.baseEnergyConsumption || 0;
      const wouldExceed =
        currentEnergy.consumption + energyConsumption > currentEnergy.capacity;

      if (wouldExceed) {
        energyBlocked = true;
        missing.push('Nicht genug Energiekapazität');
      }
    }
  }

  return {
    canDo: missing.length === 0,
    missing,
    energyBlocked,
  };
};

/**
 * Checks if a ship can be built.
 * @param shipId - ID of ship blueprint
 * @param werftLevel - Current werft building level
 * @param currentResearch - Player's current research levels
 * @returns Validation result
 */
export const canBuildShip = (
  shipId: string,
  werftLevel: number,
  currentResearch: Record<string, number>
): ValidationResult => {
  const ship = SHIP_BLUEPRINTS[shipId as keyof typeof SHIP_BLUEPRINTS];
  if (!ship) {
    return { canDo: false, missing: ['Schiff nicht gefunden'] };
  }

  const missing: string[] = [];

  // Check werft level requirement
  const requiredWerftLevel = ship.requiredWerftLevel || 0;
  if (werftLevel < requiredWerftLevel) {
    missing.push(`Werft Level ${requiredWerftLevel}`);
  }

  // Check research requirements
  if (ship.requiredResearch && ship.requiredResearch.length > 0) {
    for (const researchId of ship.requiredResearch) {
      const research = RESEARCH[researchId as keyof typeof RESEARCH];
      if (!research) continue;

      const requiredLevel = 1;
      const currentLevel = currentResearch[researchId] || 0;

      if (currentLevel < requiredLevel) {
        missing.push(`${research.name}`);
      }
    }
  }

  return {
    canDo: missing.length === 0,
    missing,
  };
};

/**
 * Checks if a mission can be launched.
 * @param missionType - Type of mission
 * @param currentBuildings - Player's current building levels
 * @param currentResearch - Player's current research levels
 * @returns Validation result
 */
export const canLaunchMission = (
  missionType: MissionType,
  currentBuildings: Record<string, number>,
  currentResearch: Record<string, number>
): ValidationResult => {
  const requirements = MISSION_REQUIREMENTS[missionType];
  if (!requirements) {
    return { canDo: false, missing: ['Missiontyp nicht bekannt'] };
  }

  const missing: string[] = [];

  // Check building requirements
  if (requirements.buildings && requirements.buildings.length > 0) {
    for (const buildingId of requirements.buildings) {
      const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
      if (!building) continue;

      const currentLevel = currentBuildings[buildingId] || 0;
      if (currentLevel < 1) {
        missing.push(building.name);
      }
    }
  }

  // Check research requirements
  if (requirements.research && requirements.research.length > 0) {
    for (const researchId of requirements.research) {
      const research = RESEARCH[researchId as keyof typeof RESEARCH];
      if (!research) continue;

      const currentLevel = currentResearch[researchId] || 0;
      if (currentLevel < 1) {
        missing.push(research.name);
      }
    }
  }

  // Check werft level if required
  if (requirements.minWerftLevel) {
    const werftLevel = currentBuildings['werft'] || 0;
    if (werftLevel < requirements.minWerftLevel) {
      missing.push(`Werft Level ${requirements.minWerftLevel}`);
    }
  }

  return {
    canDo: missing.length === 0,
    missing,
  };
};

/**
 * Formats a list of missing requirements into a human-readable error message.
 * @param missing - Array of missing requirement names
 * @returns Formatted error message
 */
export const formatRequirementError = (missing: string[]): string => {
  if (missing.length === 0) {
    return 'Unbekannter Fehler';
  }

  if (missing.length === 1) {
    return `Benötigt: ${missing[0]}`;
  }

  return `Benötigt: ${missing.join(', ')}`;
};

/**
 * Gets all buildings that are unlocked by completing a research.
 * @param researchId - ID of research
 * @returns Array of building IDs that are unlocked
 */
export const getUnlockedBuildings = (researchId: string): string[] => {
  const research = RESEARCH[researchId as keyof typeof RESEARCH];
  if (!research || !research.unlocks) {
    return [];
  }

  return research.unlocks
    .filter((unlock) => unlock.type === 'building')
    .map((unlock) => unlock.id);
};

/**
 * Gets all ships that are unlocked by completing a research.
 * @param researchId - ID of research
 * @returns Array of ship IDs that are unlocked
 */
export const getUnlockedShips = (researchId: string): string[] => {
  const research = RESEARCH[researchId as keyof typeof RESEARCH];
  if (!research || !research.unlocks) {
    return [];
  }

  return research.unlocks
    .filter((unlock) => unlock.type === 'ship')
    .map((unlock) => unlock.id);
};

/**
 * Gets all missions that are unlocked by completing a research.
 * @param researchId - ID of research
 * @returns Array of mission types that are unlocked
 */
export const getUnlockedMissions = (researchId: string): MissionType[] => {
  const research = RESEARCH[researchId as keyof typeof RESEARCH];
  if (!research || !research.unlocks) {
    return [];
  }

  return research.unlocks
    .filter((unlock) => unlock.type === 'mission')
    .map((unlock) => unlock.id as MissionType);
};

/**
 * Checks if a building requirement is currently met.
 * @param requirement - Building requirement to check
 * @param research - Player's research levels
 * @param buildings - Player's building levels
 * @returns true if requirement is met
 */
export const isBuildingRequirementMet = (
  requirement: BuildingRequirement,
  research: Record<string, number>,
  buildings: Record<string, number>
): boolean => {
  if (requirement.type === 'research') {
    const level = research[requirement.id] || 0;
    return level >= (requirement.level || 1);
  } else if (requirement.type === 'building') {
    const level = buildings[requirement.id] || 0;
    return level >= (requirement.level || 1);
  }
  return false;
};

/**
 * Checks if a research requirement is currently met.
 * @param requirement - Research requirement to check
 * @param research - Player's research levels
 * @param buildings - Player's building levels
 * @returns true if requirement is met
 */
export const isResearchRequirementMet = (
  requirement: ResearchRequirement,
  research: Record<string, number>,
  buildings: Record<string, number>
): boolean => {
  if (requirement.type === 'research') {
    const level = research[requirement.id] || 0;
    return level >= (requirement.level || 1);
  } else if (requirement.type === 'building') {
    const level = buildings[requirement.id] || 0;
    return level >= (requirement.level || 1);
  }
  return false;
};
