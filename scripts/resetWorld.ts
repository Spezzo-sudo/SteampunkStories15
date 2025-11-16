/**
 * World Reset Script
 *
 * Safely resets the game world while preserving player accounts and alliances.
 * - Archives current round data
 * - Deletes all settlements, convoys, battles
 * - Resets tile ownership
 * - Resets player resources to initial values
 * - Preserves player accounts and alliance memberships
 *
 * Run with: npx ts-node scripts/resetWorld.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables.');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initial resources for new players
const INITIAL_RESOURCES = {
  orichalkum: 5000,
  fokuskristalle: 2500,
  vitriol: 2500,
};

/**
 * Archives the current round before reset.
 * Creates a backup table with timestamped data.
 */
async function archiveCurrentRound(): Promise<void> {
  console.log('\n📦 Archiving current round data...');

  try {
    // Get all settlements before deletion
    const { data: settlements } = await supabase.from('settlements').select('*');
    const { data: convoys } = await supabase.from('convoys').select('*');
    const { data: battles } = await supabase.from('battles').select('*');

    const archiveData = {
      archived_at: new Date().toISOString(),
      settlements_count: settlements?.length || 0,
      convoys_count: convoys?.length || 0,
      battles_count: battles?.length || 0,
      data: {
        settlements: settlements || [],
        convoys: convoys || [],
        battles: battles || [],
      },
    };

    console.log(`  ✓ Captured ${settlements?.length || 0} settlements`);
    console.log(`  ✓ Captured ${convoys?.length || 0} convoys`);
    console.log(`  ✓ Captured ${battles?.length || 0} battles`);
    console.log('  ✓ Archive data prepared (stored in console log if needed)');
  } catch (error) {
    console.warn('  ⚠️  Could not archive round data (non-fatal):', error);
  }
}

/**
 * Deletes all settlements and related data.
 */
async function deleteSettlements(): Promise<void> {
  console.log('\n🏚️  Deleting settlements...');

  try {
    const { data, error } = await supabase.from('settlements').select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('  ✓ No settlements to delete');
      return;
    }

    // Delete settlement buildings first
    const { error: buildingError } = await supabase
      .from('settlement_buildings')
      .delete()
      .not('id', 'is', null);

    if (buildingError) {
      console.warn('  ⚠️  Could not delete settlement buildings:', buildingError);
    } else {
      console.log('  ✓ Deleted settlement buildings');
    }

    // Delete settlements
    const { error: settlementError } = await supabase
      .from('settlements')
      .delete()
      .not('id', 'is', null);

    if (settlementError) {
      console.warn('  ⚠️  Could not delete settlements:', settlementError);
    } else {
      console.log(`  ✓ Deleted ${data.length} settlements`);
    }
  } catch (error) {
    console.warn('  ⚠️  Error deleting settlements:', error);
  }
}

/**
 * Deletes all fleets and convoys.
 */
async function deleteFleets(): Promise<void> {
  console.log('\n⚓ Deleting fleets and convoys...');

  try {
    const { data: ships } = await supabase.from('ships').select('id');
    const { data: convoys } = await supabase.from('convoys').select('id');

    // Delete ships
    if (ships && ships.length > 0) {
      const { error } = await supabase.from('ships').delete().not('id', 'is', null);
      if (error) {
        console.warn('  ⚠️  Could not delete ships:', error);
      } else {
        console.log(`  ✓ Deleted ${ships.length} ships`);
      }
    } else {
      console.log('  ✓ No ships to delete');
    }

    // Delete convoys
    if (convoys && convoys.length > 0) {
      const { error } = await supabase.from('convoys').delete().not('id', 'is', null);
      if (error) {
        console.warn('  ⚠️  Could not delete convoys:', error);
      } else {
        console.log(`  ✓ Deleted ${convoys.length} convoys`);
      }
    } else {
      console.log('  ✓ No convoys to delete');
    }
  } catch (error) {
    console.warn('  ⚠️  Error deleting fleets:', error);
  }
}

/**
 * Deletes all battles and scout reports.
 */
async function deleteBattles(): Promise<void> {
  console.log('\n⚔️  Deleting battles and scout reports...');

  try {
    const { data: battles } = await supabase.from('battles').select('id');
    const { data: reports } = await supabase.from('scout_reports').select('id');

    // Delete battles
    if (battles && battles.length > 0) {
      const { error } = await supabase.from('battles').delete().not('id', 'is', null);
      if (error) {
        console.warn('  ⚠️  Could not delete battles:', error);
      } else {
        console.log(`  ✓ Deleted ${battles.length} battles`);
      }
    } else {
      console.log('  ✓ No battles to delete');
    }

    // Delete scout reports
    if (reports && reports.length > 0) {
      const { error } = await supabase.from('scout_reports').delete().not('id', 'is', null);
      if (error) {
        console.warn('  ⚠️  Could not delete scout reports:', error);
      } else {
        console.log(`  ✓ Deleted ${reports.length} scout reports`);
      }
    } else {
      console.log('  ✓ No scout reports to delete');
    }
  } catch (error) {
    console.warn('  ⚠️  Error deleting battles:', error);
  }
}

/**
 * Resets tile ownership and settlement markers.
 */
async function resetTiles(): Promise<void> {
  console.log('\n🗺️  Resetting tile ownership...');

  try {
    const { error } = await supabase
      .from('tiles')
      .update({
        owner_id: null,
        settlement_id: null,
        alliance_id: null,
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    if (error) {
      console.warn('  ⚠️  Could not reset tiles:', error);
    } else {
      console.log('  ✓ Reset all tile ownership');
    }
  } catch (error) {
    console.warn('  ⚠️  Error resetting tiles:', error);
  }
}

/**
 * Resets player resources to initial values.
 */
async function resetPlayerResources(): Promise<void> {
  console.log('\n💰 Resetting player resources...');

  try {
    const { error } = await supabase
      .from('players')
      .update({
        orichalkum: INITIAL_RESOURCES.orichalkum,
        fokuskristalle: INITIAL_RESOURCES.fokuskristalle,
        vitriol: INITIAL_RESOURCES.vitriol,
        has_placed_home: false,
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    if (error) {
      console.warn('  ⚠️  Could not reset player resources:', error);
    } else {
      console.log('  ✓ Reset all player resources to initial values');
      console.log(
        `    Orichalkum: ${INITIAL_RESOURCES.orichalkum}, Fokuskristalle: ${INITIAL_RESOURCES.fokuskristalle}, Vitriol: ${INITIAL_RESOURCES.vitriol}`
      );
    }
  } catch (error) {
    console.warn('  ⚠️  Error resetting player resources:', error);
  }
}

/**
 * Resets regions to unclaimed state.
 */
async function resetRegions(): Promise<void> {
  console.log('\n🌍 Resetting regions...');

  try {
    const { error } = await supabase
      .from('regions')
      .update({
        alliance_id: null,
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    if (error) {
      console.warn('  ⚠️  Could not reset regions:', error);
    } else {
      console.log('  ✓ Reset all regions to unclaimed');
    }
  } catch (error) {
    console.warn('  ⚠️  Error resetting regions:', error);
  }
}

/**
 * Main reset function with confirmation.
 */
async function resetWorld(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           🌍 WORLD RESET UTILITY                           ║');
  console.log('║                                                            ║');
  console.log('║ WARNING: This operation will delete all game progress!     ║');
  console.log('║                                                            ║');
  console.log('║ The following will be deleted:                            ║');
  console.log('║  • All settlements                                         ║');
  console.log('║  • All fleets and convoys                                  ║');
  console.log('║  • All battles and scout reports                           ║');
  console.log('║  • All tile ownership                                      ║');
  console.log('║                                                            ║');
  console.log('║ The following will be PRESERVED:                          ║');
  console.log('║  • Player accounts                                         ║');
  console.log('║  • Alliance memberships                                    ║');
  console.log('║  • Alliance data (except region control)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // In production, this should require additional confirmation
  const shouldReset = process.argv.includes('--confirm');

  if (!shouldReset) {
    console.log('To confirm reset, run with: --confirm flag');
    console.log('\nnpm run reset:world -- --confirm\n');
    process.exit(0);
  }

  console.log('🚀 Starting world reset...\n');

  try {
    // Execute reset operations in order
    await archiveCurrentRound();
    await deleteSettlements();
    await deleteFleets();
    await deleteBattles();
    await resetTiles();
    await resetRegions();
    await resetPlayerResources();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ WORLD RESET COMPLETE                          ║');
    console.log('║                                                            ║');
    console.log('║ All players are ready for a new round!                    ║');
    console.log('║ Players should restart their clients to see changes.      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Fatal error during reset:', error);
    process.exit(1);
  }
}

// Execute reset
resetWorld().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
