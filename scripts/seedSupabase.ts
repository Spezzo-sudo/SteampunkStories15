/**
 * Supabase Database Seed Script
 *
 * Generates and inserts 19 regions with tiles into the Supabase database.
 * This replaces the Firebase setupFirestore.ts script.
 *
 * Run with: npm run seed:supabase
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { disk } from '../src/lib/hexgrid/hex';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('L Missing Supabase credentials in environment variables.');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Biome types - these match the BIOME_STYLE codes in src/lib/hexgrid/patterns.ts
const BIOMES = [
  'DESERT',
  'FOREST',
  'HILLS',
  'PLAINS',
  'SWAMP',
  'LAKE',
  'MOUNTAIN',
  'TUNDRA',
];

/**
 * Generates a deterministic biome based on coordinates.
 */
function getBiomeForTile(q: number, r: number): string {
  const seed = Math.abs(q * 31 + r * 17);
  return BIOMES[seed % BIOMES.length];
}

/**
 * Generates tiles for a region (radius-3 disk = 37 tiles).
 */
function generateTilesForRegion(regionId: string, rq: number, rr: number) {
  const tileCoords = disk({ q: 0, r: 0 }, 3); // 37 tiles in radius-3

  return tileCoords.map(({ q, r }) => ({
    id: `tile-${rq}-${rr}-${q}-${r}`,
    region_id: regionId,
    q,
    r,
    biome: getBiomeForTile(q, r),
    settleable: true,
    owner_id: null,
    alliance_id: null,
    system_name: null,
    has_station: false,
  }));
}

/**
 * Main seed function.
 */
async function seed() {
  console.log('<1 Starting Supabase database seed...\n');

  // Check if regions already exist
  const { data: existingRegions, error: checkError } = await supabase
    .from('regions')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('L Error checking for existing regions:', checkError);
    process.exit(1);
  }

  if (existingRegions && existingRegions.length > 0) {
    console.log('�  Regions already exist in the database.');
    console.log('Do you want to delete and recreate them? (This will delete ALL regions and tiles)');
    console.log('Type "yes" to continue, or press Ctrl+C to cancel.');

    // In a real script, you'd use readline to prompt for confirmation
    // For now, we'll just exit
    console.log('\n=� To proceed, manually delete regions from the database first.');
    process.exit(0);
  }

  // Generate 19 regions (radius-2 hex disk)
  const regionCoords = disk({ q: 0, r: 0 }, 2); // 19 regions
  const regions = regionCoords.map(({ q, r }) => ({
    id: `reg-${q}-${r}`,
    name: q === 0 && r === 0 ? 'Zentrum' : `Region ${q},${r}`,
    rq: q,
    rr: r,
  }));

  console.log(`=� Inserting ${regions.length} regions...`);

  // Insert regions
  const { error: regionsError } = await supabase
    .from('regions')
    .insert(regions);

  if (regionsError) {
    console.error('L Error inserting regions:', regionsError);
    process.exit(1);
  }

  console.log(` Inserted ${regions.length} regions successfully.\n`);

  // Generate and insert tiles for each region
  console.log('=7 Inserting tiles for each region...');

  let totalTiles = 0;

  for (const region of regions) {
    const tiles = generateTilesForRegion(region.id, region.rq, region.rr);

    const { error: tilesError } = await supabase
      .from('tiles')
      .insert(tiles);

    if (tilesError) {
      console.error(`L Error inserting tiles for region ${region.id}:`, tilesError);
      process.exit(1);
    }

    totalTiles += tiles.length;
    console.log(`   Region ${region.id}: ${tiles.length} tiles`);
  }

  console.log(`\n Inserted ${totalTiles} tiles successfully.`);
  console.log('\n<� Database seed completed!\n');
  console.log('You can now run the application with: npm run dev');
}

// Run the seed
seed().catch((error) => {
  console.error('L Seed script failed:', error);
  process.exit(1);
});
