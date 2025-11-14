-- Aether-Imperium Initial Database Schema
-- This migration creates all tables for the game state

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  faction TEXT NOT NULL DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_placed_home BOOLEAN NOT NULL DEFAULT FALSE,
  home_system_id TEXT,

  -- Resources
  orichalkum BIGINT NOT NULL DEFAULT 500,
  fokuskristalle BIGINT NOT NULL DEFAULT 500,
  vitriol BIGINT NOT NULL DEFAULT 100,

  -- Storage capacity
  storage_orichalkum BIGINT NOT NULL DEFAULT 10000,
  storage_fokuskristalle BIGINT NOT NULL DEFAULT 10000,
  storage_vitriol BIGINT NOT NULL DEFAULT 5000,

  -- Energy (Kesseldruck)
  energy_capacity INTEGER NOT NULL DEFAULT 0,
  energy_consumption INTEGER NOT NULL DEFAULT 0,
  energy_production INTEGER NOT NULL DEFAULT 0,

  -- Hangar
  hangar_capacity INTEGER NOT NULL DEFAULT 20,
  hangar_used INTEGER NOT NULL DEFAULT 0,

  -- Alliance
  alliance_id UUID,
  alliance_rank TEXT,

  -- Stats for directory
  total_planets INTEGER NOT NULL DEFAULT 0,
  favorite_planet TEXT,

  CONSTRAINT valid_resources CHECK (
    orichalkum >= 0 AND
    fokuskristalle >= 0 AND
    vitriol >= 0
  )
);

-- Index for lookups
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_alliance_id ON players(alliance_id);
CREATE INDEX idx_players_username ON players(username);

-- ============================================================================
-- BUILDINGS TABLE
-- ============================================================================
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  building_type TEXT NOT NULL, -- 'orichalkum_smelter', 'crystal_condenser', 'vitriol_distillery', 'steam_power_plant'
  level INTEGER NOT NULL DEFAULT 1,
  system_id TEXT, -- Location (optional, for future multi-system gameplay)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_building_level CHECK (level > 0)
);

CREATE INDEX idx_buildings_player_id ON buildings(player_id);
CREATE INDEX idx_buildings_type ON buildings(building_type);

-- ============================================================================
-- BUILD QUEUE TABLE
-- ============================================================================
CREATE TABLE build_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  target_level INTEGER NOT NULL,

  -- Costs (stored for record-keeping)
  cost_orichalkum BIGINT NOT NULL,
  cost_fokuskristalle BIGINT NOT NULL,
  cost_vitriol BIGINT NOT NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,

  -- State
  status TEXT NOT NULL DEFAULT 'building', -- 'building', 'completed'

  CONSTRAINT valid_queue_status CHECK (status IN ('building', 'completed'))
);

CREATE INDEX idx_build_queue_player_id ON build_queue(player_id);
CREATE INDEX idx_build_queue_status ON build_queue(status);

-- ============================================================================
-- RESEARCH TABLE
-- ============================================================================
CREATE TABLE research (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  tech_id TEXT NOT NULL, -- e.g., 'aetherdynamik', 'armor_tech'
  level INTEGER NOT NULL DEFAULT 0,

  -- Current research progress
  is_researching BOOLEAN NOT NULL DEFAULT FALSE,
  research_started_at TIMESTAMPTZ,
  research_duration_seconds INTEGER,
  research_cost_orichalkum BIGINT,
  research_cost_fokuskristalle BIGINT,

  CONSTRAINT unique_player_tech UNIQUE (player_id, tech_id),
  CONSTRAINT valid_research_level CHECK (level >= 0)
);

CREATE INDEX idx_research_player_id ON research(player_id);
CREATE INDEX idx_research_tech_id ON research(tech_id);
CREATE INDEX idx_research_active ON research(is_researching);

-- ============================================================================
-- SHIPS TABLE
-- ============================================================================
CREATE TABLE ships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  ship_type TEXT NOT NULL, -- 'scout_drone', 'coal_freighter', 'storm_frigate', 'aether_carrier'
  name TEXT,

  -- Stats
  hull_integrity INTEGER NOT NULL DEFAULT 100,
  hangar_slots INTEGER NOT NULL,
  cargo_capacity INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL,

  -- Location
  current_system_id TEXT,
  is_stationed BOOLEAN NOT NULL DEFAULT TRUE,

  -- Convoy assignment
  convoy_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ships_player_id ON ships(player_id);
CREATE INDEX idx_ships_convoy_id ON ships(convoy_id);
CREATE INDEX idx_ships_system_id ON ships(current_system_id);

-- ============================================================================
-- SHIPYARD QUEUE TABLE
-- ============================================================================
CREATE TABLE shipyard_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  ship_type TEXT NOT NULL,

  -- Costs
  cost_orichalkum BIGINT NOT NULL,
  cost_fokuskristalle BIGINT NOT NULL,
  cost_vitriol BIGINT NOT NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,

  -- State
  status TEXT NOT NULL DEFAULT 'building', -- 'building', 'completed'

  CONSTRAINT valid_shipyard_status CHECK (status IN ('building', 'completed'))
);

CREATE INDEX idx_shipyard_queue_player_id ON shipyard_queue(player_id);
CREATE INDEX idx_shipyard_queue_status ON shipyard_queue(status);

-- ============================================================================
-- GALAXY: REGIONS TABLE
-- ============================================================================
CREATE TABLE regions (
  id TEXT PRIMARY KEY, -- e.g., 'reg-0-0'
  name TEXT NOT NULL,
  rq INTEGER NOT NULL, -- Regional Q coordinate
  rr INTEGER NOT NULL, -- Regional R coordinate
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_region_coords UNIQUE (rq, rr)
);

CREATE INDEX idx_regions_coords ON regions(rq, rr);

-- ============================================================================
-- GALAXY: TILES TABLE
-- ============================================================================
CREATE TABLE tiles (
  id TEXT PRIMARY KEY, -- e.g., 'tile-0-0-1-2' (regionRQ-regionRR-q-r)
  region_id TEXT REFERENCES regions(id) ON DELETE CASCADE NOT NULL,

  -- Tile coordinates within region
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,

  -- Terrain
  biome TEXT NOT NULL,
  settleable BOOLEAN NOT NULL DEFAULT TRUE,

  -- Ownership
  owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  alliance_id UUID,

  -- System data (if settled)
  system_name TEXT,
  has_station BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_tile_coords UNIQUE (region_id, q, r)
);

CREATE INDEX idx_tiles_region_id ON tiles(region_id);
CREATE INDEX idx_tiles_owner_id ON tiles(owner_id);
CREATE INDEX idx_tiles_alliance_id ON tiles(alliance_id);
CREATE INDEX idx_tiles_coords ON tiles(q, r);

-- ============================================================================
-- CONVOYS (Missions/Fleets) TABLE
-- ============================================================================
CREATE TABLE convoys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,

  -- Mission details
  mission_type TEXT NOT NULL, -- 'attack', 'transport', 'espionage', 'colonize', 'station'

  -- Location
  origin_tile_id TEXT NOT NULL,
  target_tile_id TEXT NOT NULL,
  current_tile_id TEXT,

  -- Path (stored as JSON array of tile IDs)
  path JSONB NOT NULL,
  path_index INTEGER NOT NULL DEFAULT 0,

  -- Timing
  status TEXT NOT NULL DEFAULT 'preparing', -- 'preparing', 'en_route', 'arrived', 'completed', 'cancelled'
  preparation_ends_at TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,

  -- Cargo (for transport missions)
  cargo_orichalkum BIGINT NOT NULL DEFAULT 0,
  cargo_fokuskristalle BIGINT NOT NULL DEFAULT 0,
  cargo_vitriol BIGINT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_convoy_status CHECK (
    status IN ('preparing', 'en_route', 'arrived', 'completed', 'cancelled')
  ),
  CONSTRAINT valid_mission_type CHECK (
    mission_type IN ('attack', 'transport', 'espionage', 'colonize', 'station')
  )
);

CREATE INDEX idx_convoys_player_id ON convoys(player_id);
CREATE INDEX idx_convoys_status ON convoys(status);
CREATE INDEX idx_convoys_target ON convoys(target_tile_id);

-- ============================================================================
-- ALLIANCES TABLE
-- ============================================================================
CREATE TABLE alliances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE, -- e.g., '[TAG]'
  description TEXT,

  -- Leadership
  founder_id UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Settings
  is_recruiting BOOLEAN NOT NULL DEFAULT TRUE,
  min_rank_to_invite TEXT NOT NULL DEFAULT 'officer',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_tag_format CHECK (LENGTH(tag) <= 10)
);

CREATE INDEX idx_alliances_tag ON alliances(tag);
CREATE INDEX idx_alliances_name ON alliances(name);

-- ============================================================================
-- ALLIANCE MEMBERS TABLE (denormalized for performance)
-- ============================================================================
CREATE TABLE alliance_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alliance_id UUID REFERENCES alliances(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  rank TEXT NOT NULL DEFAULT 'member', -- 'founder', 'leader', 'officer', 'member', 'recruit'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_alliance_member UNIQUE (alliance_id, player_id),
  CONSTRAINT valid_rank CHECK (
    rank IN ('founder', 'leader', 'officer', 'member', 'recruit')
  )
);

CREATE INDEX idx_alliance_members_alliance_id ON alliance_members(alliance_id);
CREATE INDEX idx_alliance_members_player_id ON alliance_members(player_id);

-- ============================================================================
-- ALLIANCE PACTS TABLE
-- ============================================================================
CREATE TABLE alliance_pacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alliance_id_1 UUID REFERENCES alliances(id) ON DELETE CASCADE NOT NULL,
  alliance_id_2 UUID REFERENCES alliances(id) ON DELETE CASCADE NOT NULL,
  pact_type TEXT NOT NULL, -- 'nap', 'ally', 'war'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pact UNIQUE (alliance_id_1, alliance_id_2),
  CONSTRAINT valid_pact_type CHECK (pact_type IN ('nap', 'ally', 'war')),
  CONSTRAINT different_alliances CHECK (alliance_id_1 != alliance_id_2)
);

CREATE INDEX idx_alliance_pacts_alliance1 ON alliance_pacts(alliance_id_1);
CREATE INDEX idx_alliance_pacts_alliance2 ON alliance_pacts(alliance_id_2);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Sender
  sender_id UUID REFERENCES players(id) ON DELETE SET NULL,
  sender_username TEXT NOT NULL,

  -- Room/Channel
  room_id TEXT NOT NULL, -- 'alliance:UUID', 'dm:UUID1:UUID2', 'global'

  -- Content
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_content_length CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000)
);

CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- ============================================================================
-- GAME TICK TRACKING TABLE
-- ============================================================================
CREATE TABLE game_ticks (
  id BIGSERIAL PRIMARY KEY,
  tick_number BIGINT NOT NULL UNIQUE,
  tick_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_duration_ms INTEGER,

  -- Stats
  players_updated INTEGER NOT NULL DEFAULT 0,
  resources_produced JSONB,
  builds_completed INTEGER NOT NULL DEFAULT 0,
  ships_completed INTEGER NOT NULL DEFAULT 0,
  convoys_moved INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_game_ticks_tick_number ON game_ticks(tick_number DESC);
CREATE INDEX idx_game_ticks_time ON game_ticks(tick_time DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE research ENABLE ROW LEVEL SECURITY;
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipyard_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_pacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_ticks ENABLE ROW LEVEL SECURITY;

-- Players: Everyone can read, users can only update their own
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own player"
  ON players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own player"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Buildings: Users can only see and modify their own
CREATE POLICY "Users can view own buildings"
  ON buildings FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own buildings"
  ON buildings FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own buildings"
  ON buildings FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own buildings"
  ON buildings FOR DELETE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Build Queue: Users can only see and modify their own
CREATE POLICY "Users can view own build queue"
  ON build_queue FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own build queue items"
  ON build_queue FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own build queue items"
  ON build_queue FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Research: Users can only see and modify their own
CREATE POLICY "Users can view own research"
  ON research FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own research"
  ON research FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own research"
  ON research FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Ships: Users can only see and modify their own
CREATE POLICY "Users can view own ships"
  ON ships FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own ships"
  ON ships FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own ships"
  ON ships FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Shipyard Queue: Users can only see and modify their own
CREATE POLICY "Users can view own shipyard queue"
  ON shipyard_queue FOR SELECT
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own shipyard queue items"
  ON shipyard_queue FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own shipyard queue items"
  ON shipyard_queue FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Regions: Everyone can read
CREATE POLICY "Regions are viewable by everyone"
  ON regions FOR SELECT
  USING (true);

-- Tiles: Everyone can read, users can claim settleable tiles
CREATE POLICY "Tiles are viewable by everyone"
  ON tiles FOR SELECT
  USING (true);

CREATE POLICY "Users can claim settleable tiles"
  ON tiles FOR UPDATE
  USING (
    settleable = true AND
    owner_id IS NULL AND
    auth.uid() IN (SELECT user_id FROM players)
  );

-- Convoys: Users can view their own and those targeting their tiles
CREATE POLICY "Users can view own convoys"
  ON convoys FOR SELECT
  USING (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
    OR target_tile_id IN (SELECT id FROM tiles WHERE owner_id IN (SELECT id FROM players WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own convoys"
  ON convoys FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own convoys"
  ON convoys FOR UPDATE
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Alliances: Everyone can read
CREATE POLICY "Alliances are viewable by everyone"
  ON alliances FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create alliances"
  ON alliances FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Alliance leaders can update alliance"
  ON alliances FOR UPDATE
  USING (
    id IN (
      SELECT alliance_id FROM alliance_members
      WHERE player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
      AND rank IN ('founder', 'leader')
    )
  );

-- Alliance Members: Everyone can read
CREATE POLICY "Alliance members are viewable by everyone"
  ON alliance_members FOR SELECT
  USING (true);

-- Alliance Pacts: Everyone can read
CREATE POLICY "Alliance pacts are viewable by everyone"
  ON alliance_pacts FOR SELECT
  USING (true);

-- Messages: Users can view messages in their rooms
CREATE POLICY "Users can view messages in their rooms"
  ON messages FOR SELECT
  USING (
    room_id = 'global'
    OR room_id LIKE 'alliance:%' AND SUBSTRING(room_id FROM 10)::UUID IN (
      SELECT alliance_id FROM alliance_members
      WHERE player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
    )
    OR room_id LIKE 'dm:%' AND auth.uid()::TEXT = ANY(string_to_array(SUBSTRING(room_id FROM 4), ':'))
  );

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- Game Ticks: Everyone can read
CREATE POLICY "Game ticks are viewable by everyone"
  ON game_ticks FOR SELECT
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get player by user_id
CREATE OR REPLACE FUNCTION get_player_id(uid UUID)
RETURNS UUID AS $$
  SELECT id FROM players WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to calculate build time remaining
CREATE OR REPLACE FUNCTION build_time_remaining(queue_item_id UUID)
RETURNS INTEGER AS $$
  SELECT GREATEST(
    0,
    duration_seconds - EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  )
  FROM build_queue
  WHERE id = queue_item_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if player has enough resources
CREATE OR REPLACE FUNCTION has_resources(
  p_player_id UUID,
  p_orichalkum BIGINT,
  p_fokuskristalle BIGINT,
  p_vitriol BIGINT
)
RETURNS BOOLEAN AS $$
  SELECT
    orichalkum >= p_orichalkum AND
    fokuskristalle >= p_fokuskristalle AND
    vitriol >= p_vitriol
  FROM players
  WHERE id = p_player_id;
$$ LANGUAGE SQL STABLE;

-- Function to deduct resources from player
CREATE OR REPLACE FUNCTION deduct_resources(
  p_player_id UUID,
  p_orichalkum BIGINT,
  p_fokuskristalle BIGINT,
  p_vitriol BIGINT
)
RETURNS BOOLEAN AS $$
  UPDATE players
  SET
    orichalkum = orichalkum - p_orichalkum,
    fokuskristalle = fokuskristalle - p_fokuskristalle,
    vitriol = vitriol - p_vitriol
  WHERE id = p_player_id
  AND orichalkum >= p_orichalkum
  AND fokuskristalle >= p_fokuskristalle
  AND vitriol >= p_vitriol
  RETURNING true;
$$ LANGUAGE SQL VOLATILE;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert a default global region (optional, for testing)
-- INSERT INTO regions (id, name, rq, rr) VALUES
--   ('reg-0-0', 'Central Sector', 0, 0);

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE build_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE research;
ALTER PUBLICATION supabase_realtime ADD TABLE ships;
ALTER PUBLICATION supabase_realtime ADD TABLE shipyard_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE convoys;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tiles;
