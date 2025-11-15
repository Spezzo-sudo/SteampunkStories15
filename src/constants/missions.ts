/**
 * Mission Requirements Configuration
 *
 * Defines what buildings and research are required to launch each mission type.
 */

import { MissionType } from '@/types';

/**
 * Requirements for launching a mission.
 */
export interface MissionRequirements {
  buildings?: Array<{ id: string; level?: number }>;
  research?: Array<{ id: string; level?: number }>;
  minWerftLevel?: number;
}

/**
 * Mission requirements by type.
 *
 * Each mission has specific building and/or research prerequisites that must be met
 * before the mission can be planned and launched.
 */
export const MISSION_REQUIREMENTS: Record<MissionType, MissionRequirements> = {
  [MissionType.Spionage]: {
    buildings: [],
    research: [
      { id: 'spionagetechnologie' },
      { id: 'observatoriumsnetz' },
    ],
    minWerftLevel: 1,
  },

  [MissionType.Stationierung]: {
    buildings: [],
    research: [{ id: 'panzerungstechnik' }],
    minWerftLevel: 1,
  },

  [MissionType.Angriff]: {
    buildings: [],
    research: [{ id: 'observatoriumsnetz' }],
    minWerftLevel: 2,
  },

  [MissionType.Transport]: {
    buildings: [],
    research: [],
    minWerftLevel: 1,
  },

  [MissionType.Kolonisierung]: {
    buildings: [],
    research: [{ id: 'himmelsmechanik' }],
    minWerftLevel: 3,
  },
};
