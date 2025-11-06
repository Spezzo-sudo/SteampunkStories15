import { findRegionPath, type PathFailureReason } from '@/lib/pathfinding';
import type { Axial, RegionData } from '@/types/map';
import { ActionType, type Unit } from '@/types/convoy';
import { pathCost, etaMs, stepCost } from './costs';

interface ActionConfig {
  roundTrip: boolean;
  actionMs: number;
}

const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  [ActionType.MOVE]: { roundTrip: false, actionMs: 0 },
  [ActionType.COLONIZE]: { roundTrip: false, actionMs: 60_000 },
  [ActionType.SCOUT]: { roundTrip: true, actionMs: 10_000 },
  [ActionType.ATTACK]: { roundTrip: true, actionMs: 15_000 },
};

/**
 * Provides the planning metadata for the requested action type.
 */
export const getActionConfig = (action: ActionType): ActionConfig => ACTION_CONFIG[action];

/**
 * Aggregates the available pressure tank capacity for the selected units.
 */
export const aggregatePressureCapacity = (units: Unit[]) =>
  units.reduce((sum, unit) => sum + unit.pressureCapacity, 0);

/** Successful convoy planning payload. */
export interface ConvoyPlanSuccess {
  ok: true;
  path: Axial[];
  cost: number;
  etaMs: number;
  roundTrip: boolean;
  actionMs: number;
  pressureTankMax: number;
}

/** Failure payload describing why convoy planning was rejected. */
export interface ConvoyPlanFailure {
  ok: false;
  reason: string;
  failure?: PathFailureReason | 'pressure-insufficient';
  path?: Axial[];
  cost?: number;
  etaMs?: number;
  roundTrip: boolean;
  actionMs: number;
  pressureTankMax: number;
}

/**
 * Plans a convoy between the provided start and goal coordinates and validates pressure requirements.
 */
export const planConvoy = (
  region: RegionData,
  start: Axial,
  goal: Axial,
  units: Unit[],
  action: ActionType,
): ConvoyPlanSuccess | ConvoyPlanFailure => {
  const { roundTrip, actionMs } = getActionConfig(action);
  const capacity = aggregatePressureCapacity(units);
  const result = findRegionPath(region, start, goal, (tile) => stepCost(tile, units));

  if (result.status === 'failure') {
    return {
      ok: false,
      reason: 'Kein Pfad verfügbar.',
      failure: result.reason,
      roundTrip,
      actionMs,
      pressureTankMax: capacity,
    };
  }

  const path = result.path;
  const travelCost = pathCost(path, region, units, roundTrip);
  const travelSteps = Math.max(path.length - 1, 0);
  const travelEta = etaMs(travelSteps, units, roundTrip, actionMs);

  if (!Number.isFinite(travelCost)) {
    return {
      ok: false,
      reason: 'Der Pfad führt durch unbewohnbare Hexfelder.',
      roundTrip,
      actionMs,
      pressureTankMax: capacity,
      path,
    };
  }

  if (travelCost > capacity) {
    return {
      ok: false,
      reason: 'Nicht genug Kesseldruck für diese Route.',
      failure: 'pressure-insufficient',
      roundTrip,
      actionMs,
      pressureTankMax: capacity,
      path,
      cost: travelCost,
      etaMs: travelEta,
    };
  }

  return {
    ok: true,
    path,
    cost: travelCost,
    etaMs: travelEta,
    roundTrip,
    actionMs,
    pressureTankMax: capacity,
  };
};
