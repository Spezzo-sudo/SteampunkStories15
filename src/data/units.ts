/**
 * Defines the properties of a single unit type in the game.
 */
export interface UnitSpec {
  /** Unique identifier for this unit type. */
  id: 'interceptor' | 'bomber' | 'destroyer' | 'dreadnought' | 'ion_cannon' | 'colony_ship';
  /** User-facing display name. */
  name: string;
  /** Flavor text or description. */
  description: string;
  /** Attack rating against other units. */
  attack: number;
  /** Defensive rating, absorbs damage. */
  defense: number;
  /** Movement speed in tiles per turn/hour (TBD). */
  speed: number;
  /** Resource cost to build this unit. */
  cost: {
    minerals: number;
    gas: number;
  };
  /** Cargo capacity, if any. */
  cargo?: number;
  /** True if this is a defensive structure that cannot move. */
  isStructure?: boolean;
}

export const UNIT_SPECS: Record<UnitSpec['id'], UnitSpec> = {
  interceptor: {
    id: 'interceptor',
    name: 'Abfangjäger',
    description: 'Leichte und schnelle Einheit, effektiv gegen andere Jäger.',
    attack: 10,
    defense: 5,
    speed: 5,
    cost: { minerals: 50, gas: 20 },
  },
  bomber: {
    id: 'bomber',
    name: 'Bomber',
    description: 'Langsam, aber verheerend gegen Bodenziele und große Schiffe.',
    attack: 25,
    defense: 8,
    speed: 3,
    cost: { minerals: 100, gas: 80 },
  },
  destroyer: {
    id: 'destroyer',
    name: 'Zerstörer',
    description: 'Ein vielseitiges Kriegsschiff, das Rückgrat jeder Flotte.',
    attack: 50,
    defense: 50,
    speed: 2,
    cost: { minerals: 250, gas: 150 },
  },
  dreadnought: {
    id: 'dreadnought',
    name: 'Dreadnought',
    description: 'Extrem stark gepanzertes und bewaffnetes Großkampfschiff.',
    attack: 120,
    defense: 100,
    speed: 1,
    cost: { minerals: 1000, gas: 750 },
  },
  ion_cannon: {
    id: 'ion_cannon',
    name: 'Ionenkanone',
    description: 'Leistungsstarke planetare Verteidigungsanlage.',
    attack: 80,
    defense: 40,
    speed: 0,
    cost: { minerals: 500, gas: 200 },
    isStructure: true,
  },
  colony_ship: {
    id: 'colony_ship',
    name: 'Kolonieschiff',
    description: 'Wird benötigt, um neue Planeten zu besiedeln.',
    attack: 0,
    defense: 20,
    speed: 2,
    cost: { minerals: 800, gas: 400 },
    cargo: 1000,
  },
};
