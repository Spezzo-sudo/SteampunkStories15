import type { Axial, RegionData } from '@/types/map';

/**
 * Supported action archetypes available when planning a convoy mission.
 */
export enum ActionType {
  MOVE = 'MOVE',
  COLONIZE = 'COLONIZE',
  SCOUT = 'SCOUT',
  ATTACK = 'ATTACK',
}

/**
 * Runtime location metadata for a unit operating inside a region.
 */
export interface UnitLocation extends Axial {
  RQ: number;
  RR: number;
}

/**
 * Describes a mobile unit that can be assigned to a convoy.
 */
export interface Unit {
  id: string;
  name: string;
  speed: number;
  shipFactor: number;
  actions: ActionType[];
  pressureCapacity: number;
  location: UnitLocation;
}

/**
 * Convoy record tracking the current mission assignment for a set of units.
 */
export interface Convoy {
  id: string;
  unitIds: string[];
  origin: UnitLocation;
  target: UnitLocation;
  path: Axial[];
  action: ActionType;
  roundTrip: boolean;
  speed: number;
  pressureTankMax: number;
  pressureCost: number;
  etaMs: number;
  state: 'queued' | 'movingOut' | 'resolving' | 'returning' | 'done' | 'failed';
  region: RegionData;
}
