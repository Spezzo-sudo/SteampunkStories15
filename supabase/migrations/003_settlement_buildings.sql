-- ============================================
-- SETTLEMENT-SPECIFIC BUILDINGS MIGRATION
-- ============================================
-- Transforms buildings from player-global to settlement-specific.
-- Adds building capacity system and storage for settlement-local resources.

-- ============================================
-- 1. BUILDING CONFIGS TABLE (New)
-- ============================================
-- Defines properties for each building type (immutable reference data)
CREATE TABLE IF NOT EXISTS building_configs (
  building_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  size_per_level INTEGER NOT NULL DEFAULT 1,
  max_level INTEGER,
  production_type TEXT, -- 'orichalkum', 'fokuskristalle', 'vitriol', 'energy', null for storage/utility

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert building configurations
INSERT INTO building_configs (building_type, display_name, description, size_per_level, max_level, production_type) VALUES
  -- Production buildings
  ('orichalkumSchmelze', 'Orichalkum-Schmelze', 'Smelts ore into Orichalkum', 1, 25, 'orichalkum'),
  ('kristallKondensator', 'Kristallkondensator', 'Condenses Fokuskristalle for electronics', 1, 25, 'fokuskristalle'),
  ('vitriolDestille', 'Vitriol-Destille', 'Distills Vitriol fuel', 1, 25, 'vitriol'),
  ('dampfkraftwerk', 'Dampfkraftwerk', 'Generates energy (bar pressure)', 2, 30, 'energy'),

  -- Storage buildings (specialized per resource)
  ('orichalkumSpeicher', 'Orichalkum-Speicher', 'Increases Orichalkum storage capacity', 1, 15, null),
  ('kristallTresor', 'Kristall-Tresor', 'Increases Fokuskristalle storage capacity', 1, 15, null),
  ('vitriolTank', 'Vitriol-Tank', 'Increases Vitriol storage capacity', 1, 15, null),

  -- Key buildings
  ('forschungslabor', 'Forschungslabor', 'Enables research and reduces research time', 2, 20, null),
  ('werft', 'Werft', 'Builds ships and defense units', 3, 20, null);

-- ============================================
-- 2. SETTLEMENTS TABLE UPDATES
-- ============================================
-- Add building capacity tracking to settlements
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS max_building_capacity INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS current_building_size INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 3. BUILDINGS TABLE
-- ============================================
-- Settlement-specific buildings (replaces player-global)
CREATE TABLE IF NOT EXISTS settlement_buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL REFERENCES building_configs(building_type) ON DELETE RESTRICT,
  level INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_upgraded_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(settlement_id, building_type),
  CONSTRAINT valid_building_level CHECK (level > 0)
);

CREATE INDEX idx_settlement_buildings_settlement_id ON settlement_buildings(settlement_id);
CREATE INDEX idx_settlement_buildings_building_type ON settlement_buildings(building_type);

-- Enable RLS
ALTER TABLE settlement_buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see buildings in their settlements
CREATE POLICY settlement_buildings_select_policy ON settlement_buildings
  FOR SELECT USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- RLS Policy: Players can insert buildings in their settlements
CREATE POLICY settlement_buildings_insert_policy ON settlement_buildings
  FOR INSERT WITH CHECK (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- RLS Policy: Players can update buildings in their settlements
CREATE POLICY settlement_buildings_update_policy ON settlement_buildings
  FOR UPDATE USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- ============================================
-- 4. BUILD QUEUE TABLE (Updated)
-- ============================================
-- Add settlement_id to build queue for settlement-specific construction
ALTER TABLE IF EXISTS build_queue
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE;

-- If build_queue doesn't exist, create it
CREATE TABLE IF NOT EXISTS build_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  settlement_building_id UUID REFERENCES settlement_buildings(id) ON DELETE SET NULL,
  building_type TEXT NOT NULL,
  target_level INTEGER NOT NULL,

  -- Costs (stored for record-keeping)
  cost_orichalkum BIGINT NOT NULL DEFAULT 0,
  cost_fokuskristalle BIGINT NOT NULL DEFAULT 0,
  cost_vitriol BIGINT NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,

  -- State
  status TEXT NOT NULL DEFAULT 'building', -- 'building', 'completed', 'cancelled'

  CONSTRAINT valid_queue_status CHECK (status IN ('building', 'completed', 'cancelled'))
);

CREATE INDEX idx_build_queue_settlement_id ON build_queue(settlement_id);
CREATE INDEX idx_build_queue_building_type ON build_queue(building_type);
CREATE INDEX idx_build_queue_status ON build_queue(status);

-- Enable RLS
ALTER TABLE build_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Players can see queues in their settlements
CREATE POLICY build_queue_select_policy ON build_queue
  FOR SELECT USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- RLS Policy: Players can insert queues in their settlements
CREATE POLICY build_queue_insert_policy ON build_queue
  FOR INSERT WITH CHECK (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- RLS Policy: Players can update queues in their settlements
CREATE POLICY build_queue_update_policy ON build_queue
  FOR UPDATE USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE player_id = auth.uid()::UUID
    )
  );

-- ============================================
-- 5. SETTLEMENT CAPACITY CALCULATION TRIGGER
-- ============================================
-- Automatically update current_building_size when buildings change
CREATE OR REPLACE FUNCTION update_settlement_building_size()
RETURNS TRIGGER AS $$
DECLARE
  total_size INTEGER;
BEGIN
  -- Calculate total building size for this settlement
  SELECT COALESCE(SUM(sb.level * bc.size_per_level), 0)
  INTO total_size
  FROM settlement_buildings sb
  JOIN building_configs bc ON sb.building_type = bc.building_type
  WHERE sb.settlement_id = COALESCE(NEW.settlement_id, OLD.settlement_id);

  -- Update the settlement's current building size
  UPDATE settlements
  SET current_building_size = total_size
  WHERE id = COALESCE(NEW.settlement_id, OLD.settlement_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_buildings_size_update
  AFTER INSERT OR UPDATE OR DELETE ON settlement_buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_building_size();

-- ============================================
-- 6. SETTLEMENT CAPACITY VALIDATION FUNCTION
-- ============================================
-- Check if a building can be constructed within settlement capacity
CREATE OR REPLACE FUNCTION check_settlement_building_capacity(
  p_settlement_id UUID,
  p_building_type TEXT,
  p_new_level INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_size INTEGER;
  v_max_capacity INTEGER;
  v_current_level INTEGER;
  v_building_size INTEGER;
  v_new_total_size INTEGER;
BEGIN
  -- Get settlement capacity info
  SELECT current_building_size, max_building_capacity
  INTO v_current_size, v_max_capacity
  FROM settlements
  WHERE id = p_settlement_id;

  -- Get building size
  SELECT size_per_level
  INTO v_building_size
  FROM building_configs
  WHERE building_type = p_building_type;

  -- Get current building level if exists
  SELECT level
  INTO v_current_level
  FROM settlement_buildings
  WHERE settlement_id = p_settlement_id AND building_type = p_building_type;

  v_current_level := COALESCE(v_current_level, 0);

  -- Calculate new total size
  v_new_total_size := v_current_size - (v_current_level * v_building_size) + (p_new_level * v_building_size);

  -- Return true if within capacity
  RETURN v_new_total_size <= v_max_capacity;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. INITIAL CAPACITY UPDATES
-- ============================================
-- Set default capacity for existing settlements
UPDATE settlements
SET
  max_building_capacity = CASE
    WHEN level = 1 THEN 20
    WHEN level = 2 THEN 30
    WHEN level = 3 THEN 45
    WHEN level = 4 THEN 60
    WHEN level = 5 THEN 80
    WHEN level >= 10 THEN 150
    ELSE 20 + (level - 1) * 10
  END,
  current_building_size = 0
WHERE max_building_capacity = 20 AND current_building_size = 0;

-- ============================================
-- 8. LEGACY MIGRATION NOTE
-- ============================================
-- The old player-global buildings table can be kept for reference
-- but is no longer used. New buildings must use settlement_buildings table.
-- Migration: If you had player-global buildings, migrate them using:
--   INSERT INTO settlement_buildings (settlement_id, building_type, level)
--   SELECT s.id, b.building_type, b.level
--   FROM buildings b
--   JOIN settlements s ON s.player_id = b.player_id
--   WHERE b.system_id IS NULL OR b.system_id = s.tile_id;
