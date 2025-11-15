/**
 * Fix biome codes in existing tiles
 * Maps old biome names to new codes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Map old biome names to correct codes from patterns.ts
const BIOME_MAP: Record<string, string> = {
  'PLAINS': 'PLAINS',
  'DESERT': 'DESERT',
  'MOUNTAINS': 'MOUNTAIN', // plural to singular
  'FOREST': 'FOREST',
  'SWAMP': 'SWAMP',
  'TUNDRA': 'TUNDRA',
  'OCEAN': 'LAKE', // map ocean to lake as closest water biome
  // Also fix any wrongly applied German codes back to English
  'IG': 'PLAINS',
  'EO': 'DESERT',
  'GL': 'MOUNTAIN',
  'DK': 'FOREST',
  'HE': 'SWAMP',
  'NE': 'TUNDRA',
  'CL': 'LAKE',
  'BR': 'HILLS',
};

async function fixBiomes() {
  console.log('Fixing biome codes in tiles...\n');

  // Get all tiles
  const { data: tiles, error: fetchError } = await supabase
    .from('tiles')
    .select('*');

  if (fetchError) {
    console.error('Error fetching tiles:', fetchError);
    process.exit(1);
  }

  if (!tiles || tiles.length === 0) {
    console.log('No tiles found in database');
    return;
  }

  console.log(`Found ${tiles.length} tiles to update`);

  // Update each tile
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  for (const tile of tiles) {
    const newBiome = BIOME_MAP[tile.biome];
    if (newBiome) {
      const { data, error: updateError, count } = await supabase
        .from('tiles')
        .update({ biome: newBiome })
        .eq('id', tile.id)
        .select();

      if (updateError) {
        console.error(`Error updating tile ${tile.id} (${tile.biome} → ${newBiome}):`, updateError);
        errors++;
      } else if (data && data.length > 0) {
        updated++;
        if (updated <= 5) {
          console.log(`✓ Updated tile ${tile.id}: ${tile.biome} → ${newBiome}`);
        }
      } else {
        console.warn(`⚠ No rows updated for tile ${tile.id} (${tile.biome} → ${newBiome})`);
        skipped++;
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  ✓ Updated: ${updated} tiles`);
  console.log(`  ⚠ Skipped: ${skipped} tiles`);
  console.log(`  ✗ Errors: ${errors} tiles`);

  if (updated > 0) {
    console.log('\nBiome codes fixed successfully!');
  } else {
    console.log('\n⚠ Warning: No tiles were updated. Check RLS policies or permissions.');
  }
}

fixBiomes();
