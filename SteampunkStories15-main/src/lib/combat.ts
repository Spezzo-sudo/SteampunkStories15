/**
 * Combat System Library
 *
 * Provides mechanics for:
 * - Attack score calculation with formation and morale bonuses
 * - Hull damage application based on attack vs defense
 * - Crew casualty calculation based on hull integrity
 * - 6-round combat resolution
 * - Battle report generation with detailed outcomes
 * - Plunder calculation based on victory
 */

import type {
  CombatShip,
  CombatLosses,
  BattleRound,
  BattleReport,
  Ship,
  Resources,
  Defense,
} from '@/types';

/**
 * Calculate attack score for a fleet.
 *
 * Formula: sum(attack stats) × formation_bonus × morale_multiplier
 *
 * Formation Bonus: ≥3 ships = 1.15x (coordination bonus)
 * Morale Multiplier: (average_hull + 100) / 150
 *   - At 100% hull avg: 1.33x multiplier
 *   - At 50% hull avg: 1.0x multiplier
 *   - At 0% hull avg: 0.67x multiplier
 */
export const calculateAttackScore = (ships: CombatShip[]): number => {
  if (ships.length === 0) return 0;

  // Base attack from all ships
  const baseAttack = ships.reduce((sum, ship) => sum + ship.attack, 0);

  // Formation bonus for coordinated strike (3+ ships)
  const formationBonus = ships.length >= 3 ? 1.15 : 1.0;

  // Morale multiplier based on average hull integrity
  const avgHull = ships.reduce((sum, ship) => sum + ship.hullIntegrity, 0) / ships.length;
  const moraleMultiplier = (avgHull + 100) / 150;

  return baseAttack * formationBonus * moraleMultiplier;
};

/**
 * Calculate defense score for a fleet (with optional defenses).
 *
 * Defenses are treated as having attack stat = level × 10.
 * Defense is also multiplied by morale factor.
 */
export const calculateDefenseScore = (
  ships: CombatShip[],
  defenses: (Defense & { level: number })[] = []
): number => {
  if (ships.length === 0 && defenses.length === 0) return 1; // Min 1 to avoid division issues

  // Ship-based defense
  const shipDefense = ships.reduce((sum, ship) => sum + ship.defense, 0);

  // Defense structure contribution (level × 10 each)
  const defenseStructures = defenses.reduce((sum, def) => sum + def.level * 10, 0);

  const totalDefense = shipDefense + defenseStructures;

  // Morale multiplier for defenders (lower morale for defenders usually)
  const allShips = ships;
  const avgHull = allShips.length > 0 ? allShips.reduce((sum, ship) => sum + ship.hullIntegrity, 0) / allShips.length : 50;
  const moraleMultiplier = (avgHull + 100) / 150;

  return totalDefense * moraleMultiplier;
};

/**
 * Apply hull damage to a ship.
 *
 * Returns updated ship with adjusted hullIntegrity.
 * Hull cannot go below 0 or above 100.
 */
export const applyHullDamage = (ship: CombatShip, damagePercentage: number): CombatShip => {
  return {
    ...ship,
    hullIntegrity: Math.max(0, Math.min(100, ship.hullIntegrity - damagePercentage)),
  };
};

/**
 * Calculate crew casualties based on hull damage.
 *
 * Casualty thresholds:
 * - Hull > 60%: No casualties
 * - Hull 30-60%: 30% crew lost
 * - Hull < 30%: 60% crew lost
 * - Hull ≤ 0%: 100% crew lost (ship destroyed)
 */
export const calculateCrewCasualties = (ship: CombatShip, newHull: number, originalCrewCount: number): number => {
  if (newHull > 60) return 0; // No casualties at high hull
  if (newHull > 30) return Math.floor(originalCrewCount * 0.3); // Moderate casualties
  if (newHull > 0) return Math.floor(originalCrewCount * 0.6); // Heavy casualties
  return originalCrewCount; // Total loss if destroyed
};

/**
 * Resolve a single round of combat.
 *
 * Both sides attack simultaneously.
 * Damage is distributed across defending ships.
 */
export const resolveCombatRound = (
  round: number,
  attackers: CombatShip[],
  defenders: CombatShip[],
  terrainModifier: number = 1.0
): BattleRound => {
  const attackScore = calculateAttackScore(attackers);
  const defenseScore = calculateDefenseScore(defenders);

  // Calculate damage per defender
  const damagePerDefender = defenders.length > 0 ? (attackScore * terrainModifier) / defenders.length : 0;

  // Apply damage and calculate casualties
  const defenderCasualties: CombatLosses[] = defenders.map((ship) => {
    const newHull = ship.hullIntegrity - damagePerDefender;
    const crewLost = calculateCrewCasualties(ship, newHull, ship.crew);
    const status = newHull <= 0 ? 'destroyed' : newHull < 30 ? 'damaged' : 'operational';

    return {
      shipId: ship.id,
      shipName: ship.name,
      crewLost,
      hullDamageTaken: damagePerDefender,
      status,
    };
  });

  // Counter-attack: defenders shoot back
  const counterAttackScore = calculateAttackScore(defenders);
  const counterDamagePerAttacker = attackers.length > 0 ? counterAttackScore / attackers.length : 0;

  const attackerCasualties: CombatLosses[] = attackers.map((ship) => {
    const newHull = ship.hullIntegrity - counterDamagePerAttacker;
    const crewLost = calculateCrewCasualties(ship, newHull, ship.crew);
    const status = newHull <= 0 ? 'destroyed' : newHull < 30 ? 'damaged' : 'operational';

    return {
      shipId: ship.id,
      shipName: ship.name,
      crewLost,
      hullDamageTaken: counterDamagePerAttacker,
      status,
    };
  });

  // Calculate hull advantage for attacker
  const attackerAvgHull = attackers.reduce((sum, ship) => sum + ship.hullIntegrity, 0) / attackers.length;
  const defenderAvgHull = defenders.reduce((sum, ship) => sum + ship.hullIntegrity, 0) / defenders.length;
  const attackerHullAdvantage = attackerAvgHull - defenderAvgHull;

  return {
    roundNumber: round,
    attackerScore: attackScore,
    defenderScore: defenseScore,
    attackerCasualties,
    defenderCasualties,
    attackerHullAdvantage,
  };
};

/**
 * Determine combat victory condition.
 *
 * Attacker wins if:
 * - All defenders destroyed, OR
 * - Attacker average hull > defender average hull after 6 rounds
 *
 * Defender wins if:
 * - All attackers destroyed, OR
 * - Defender average hull ≥ attacker average hull after 6 rounds
 */
export const determineCombatVictory = (
  rounds: BattleRound[]
): 'attacker_victory' | 'defender_victory' | 'stalemate' => {
  const lastRound = rounds[rounds.length - 1];
  if (!lastRound) return 'stalemate';

  // Check if anyone is eliminated
  const allDefendersDestroyed = lastRound.defenderCasualties.every((c) => c.status === 'destroyed');
  const allAttackersDestroyed = lastRound.attackerCasualties.every((c) => c.status === 'destroyed');

  if (allDefendersDestroyed) return 'attacker_victory';
  if (allAttackersDestroyed) return 'defender_victory';

  // Check hull advantage (attacker must be strictly better)
  if (lastRound.attackerHullAdvantage > 0) return 'attacker_victory';
  if (lastRound.attackerHullAdvantage < 0) return 'defender_victory';

  return 'stalemate';
};

/**
 * Apply accumulated damage from all rounds to create final ship states.
 */
export const applyAccumulatedDamage = (
  initialShips: CombatShip[],
  casualties: CombatLosses[]
): CombatShip[] => {
  return initialShips
    .map((ship) => {
      const casualty = casualties.find((c) => c.shipId === ship.id);
      if (!casualty) return ship;
      return applyHullDamage(ship, casualty.hullDamageTaken);
    })
    .filter((ship) => ship.hullIntegrity > 0); // Remove destroyed ships
};

/**
 * Calculate plunder from victory.
 *
 * Formula: min(defender_resources × 0.25, attacker_cargo_capacity) × efficiency_multiplier
 *
 * Efficiency ranges 0.5-1.0 based on damage taken:
 * - < 30% damage = 1.0x (perfect raid)
 * - 30-60% damage = 0.75x (moderate losses)
 * - > 60% damage = 0.5x (pyrrhic victory)
 */
export const calculatePlunder = (
  attackerShips: CombatShip[],
  defenderResources: Resources,
  rounds: BattleRound[]
): { plunderMax: Resources; efficiency: number } => {
  // Calculate attacker efficiency based on damage
  const totalDamageTaken = rounds
    .flatMap((r) => r.attackerCasualties)
    .reduce((sum, c) => sum + c.hullDamageTaken, 0);
  const avgDamageTaken = totalDamageTaken / rounds.length / attackerShips.length;

  let efficiency = 1.0;
  if (avgDamageTaken > 60) efficiency = 0.5;
  else if (avgDamageTaken > 30) efficiency = 0.75;

  // Get total cargo capacity
  const totalCargo = attackerShips.reduce((sum, ship) => sum + ship.cargoCapacity, 0);

  // Calculate 25% of defender resources (capped by cargo)
  const maxPlunder = Object.entries(defenderResources).reduce((plunder, [resource, amount]) => {
    const plunderAmount = Math.min(Math.floor(amount * 0.25), totalCargo);
    plunder[resource as keyof Resources] = plunderAmount;
    return plunder;
  }, {} as Resources);

  return {
    plunderMax: maxPlunder,
    efficiency,
  };
};

/**
 * Simulate a complete battle from start to finish.
 *
 * - Fights up to 6 rounds
 * - Stops early if one side is completely eliminated
 * - Applies terrain modifier to attacker damage
 * - Generates comprehensive battle report
 */
export const resolveCombat = (
  attackerShips: CombatShip[],
  defenderShips: CombatShip[],
  terrainModifier: number = 1.0,
  defenses: (Defense & { level: number })[] = []
): {
  rounds: BattleRound[];
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
  attackerSurvivors: CombatShip[];
  defenderSurvivors: CombatShip[];
} => {
  const rounds: BattleRound[] = [];
  let currentAttackers = [...attackerShips];
  let currentDefenders = [...defenderShips];

  // Fight up to 6 rounds
  for (let i = 1; i <= 6; i++) {
    // Check if either side is eliminated
    if (currentAttackers.length === 0 || currentDefenders.length === 0) break;

    // Resolve round
    const round = resolveCombatRound(i, currentAttackers, currentDefenders, terrainModifier);
    rounds.push(round);

    // Apply damage
    const attackerDamage = round.attackerCasualties;
    const defenderDamage = round.defenderCasualties;

    currentAttackers = currentAttackers
      .map((ship) => {
        const damage = attackerDamage.find((d) => d.shipId === ship.id);
        if (!damage) return ship;
        return applyHullDamage(ship, damage.hullDamageTaken);
      })
      .filter((ship) => ship.hullIntegrity > 0);

    currentDefenders = currentDefenders
      .map((ship) => {
        const damage = defenderDamage.find((d) => d.shipId === ship.id);
        if (!damage) return ship;
        return applyHullDamage(ship, damage.hullDamageTaken);
      })
      .filter((ship) => ship.hullIntegrity > 0);
  }

  const outcome = determineCombatVictory(rounds);

  return {
    rounds,
    outcome,
    attackerSurvivors: currentAttackers,
    defenderSurvivors: currentDefenders,
  };
};

/**
 * Convert Ship objects to CombatShip snapshots.
 *
 * CombatShip is immutable and used for all combat calculations.
 * Note: Crew count should come from Ship object if available, otherwise falls back to blueprint default.
 */
export const shipToCombatShip = (ship: Ship & { crew?: number }, crewCount?: number): CombatShip => {
  // Priority: explicit crewCount param > ship.crew property > default fallback
  const finalCrewCount = crewCount ?? ship.crew ?? 10;

  return {
    id: ship.id,
    name: ship.name,
    attack: ship.attack,
    defense: ship.defense,
    speed: ship.speed,
    cargoCapacity: ship.cargoCapacity,
    hullIntegrity: ship.hullIntegrity,
    crew: finalCrewCount,
  };
};

/**
 * Format a combat report for display/logging.
 *
 * Returns human-readable summary of combat progression.
 */
export const formatCombatReport = (battleReport: BattleReport): string => {
  const lines: string[] = [];

  lines.push(`🎖️ Battle Report: ${battleReport.outcome}`);
  lines.push(`Rounds fought: ${battleReport.totalRounds}`);
  lines.push('');

  lines.push('Attacker Losses:');
  lines.push(`  Ships Destroyed: ${battleReport.attackerLosses.totalShipsDestroyed}`);
  lines.push(`  Crew Lost: ${battleReport.attackerLosses.totalCrewLost}`);
  lines.push(`  Survivors: ${battleReport.attackerLosses.survivors.length}`);
  lines.push('');

  lines.push('Defender Losses:');
  lines.push(`  Ships Destroyed: ${battleReport.defenderLosses.totalShipsDestroyed}`);
  lines.push(`  Crew Lost: ${battleReport.defenderLosses.totalCrewLost}`);
  lines.push(`  Survivors: ${battleReport.defenderLosses.survivors.length}`);
  lines.push('');

  if (battleReport.outcome === 'attacker_victory') {
    lines.push('💰 Plunder:');
    lines.push(`  Available: ${JSON.stringify(battleReport.plunderAvailable)}`);
    lines.push(`  Taken: ${JSON.stringify(battleReport.plunderTaken)}`);
  }

  return lines.join('\n');
};
