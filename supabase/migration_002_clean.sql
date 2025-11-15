-- ============================================
-- MILITARY SYSTEM FOUNDATION MIGRATION (CLEAN)
-- ============================================
-- Creates missing tables for settlements system
-- Handles existing indexes/policies gracefully

-- ============================================
-- 1. SETTLEMENTS TABLE (IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,

  -- Local resource storage (JSONB)
  resources JSONB NOT NULL DEFAULT '{"Orichalkum": 1000, "Fokuskristalle": 500, "Vitriol": 500}',
  capacities JSONB NOT NULL DEFAULT '{"orichalkum": 5000, "fokuskristalle": 2500, "vitriol": 2500}',

  -- Energy system
  energy JSONB NOT NULL DEFAULT '{"production": 100, "consumption": 50, "current": 100}',

  -- Fleet and defense references
  base_ship_ids UUID[] DEFAULT '{}',
  defense_ids UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_harvested_at TIMESTAMPTZ,

  -- Unique constraint: one settlement per tile per player
  UNIQUE(player_id, tile_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_settlements_player_id ON settlements(player_id);
CREATE INDEX IF NOT EXISTS idx_settlements_tile_id ON settlements(tile_id);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS settlements_select_policy ON settlements;
CREATE POLICY settlements_select_policy ON settlements
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

DROP POLICY IF EXISTS settlements_insert_policy ON settlements;
CREATE POLICY settlements_insert_policy ON settlements
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

DROP POLICY IF EXISTS settlements_update_policy ON settlements;
CREATE POLICY settlements_update_policy ON settlements
  FOR UPDATE USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 2. SHIPS TABLE (IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS ships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  blueprint_id TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'stationed' CHECK (status IN ('stationed', 'preparing', 'en_route', 'in_combat', 'damaged', 'destroyed')),
  current_tile_id TEXT REFERENCES tiles(id) ON DELETE SET NULL,
  convoy_id UUID,

  -- Health
  hull_integrity INTEGER NOT NULL DEFAULT 100,

  -- Stats (from blueprint + modifications)
  attack INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 10,
  speed INTEGER NOT NULL DEFAULT 5,
  cargo_capacity INTEGER NOT NULL DEFAULT 100,
  current_cargo JSONB NOT NULL DEFAULT '{"Orichalkum": 0, "Fokuskristalle": 0, "Vitriol": 0}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  damaged_at TIMESTAMPTZ
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_ships_player_id ON ships(player_id);
CREATE INDEX IF NOT EXISTS idx_ships_settlement_id ON ships(settlement_id);
CREATE INDEX IF NOT EXISTS idx_ships_status ON ships(status);

-- Enable RLS
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS ships_select_policy ON ships;
CREATE POLICY ships_select_policy ON ships
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

DROP POLICY IF EXISTS ships_insert_policy ON ships;
CREATE POLICY ships_insert_policy ON ships
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

DROP POLICY IF EXISTS ships_update_policy ON ships;
CREATE POLICY ships_update_policy ON ships
  FOR UPDATE USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 3. CONVOYS TABLE (IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS convoys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  origin_settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  target_tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,

  -- Fleet composition
  ship_ids UUID[] NOT NULL DEFAULT '{}',

  -- Mission type
  mission_type TEXT NOT NULL CHECK (mission_type IN ('scout', 'attack', 'transport', 'station', 'colonize')),

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'en_route', 'arrived', 'completed', 'cancelled')),

  -- Cargo (for transport missions)
  cargo JSONB DEFAULT '{"Orichalkum": 0, "Fokuskristalle": 0, "Vitriol": 0}',

  -- Timing
  preparation_ends_at TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_convoys_player_id ON convoys(player_id);
CREATE INDEX IF NOT EXISTS idx_convoys_origin_settlement_id ON convoys(origin_settlement_id);
CREATE INDEX IF NOT EXISTS idx_convoys_target_tile_id ON convoys(target_tile_id);
CREATE INDEX IF NOT EXISTS idx_convoys_status ON convoys(status);

-- Enable RLS
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS convoys_select_policy ON convoys;
CREATE POLICY convoys_select_policy ON convoys
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

DROP POLICY IF EXISTS convoys_insert_policy ON convoys;
CREATE POLICY convoys_insert_policy ON convoys
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 4. SCOUT_REPORTS TABLE (IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS scout_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  origin_settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  target_tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,

  -- Intel level (1-5, higher = more detail)
  intel_level INTEGER NOT NULL CHECK (intel_level >= 1 AND intel_level <= 5),

  -- Report data (JSONB for flexibility)
  report_data JSONB NOT NULL,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_scout_reports_player_id ON scout_reports(player_id);
CREATE INDEX IF NOT EXISTS idx_scout_reports_target_tile_id ON scout_reports(target_tile_id);
CREATE INDEX IF NOT EXISTS idx_scout_reports_expires_at ON scout_reports(expires_at);

-- Enable RLS
ALTER TABLE scout_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS scout_reports_select_policy ON scout_reports;
CREATE POLICY scout_reports_select_policy ON scout_reports
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 5. UPDATE TILES TABLE
-- ============================================
-- Add settlement_id and is_settlement columns if they don't exist
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS is_settlement BOOLEAN DEFAULT FALSE;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tiles_settlement_id ON tiles(settlement_id);
