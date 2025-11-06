import { ActionType, type Unit } from '@/types/convoy';

/**
 * Default reusable unit templates with baseline stats for prototyping convoy planning.
 */
export const UNIT_LIBRARY: Record<string, Omit<Unit, 'id' | 'location'>> = {
  korvette: {
    name: 'Korvette',
    speed: 1.1,
    shipFactor: 1,
    actions: [ActionType.MOVE, ActionType.SCOUT, ActionType.ATTACK],
    pressureCapacity: 120,
  },
  fregatte: {
    name: 'Fregatte',
    speed: 0.95,
    shipFactor: 1.2,
    actions: [ActionType.MOVE, ActionType.ATTACK],
    pressureCapacity: 140,
  },
  frachter: {
    name: 'Frachter',
    speed: 0.8,
    shipFactor: 1.4,
    actions: [ActionType.MOVE, ActionType.COLONIZE],
    pressureCapacity: 200,
  },
  aufklaerer: {
    name: 'Aufklärer',
    speed: 1.4,
    shipFactor: 0.9,
    actions: [ActionType.MOVE, ActionType.SCOUT],
    pressureCapacity: 110,
  },
};

/**
 * Creates a unit instance from the shared library while attaching a runtime identifier.
 */
export const instantiateUnit = (
  templateId: keyof typeof UNIT_LIBRARY,
  id: string,
  location: Unit['location'],
): Unit => ({
  id,
  location,
  ...UNIT_LIBRARY[templateId],
});
