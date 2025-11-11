import { CONFIG } from '@/config/mapConfig';
import type { World, Region } from '@/data/types';
import { ensureRegionCentroid } from '@/lib/hexgrid/microRegion';
import { makeWorld } from '@/lib/hexgrid/macroWorld';

/**
 * Bootstrap the world layout from the deterministic generator.
 */
export const bootstrapWorld = async (worldId: string): Promise<World> => {
  const world = makeWorld();
  world.regions.forEach((region) => ensureRegionCentroid(region, CONFIG.microHexSizePx));
  return world;
};

/**
 * Lists all regions in the world.
 * @returns An array of regions.
 */
export const listRegions = async (): Promise<Region[]> => {
  const world = await bootstrapWorld('__dummy_id__');
  return world.regions;
}
