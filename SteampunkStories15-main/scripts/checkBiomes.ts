/**
 * Check current biome codes in database
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

async function checkBiomes() {
  console.log('Checking biome codes in tiles...\n');

  // Get all unique biome values
  const { data: tiles, error: fetchError } = await supabase
    .from('tiles')
    .select('biome');

  if (fetchError) {
    console.error('Error fetching tiles:', fetchError);
    process.exit(1);
  }

  if (!tiles || tiles.length === 0) {
    console.log('No tiles found in database');
    return;
  }

  // Count occurrences of each biome
  const biomeCounts = tiles.reduce((acc: Record<string, number>, tile) => {
    const biome = tile.biome as string;
    acc[biome] = (acc[biome] || 0) + 1;
    return acc;
  }, {});

  console.log('Current biome distribution:');
  Object.entries(biomeCounts).forEach(([biome, count]) => {
    console.log(`  ${biome}: ${count} tiles`);
  });
  console.log(`\nTotal: ${tiles.length} tiles`);
}

checkBiomes();
