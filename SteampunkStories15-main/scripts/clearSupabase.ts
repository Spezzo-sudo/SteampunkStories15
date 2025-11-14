/**
 * Clear all regions and tiles from Supabase
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

async function clearData() {
  console.log('Clearing all regions and tiles from Supabase...\n');

  // Delete all tiles first (due to foreign key constraint)
  const { error: tilesError } = await supabase
    .from('tiles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except non-existent ID

  if (tilesError) {
    console.error('Error deleting tiles:', tilesError);
    process.exit(1);
  }

  console.log('✓ Deleted all tiles');

  // Delete all regions
  const { error: regionsError } = await supabase
    .from('regions')
    .delete()
    .neq('id', 'non-existent-id'); // Delete all except non-existent ID

  if (regionsError) {
    console.error('Error deleting regions:', regionsError);
    process.exit(1);
  }

  console.log('✓ Deleted all regions\n');
  console.log('Database cleared successfully!');
}

clearData();
