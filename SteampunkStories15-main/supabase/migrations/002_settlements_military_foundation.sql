-- ============================================
-- MILITARY SYSTEM FOUNDATION MIGRATION
-- ============================================
-- Creates the base tables and schema for the
-- multi-settlement military system.

-- ============================================
-- 1. SETTLEMENTS TABLE
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

CREATE INDEX idx_settlements_player_id ON settlements(player_id);
CREATE INDEX idx_settlements_tile_id ON settlements(tile_id);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see their own settlements
CREATE POLICY settlements_select_policy ON settlements
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

-- RLS Policy: Players can insert their own settlements
CREATE POLICY settlements_insert_policy ON settlements
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

-- RLS Policy: Players can update their own settlements
CREATE POLICY settlements_update_policy ON settlements
  FOR UPDATE USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 2. SHIPS TABLE
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

CREATE INDEX idx_ships_player_id ON ships(player_id);
CREATE INDEX idx_ships_settlement_id ON ships(settlement_id);
CREATE INDEX idx_ships_status ON ships(status);

-- Enable RLS
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see their own ships
CREATE POLICY ships_select_policy ON ships
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

-- RLS Policy: Players can insert their own ships
CREATE POLICY ships_insert_policy ON ships
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

-- RLS Policy: Players can update their own ships
CREATE POLICY ships_update_policy ON ships
  FOR UPDATE USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 3. DEFENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS defenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  defense_type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  hull_integrity INTEGER NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_defenses_settlement_id ON defenses(settlement_id);
CREATE INDEX idx_defenses_tile_id ON defenses(tile_id);

-- Enable RLS
ALTER TABLE defenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see defenses on their settlement tiles
CREATE POLICY defenses_select_policy ON defenses
  FOR SELECT USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- ============================================
-- 4. CONVOYS TABLE (NEW - Military Operations)
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

CREATE INDEX idx_convoys_player_id ON convoys(player_id);
CREATE INDEX idx_convoys_origin_settlement_id ON convoys(origin_settlement_id);
CREATE INDEX idx_convoys_target_tile_id ON convoys(target_tile_id);
CREATE INDEX idx_convoys_status ON convoys(status);

-- Enable RLS
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see their own convoys
CREATE POLICY convoys_select_policy ON convoys
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

-- RLS Policy: Players can insert their own convoys
CREATE POLICY convoys_insert_policy ON convoys
  FOR INSERT WITH CHECK (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 5. SCOUT_REPORTS TABLE
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

CREATE INDEX idx_scout_reports_player_id ON scout_reports(player_id);
CREATE INDEX idx_scout_reports_target_tile_id ON scout_reports(target_tile_id);
CREATE INDEX idx_scout_reports_expires_at ON scout_reports(expires_at);

-- Enable RLS
ALTER TABLE scout_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see their own scout reports
CREATE POLICY scout_reports_select_policy ON scout_reports
  FOR SELECT USING (auth.uid()::TEXT = player_id::TEXT);

-- ============================================
-- 6. BATTLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attacker_settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  defender_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  defender_settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,

  tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  convoy_id UUID REFERENCES convoys(id) ON DELETE SET NULL,

  -- Battle state
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'attacker_won', 'defender_won', 'stalemate')),

  -- Battle details (JSONB)
  attacker_ships JSONB,
  defender_ships JSONB,
  defenses_involved JSONB,
  battle_report JSONB,
  resources_plundered JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_battles_attacker_id ON battles(attacker_id);
CREATE INDEX idx_battles_defender_id ON battles(defender_id);
CREATE INDEX idx_battles_tile_id ON battles(tile_id);
CREATE INDEX idx_battles_status ON battles(status);

-- Enable RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Both attacker and defender can see battles they're involved in
CREATE POLICY battles_select_policy ON battles
  FOR SELECT USING (
    auth.uid()::TEXT = attacker_id::TEXT OR auth.uid()::TEXT = defender_id::TEXT
  );

-- ============================================
-- 7. UPDATE TILES TABLE
-- ============================================
-- Add settlement_id to tiles if not exists
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS is_settlement BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tiles_settlement_id ON tiles(settlement_id);

-- ============================================
-- 8. CONSTRAINTS & INDEXES
-- ============================================
-- Ensure convoys don't reference non-existent ships
ALTER TABLE convoys
ADD CONSTRAINT convoys_ship_ids_check CHECK (array_length(ship_ids, 1) > 0 OR array_length(ship_ids, 1) IS NULL);
