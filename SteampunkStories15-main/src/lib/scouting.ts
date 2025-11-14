import type { Ship, ScoutReport } from '@/types';

/**
 * Scouting System Logic
 *
 * Determines intel quality based on scout ship stats.
 * Intel Levels (1-5):
 * - Level 1: Tile owner only
 * - Level 2: Defenses count
 * - Level 3: Defense types and levels
 * - Level 4: Stationed fleet count
 * - Level 5: Full fleet composition
 */

const INTEL_LEVEL_THRESHOLDS = {
  1: 0,      // Any ship (minimum intel)
  2: 5,      // Average stat sum >= 5
  3: 15,     // Average stat sum >= 15
  4: 30,     // Average stat sum >= 30
  5: 50,     // Average stat sum >= 50 (maximum detail)
} as const;

const SCOUT_DETECTION_CHANCE = {
  1: 0.9,    // 90% chance to detect level 1 scouts
  2: 0.75,   // 75% chance to detect level 2
  3: 0.5,    // 50% chance to detect level 3
  4: 0.2,    // 20% chance to detect level 4
  5: 0.05,   // 5% chance to detect level 5 (advanced stealth)
} as const;

/**
 * Calculate intel level based on scout ship quality.
 *
 * Better ships (higher attack/defense/speed) gather more detailed intel.
 * Multiple scout ships can boost intel level.
 */
export const calculateIntelLevel = (scoutShips: Ship[]): number => {
  if (scoutShips.length === 0) {
    return 1; // Minimum intel level
  }

  // Calculate average stat quality
  const totalStats = scoutShips.reduce((sum, ship) => {
    return sum + ship.attack + ship.defense + ship.speed;
  }, 0);

  const avgStats = totalStats / (scoutShips.length * 3);

  // Bonus for multiple scouts
  const scoutBonus = Math.min(scoutShips.length * 5, 20);

  const finalStat = avgStats + scoutBonus;

  // Determine intel level
  if (finalStat >= INTEL_LEVEL_THRESHOLDS[5]) return 5;
  if (finalStat >= INTEL_LEVEL_THRESHOLDS[4]) return 4;
  if (finalStat >= INTEL_LEVEL_THRESHOLDS[3]) return 3;
  if (finalStat >= INTEL_LEVEL_THRESHOLDS[2]) return 2;
  return 1;
};

/**
 * Check if scout mission is detected by defender.
 *
 * Better defended tiles have better detection chance.
 * Higher intel levels are stealthier.
 */
export const checkScoutDetection = (
  intelLevel: number,
  defenseLevel: number = 1
): boolean => {
  const detectionChance = SCOUT_DETECTION_CHANCE[intelLevel as keyof typeof SCOUT_DETECTION_CHANCE];
  const defenseMultiplier = 1 + defenseLevel * 0.1;
  const adjustedChance = detectionChance * defenseMultiplier;

  return Math.random() < adjustedChance;
};

/**
 * Generate scout report data based on intel level.
 *
 * Progressively reveals more information based on intel level.
 */
export const generateScoutReportData = (
  tileInfo: {
    owner?: string;
    defenses?: { type: string; level: number }[];
    stationedShips?: Ship[];
  },
  intelLevel: number
): ScoutReport['reportData'] => {
  const reportData: ScoutReport['reportData'] = {};

  // Level 1: Basic ownership
  if (intelLevel >= 1) {
    reportData.owner = tileInfo.owner;
  }

  // Level 2: Defense count only
  if (intelLevel >= 2) {
    reportData.defenseCount = tileInfo.defenses?.length || 0;
  }

  // Level 3: Defense types and levels
  if (intelLevel >= 3) {
    reportData.defenseTypes = tileInfo.defenses?.map((d) => `${d.type} Lv${d.level}`) || [];
  }

  // Level 4: Stationed fleet count
  if (intelLevel >= 4) {
    reportData.stationedShipCount = tileInfo.stationedShips?.length || 0;
  }

  // Level 5: Full ship composition
  if (intelLevel >= 5) {
    reportData.stationedShips = tileInfo.stationedShips?.map((ship) => ({
      ...ship,
      // Include combat-relevant stats
    })) || [];
  }

  return reportData;
};

/**
 * Create a formatted scout report message for UI display.
 *
 * Shows what was discovered at each intel level.
 */
export const createScoutReportMessage = (report: ScoutReport): string => {
  const parts: string[] = [];

  parts.push(`📊 Scout Report - Intel Level ${report.intelLevel}/5`);
  parts.push(`🎯 Target: Tile ${report.targetTileId}`);

  if (report.reportData.owner) {
    parts.push(`👑 Owner: ${report.reportData.owner}`);
  } else {
    parts.push(`👑 Owner: Unbekannt`);
  }

  if (report.intelLevel >= 2 && report.reportData.defenseCount !== undefined) {
    parts.push(`🛡️ Defenses: ${report.reportData.defenseCount} Strukturen`);
  }

  if (report.intelLevel >= 3 && report.reportData.defenseTypes && report.reportData.defenseTypes.length > 0) {
    parts.push(`  - ${report.reportData.defenseTypes.join(', ')}`);
  }

  if (report.intelLevel >= 4 && report.reportData.stationedShipCount !== undefined) {
    parts.push(`⚓ Stationed Fleet: ${report.reportData.stationedShipCount} Schiffe`);
  }

  if (report.intelLevel >= 5 && report.reportData.stationedShips && report.reportData.stationedShips.length > 0) {
    parts.push(`📋 Fleet Composition:`);
    report.reportData.stationedShips.forEach((ship) => {
      parts.push(`  - ${ship.name} (Hülle ${ship.hullIntegrity}%)`);
    });
  }

  const expiryDate = new Date(report.expiresAt);
  parts.push(`⏱️ Expires: ${expiryDate.toLocaleString()}`);

  return parts.join('\n');
};

/**
 * Calculate scout mission travel time based on distance and fleet speed.
 *
 * Travel time = distance / avgSpeed (in game ticks/seconds)
 */
export const calculateScoutTravelTime = (
  distanceHexes: number,
  scoutShips: Ship[]
): number => {
  if (scoutShips.length === 0) {
    return Number.POSITIVE_INFINITY; // Can't travel without scouts
  }

  // Speed is bottleneck - slowest ship determines fleet speed
  const avgSpeed = scoutShips.reduce((sum, ship) => sum + ship.speed, 0) / scoutShips.length;

  // 1 hex = ~10 seconds per speed point
  // So distance=5 hexes with avgSpeed=5 = 50 seconds
  const travelTimeSeconds = (distanceHexes * 10) / Math.max(avgSpeed, 1);

  return travelTimeSeconds;
};

/**
 * Validate scout mission before launch.
 *
 * Checks if scout is allowed and has required ships.
 */
export const validateScoutMission = (options: {
  scoutShips: Ship[];
  targetTileOwner?: string;
  attackerPlayerId: string;
}): { valid: boolean; reason?: string } => {
  if (options.scoutShips.length === 0) {
    return { valid: false, reason: 'Keine Scout-Schiffe ausgewählt' };
  }

  // Can't scout own tiles
  if (options.targetTileOwner === options.attackerPlayerId) {
    return { valid: false, reason: 'Kann nicht eigene Tiles auskundschaften' };
  }

  // Check ship status
  const allStationed = options.scoutShips.every((ship) => ship.status === 'stationed');
  if (!allStationed) {
    return { valid: false, reason: 'Alle Scout-Schiffe müssen stationiert sein' };
  }

  return { valid: true };
};
