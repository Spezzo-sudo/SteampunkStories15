import { XorShift32, hash32 } from './rng';

interface WeightedBiome {
  name: string;
  weight: number;
}

const REGION_BIOMES: WeightedBiome[] = [
  { name: 'Steppe', weight: 1.2 },
  { name: 'Wald', weight: 1.1 },
  { name: 'Hochland', weight: 0.9 },
  { name: 'Moor', weight: 0.6 },
  { name: 'Ödland', weight: 0.8 },
  { name: 'Dampfwiese', weight: 1.0 },
  { name: 'Kristallufer', weight: 0.7 },
  { name: 'Rußklippen', weight: 0.5 },
];

const TOTAL_WEIGHT = REGION_BIOMES.reduce((sum, biome) => sum + biome.weight, 0);

/**
 * Deterministically selects a biome name based on region seed and local axial coordinates.
 */
export const pickBiome = (regionSeed: number, q: number, r: number) => {
  const rng = new XorShift32(hash32(regionSeed, q, r));
  const roll = rng.nextFloat() * TOTAL_WEIGHT;
  let accumulated = 0;
  for (const biome of REGION_BIOMES) {
    accumulated += biome.weight;
    if (roll <= accumulated) {
      return biome.name;
    }
  }
  return REGION_BIOMES[0]?.name ?? 'Steppe';
};
