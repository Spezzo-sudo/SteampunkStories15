// src/lib/combat.ts
// Combat pseudo-code that documents the security-aware formulas for Phase 3/4.

export type CombatShip = {
  id: string;
  hullIntegrity: number; // 0-100
  attack: number;
  defense: number;
  speed: number;
  evasion: number;
  crew: number;
  settlementId: string;
};

export type CombatSnapshot = {
  attackers: CombatShip[];
  defenders: CombatShip[];
  terrainModifier: number; // e.g. 0.9 for fortified tiles, 1.1 for open sea
};

export type CombatOutcome = {
  survivingAttackers: CombatShip[];
  survivingDefenders: CombatShip[];
  attackerVictory: boolean;
  rounds: number;
  battleLog: string[];
};

/**
 * Calculates total attack score while respecting defender buffs and settlement tech.
 * Pseudo-code:
 *   - Sum attack stat of every surviving ship
 *   - Apply formation bonus (e.g. +5% if mixed fleet)
 *   - Apply morale modifier derived from recent victories / leadership tech
 *   - Clamp to avoid unbounded numbers
 */
export function calculateAttackScore(fleet: CombatShip[], morale: number): number {
  const base = fleet.reduce((sum, ship) => sum + ship.attack, 0);
  const formationBonus = fleet.length >= 3 ? 1.05 : 1;
  const moraleBonus = 1 + morale; // morale in [-0.2, 0.3]
  return Math.max(0, base * formationBonus * moraleBonus);
}

/**
 * Hull damage formula (per round):
 *   damage = attackScore * terrainModifier / (defenseScore + defenderCover)
 *   each ship receives proportional damage based on its defense weight
 *   hullIntegrity -= damageShare, clamp at 0
 */
export function applyHullDamage(
  defenders: CombatShip[],
  attackScore: number,
  defenseScore: number,
  terrainModifier: number,
): CombatShip[] {
  const effectiveDamage = (attackScore * terrainModifier) / Math.max(1, defenseScore);
  return defenders.map((ship) => {
    const defenseWeight = ship.defense / Math.max(1, defenseScore);
    const hullLoss = effectiveDamage * (1 - defenseWeight * 0.5);
    const nextHull = Math.max(0, ship.hullIntegrity - hullLoss);
    return { ...ship, hullIntegrity: nextHull };
  });
}

/**
 * Casualty calculation:
 *   - when hullIntegrity drops below thresholds (<=60, <=30, ==0) mark crew losses
 *   - returns surviving ships and cumulative casualties for rewards/plunder
 */
export function calculateCasualties(fleet: CombatShip[]): {
  survivors: CombatShip[];
  casualties: number;
} {
  let casualties = 0;
  const survivors = fleet.filter((ship) => {
    if (ship.hullIntegrity <= 0) {
      casualties += ship.crew;
      return false;
    }
    if (ship.hullIntegrity <= 30) {
      casualties += Math.floor(ship.crew * 0.6);
    } else if (ship.hullIntegrity <= 60) {
      casualties += Math.floor(ship.crew * 0.3);
    }
    return true;
  });
  return { survivors, casualties };
}

/**
 * Victory logic:
 *   - Battle resolves in rounds until one fleet has no survivors or maxRounds reached
 *   - If defenders survive maxRounds, defenders win (stalemate favors owner)
 *   - Ties resolved by remaining hull % or by defender advantage (prevents exploits)
 */
export function resolveCombat(snapshot: CombatSnapshot, maxRounds = 6): CombatOutcome {
  const log: string[] = [];
  let attackers = snapshot.attackers;
  let defenders = snapshot.defenders;

  for (let round = 1; round <= maxRounds; round++) {
    const attackScore = calculateAttackScore(attackers, 0);
    const defenseScore = calculateAttackScore(defenders, 0); // symmetric for brevity

    defenders = applyHullDamage(defenders, attackScore, defenseScore, snapshot.terrainModifier);
    const defenderResult = calculateCasualties(defenders);
    defenders = defenderResult.survivors;

    attackers = applyHullDamage(attackers, defenseScore, attackScore, 1 / snapshot.terrainModifier);
    const attackerResult = calculateCasualties(attackers);
    attackers = attackerResult.survivors;

    log.push(
      `Round ${round}: attackers lost ${attackerResult.casualties} crew, defenders lost ${defenderResult.casualties}`,
    );

    if (!attackers.length || !defenders.length) {
      break;
    }
  }

  const attackerHull = attackers.reduce((sum, ship) => sum + ship.hullIntegrity, 0);
  const defenderHull = defenders.reduce((sum, ship) => sum + ship.hullIntegrity, 0);
  const attackerVictory =
    defenders.length === 0 ||
    (attackers.length > 0 && attackerHull > defenderHull && defenders.length === 0);

  return {
    survivingAttackers: attackers,
    survivingDefenders: defenders,
    attackerVictory,
    rounds: log.length,
    battleLog: log,
  };
}

