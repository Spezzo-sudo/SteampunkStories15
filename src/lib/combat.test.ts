import { describe, it, expect, beforeEach } from 'vitest';
import type { CombatShip, BattleRound, Resources } from '@/types';
import {
  calculateAttackScore,
  calculateDefenseScore,
  resolveCombatRound,
  determineCombatVictory,
  calculatePlunder,
  shipToCombatShip,
  resolveCombat,
} from './combat';

/**
 * Mock CombatShip for testing
 */
const createMockShip = (overrides?: Partial<CombatShip>): CombatShip => ({
  id: `ship-${Math.random()}`,
  name: 'Test Ship',
  attack: 10,
  defense: 5,
  speed: 8,
  cargoCapacity: 100,
  hullIntegrity: 100,
  crew: 10,
  ...overrides,
});

describe('Combat System', () => {
  // ============ calculateAttackScore Tests ============

  describe('calculateAttackScore', () => {
    it('should return 0 for empty fleet', () => {
      const score = calculateAttackScore([]);
      expect(score).toBe(0);
    });

    it('should calculate base attack for single ship', () => {
      const ships = [createMockShip({ attack: 20, hullIntegrity: 100 })];
      const score = calculateAttackScore(ships);
      // Base: 20, Formation: 1.0 (< 3 ships), Morale: (100+100)/150 = 1.33
      // Expected: 20 * 1.0 * 1.33 = 26.6
      expect(score).toBeCloseTo(26.67, 1);
    });

    it('should apply formation bonus for 3+ ships', () => {
      const ships = [
        createMockShip({ attack: 10, hullIntegrity: 100 }),
        createMockShip({ attack: 10, hullIntegrity: 100 }),
        createMockShip({ attack: 10, hullIntegrity: 100 }),
      ];
      const score = calculateAttackScore(ships);
      // Base: 30, Formation: 1.15 (>= 3 ships), Morale: (100+100)/150 = 1.333...
      // Expected: 30 * 1.15 * 1.333 = 46
      expect(score).toBeCloseTo(46, 0);
    });

    it('should apply morale multiplier based on hull integrity', () => {
      const ships = [createMockShip({ attack: 100, hullIntegrity: 50 })];
      const score = calculateAttackScore(ships);
      // Base: 100, Formation: 1.0, Morale: (50+100)/150 = 1.0
      // Expected: 100 * 1.0 * 1.0 = 100
      expect(score).toBe(100);
    });

    it('should handle damaged ships with low morale', () => {
      const ships = [createMockShip({ attack: 100, hullIntegrity: 0 })];
      const score = calculateAttackScore(ships);
      // Base: 100, Formation: 1.0, Morale: (0+100)/150 = 0.67
      // Expected: 100 * 1.0 * 0.67 = 67
      expect(score).toBeCloseTo(66.67, 0);
    });
  });

  // ============ calculateDefenseScore Tests ============

  describe('calculateDefenseScore', () => {
    it('should return 1 for empty defenses', () => {
      const score = calculateDefenseScore([], []);
      expect(score).toBe(1);
    });

    it('should calculate ship defense', () => {
      const ships = [createMockShip({ defense: 15, hullIntegrity: 100 })];
      const score = calculateDefenseScore(ships, []);
      // Base: 15, Morale: 1.33
      // Expected: 15 * 1.33 = 20
      expect(score).toBeCloseTo(20, 0);
    });

    it('should include defense structure contributions', () => {
      const ships = [createMockShip({ defense: 10, hullIntegrity: 100 })];
      const defenses = [{ id: 'def-1', level: 2 }] as any[];
      const score = calculateDefenseScore(ships, defenses);
      // Base: 10 + (2 * 10) = 30, Morale: 1.33
      // Expected: 30 * 1.33 = 40
      expect(score).toBeCloseTo(40, 0);
    });

    it('should apply morale multiplier to defenses', () => {
      const ships = [createMockShip({ defense: 50, hullIntegrity: 0 })];
      const score = calculateDefenseScore(ships, []);
      // Base: 50, Morale: 0.67
      // Expected: 50 * 0.67 = 33.5
      expect(score).toBeCloseTo(33.5, 0);
    });
  });

  // ============ resolveCombatRound Tests ============

  describe('resolveCombatRound', () => {
    it('should resolve a single round of combat', () => {
      const attackers = [createMockShip({ attack: 20, hullIntegrity: 100 })];
      const defenders = [createMockShip({ defense: 10, hullIntegrity: 100 })];

      const round = resolveCombatRound(1, attackers, defenders, 1.0);

      expect(round.roundNumber).toBe(1);
      expect(round.attackerCasualties).toHaveLength(1);
      expect(round.defenderCasualties).toHaveLength(1);
      expect(round.attackerScore).toBeGreaterThan(0);
      expect(round.defenderScore).toBeGreaterThan(0);
    });

    it('should apply terrain modifier to damage', () => {
      const attackers = [createMockShip({ attack: 100, hullIntegrity: 100 })];
      const defenders = [createMockShip({ defense: 0, hullIntegrity: 100 })];

      const roundNormal = resolveCombatRound(1, attackers, defenders, 1.0);
      const roundTerrain = resolveCombatRound(1, attackers, defenders, 2.0);

      const dmgNormal = roundNormal.defenderCasualties[0].hullDamageTaken;
      const dmgTerrain = roundTerrain.defenderCasualties[0].hullDamageTaken;

      expect(dmgTerrain).toBeCloseTo(dmgNormal * 2, 0);
    });

    it('should distribute damage evenly across defenders', () => {
      const attackers = [createMockShip({ attack: 100, hullIntegrity: 100 })];
      const defenders = [
        createMockShip({ defense: 0, hullIntegrity: 100 }),
        createMockShip({ defense: 0, hullIntegrity: 100 }),
      ];

      const round = resolveCombatRound(1, attackers, defenders, 1.0);

      const dmg1 = round.defenderCasualties[0].hullDamageTaken;
      const dmg2 = round.defenderCasualties[1].hullDamageTaken;

      expect(dmg1).toBeCloseTo(dmg2, 1);
    });

    it('should apply counter-attack damage to attackers', () => {
      const attackers = [createMockShip({ attack: 10, defense: 0, hullIntegrity: 100 })];
      const defenders = [createMockShip({ attack: 20, defense: 0, hullIntegrity: 100 })];

      const round = resolveCombatRound(1, attackers, defenders, 1.0);

      expect(round.attackerCasualties[0].hullDamageTaken).toBeGreaterThan(0);
    });

    it('should calculate hull advantage correctly', () => {
      const attackers = [
        createMockShip({ hullIntegrity: 100 }),
        createMockShip({ hullIntegrity: 100 }),
      ];
      const defenders = [createMockShip({ hullIntegrity: 50 })];

      const round = resolveCombatRound(1, attackers, defenders, 1.0);

      // Attacker avg: 100, Defender avg: 50, Advantage: 50
      expect(round.attackerHullAdvantage).toBeCloseTo(50, 0);
    });
  });

  // ============ determineCombatVictory Tests ============

  describe('determineCombatVictory', () => {
    it('should return attacker victory when all defenders destroyed', () => {
      const rounds: BattleRound[] = [
        {
          roundNumber: 1,
          attackerScore: 100,
          defenderScore: 10,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 0, hullDamageTaken: 0, status: 'operational' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 10, hullDamageTaken: 100, status: 'destroyed' }],
          attackerHullAdvantage: 50,
        },
      ];

      const outcome = determineCombatVictory(rounds);
      expect(outcome).toBe('attacker_victory');
    });

    it('should return defender victory when all attackers destroyed', () => {
      const rounds: BattleRound[] = [
        {
          roundNumber: 1,
          attackerScore: 10,
          defenderScore: 100,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 10, hullDamageTaken: 100, status: 'destroyed' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 0, hullDamageTaken: 0, status: 'operational' }],
          attackerHullAdvantage: -50,
        },
      ];

      const outcome = determineCombatVictory(rounds);
      expect(outcome).toBe('defender_victory');
    });

    it('should return attacker victory when attacker hull advantage is positive', () => {
      const rounds: BattleRound[] = [
        {
          roundNumber: 6,
          attackerScore: 50,
          defenderScore: 50,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 5, hullDamageTaken: 20, status: 'damaged' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 5, hullDamageTaken: 30, status: 'damaged' }],
          attackerHullAdvantage: 10, // Attacker avg hull > Defender avg hull
        },
      ];

      const outcome = determineCombatVictory(rounds);
      expect(outcome).toBe('attacker_victory');
    });

    it('should return defender victory when attacker hull advantage is negative', () => {
      const rounds: BattleRound[] = [
        {
          roundNumber: 6,
          attackerScore: 50,
          defenderScore: 50,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 5, hullDamageTaken: 30, status: 'damaged' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 5, hullDamageTaken: 20, status: 'damaged' }],
          attackerHullAdvantage: -10, // Defender avg hull > Attacker avg hull
        },
      ];

      const outcome = determineCombatVictory(rounds);
      expect(outcome).toBe('defender_victory');
    });

    it('should return stalemate when hull advantage is zero', () => {
      const rounds: BattleRound[] = [
        {
          roundNumber: 6,
          attackerScore: 50,
          defenderScore: 50,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 5, hullDamageTaken: 25, status: 'damaged' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 5, hullDamageTaken: 25, status: 'damaged' }],
          attackerHullAdvantage: 0,
        },
      ];

      const outcome = determineCombatVictory(rounds);
      expect(outcome).toBe('stalemate');
    });

    it('should return stalemate for empty rounds', () => {
      const outcome = determineCombatVictory([]);
      expect(outcome).toBe('stalemate');
    });
  });

  // ============ calculatePlunder Tests ============

  describe('calculatePlunder', () => {
    it('should calculate plunder for attacker victory', () => {
      const attackers = [createMockShip({ cargoCapacity: 1000, hullIntegrity: 100 })];
      const defenderResources: Resources = {
        Orichalkum: 1000,
        Fokuskristalle: 500,
        Vitriol: 200,
      };
      const rounds: BattleRound[] = [
        {
          roundNumber: 1,
          attackerScore: 100,
          defenderScore: 10,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 0, hullDamageTaken: 5, status: 'operational' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 10, hullDamageTaken: 30, status: 'damaged' }],
          attackerHullAdvantage: 50,
        },
      ];

      const plunder = calculatePlunder(attackers, defenderResources, rounds);

      expect(plunder.efficiency).toBe(1.0); // Low damage = perfect raid
      expect(plunder.plunderMax.Orichalkum).toBeLessThanOrEqual(250); // 25% of 1000
      expect(plunder.plunderMax.Orichalkum).toBeGreaterThan(0);
    });

    it('should cap plunder by cargo capacity', () => {
      const attackers = [createMockShip({ cargoCapacity: 50, hullIntegrity: 100 })];
      const defenderResources: Resources = {
        Orichalkum: 1000,
        Fokuskristalle: 500,
        Vitriol: 200,
      };
      const rounds: BattleRound[] = [
        {
          roundNumber: 1,
          attackerScore: 100,
          defenderScore: 0,
          attackerCasualties: [{ shipId: '1', shipName: 'A1', crewLost: 0, hullDamageTaken: 0, status: 'operational' }],
          defenderCasualties: [{ shipId: '2', shipName: 'D1', crewLost: 20, hullDamageTaken: 100, status: 'destroyed' }],
          attackerHullAdvantage: 100,
        },
      ];

      const plunder = calculatePlunder(attackers, defenderResources, rounds);

      expect(plunder.plunderMax.Orichalkum).toBeLessThanOrEqual(50);
    });

    it('should apply efficiency penalties for heavy casualties', () => {
      const attackers = [
        createMockShip({ cargoCapacity: 1000, hullIntegrity: 10 }), // 90% damage per round
        createMockShip({ cargoCapacity: 1000, hullIntegrity: 5 }),
      ];
      const defenderResources: Resources = {
        Orichalkum: 1000,
        Fokuskristalle: 500,
        Vitriol: 200,
      };
      const rounds: BattleRound[] = [
        {
          roundNumber: 1,
          attackerScore: 100,
          defenderScore: 90,
          attackerCasualties: [
            { shipId: '1', shipName: 'A1', crewLost: 5, hullDamageTaken: 75, status: 'damaged' },
            { shipId: '2', shipName: 'A2', crewLost: 5, hullDamageTaken: 80, status: 'damaged' },
          ],
          defenderCasualties: [{ shipId: '3', shipName: 'D1', crewLost: 10, hullDamageTaken: 100, status: 'destroyed' }],
          attackerHullAdvantage: -5,
        },
      ];

      const plunder = calculatePlunder(attackers, defenderResources, rounds);

      expect(plunder.efficiency).toBeLessThan(1.0); // Heavy damage = reduced efficiency
    });
  });

  // ============ shipToCombatShip Tests ============

  describe('shipToCombatShip', () => {
    it('should convert ship with explicit crew count', () => {
      const mockShip = {
        id: '1',
        name: 'Test Ship',
        attack: 20,
        defense: 15,
        speed: 8,
        cargoCapacity: 500,
        hullIntegrity: 85,
      } as any;

      const combat = shipToCombatShip(mockShip, 25);

      expect(combat.crew).toBe(25);
      expect(combat.id).toBe('1');
      expect(combat.attack).toBe(20);
    });

    it('should use ship.crew property if available', () => {
      const mockShip = {
        id: '1',
        name: 'Test Ship',
        attack: 20,
        defense: 15,
        speed: 8,
        cargoCapacity: 500,
        hullIntegrity: 85,
        crew: 30,
      } as any;

      const combat = shipToCombatShip(mockShip);

      expect(combat.crew).toBe(30);
    });

    it('should fallback to default crew count', () => {
      const mockShip = {
        id: '1',
        name: 'Test Ship',
        attack: 20,
        defense: 15,
        speed: 8,
        cargoCapacity: 500,
        hullIntegrity: 85,
      } as any;

      const combat = shipToCombatShip(mockShip);

      expect(combat.crew).toBe(10); // Default fallback
    });

    it('should prioritize explicit crew parameter over ship.crew', () => {
      const mockShip = {
        id: '1',
        name: 'Test Ship',
        attack: 20,
        defense: 15,
        speed: 8,
        cargoCapacity: 500,
        hullIntegrity: 85,
        crew: 30,
      } as any;

      const combat = shipToCombatShip(mockShip, 50);

      expect(combat.crew).toBe(50); // Explicit param wins
    });
  });

  // ============ resolveCombat Integration Tests ============

  describe('resolveCombat', () => {
    it('should resolve a complete battle with multiple rounds', () => {
      const attackers = [
        createMockShip({ attack: 25, defense: 10, hullIntegrity: 100 }),
        createMockShip({ attack: 25, defense: 10, hullIntegrity: 100 }),
      ];
      const defenders = [createMockShip({ attack: 15, defense: 15, hullIntegrity: 100 })];

      const result = resolveCombat(attackers, defenders, 1.0, []);

      expect(result.rounds.length).toBeGreaterThan(0);
      expect(result.rounds.length).toBeLessThanOrEqual(6);
      expect(['attacker_victory', 'defender_victory', 'stalemate']).toContain(result.outcome);
      expect(result.attackerSurvivors.length).toBeGreaterThanOrEqual(0);
      expect(result.defenderSurvivors.length).toBeGreaterThanOrEqual(0);
    });

    it('should stop early if one side is eliminated', () => {
      const attackers = [createMockShip({ attack: 100, defense: 0, hullIntegrity: 100 })];
      const defenders = [createMockShip({ attack: 0, defense: 0, hullIntegrity: 100 })];

      const result = resolveCombat(attackers, defenders, 1.0, []);

      expect(result.rounds.length).toBeLessThanOrEqual(6);
      // Defenders should be eliminated quickly
      if (result.outcome === 'attacker_victory') {
        expect(result.defenderSurvivors.length).toBe(0);
      }
    });

    it('should apply terrain modifier to all rounds', () => {
      const attackers = [createMockShip({ attack: 50, hullIntegrity: 100 })];
      const defenders = [createMockShip({ defense: 10, hullIntegrity: 100 })];

      const normalResult = resolveCombat(attackers, defenders, 1.0, []);
      const terrainResult = resolveCombat(attackers, [...defenders], 2.0, []);

      // With higher terrain modifier, defenders should take more damage
      const normalDefHull = normalResult.defenderSurvivors[0]?.hullIntegrity ?? 0;
      const terrainDefHull = terrainResult.defenderSurvivors[0]?.hullIntegrity ?? 0;

      expect(terrainDefHull).toBeLessThanOrEqual(normalDefHull);
    });
  });
});
