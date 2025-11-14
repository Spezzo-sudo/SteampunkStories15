-- Supabase Database Seed Script
-- Run this in the Supabase SQL Editor to populate regions and tiles
-- This bypasses RLS policies since it runs with elevated privileges

-- Insert 19 regions (radius-2 hex disk centered at 0,0)
INSERT INTO regions (id, name, rq, rr) VALUES
  ('reg-0-0', 'Zentrum', 0, 0),
  ('reg-1-0', 'Region 1,0', 1, 0),
  ('reg-1--1', 'Region 1,-1', 1, -1),
  ('reg-0--1', 'Region 0,-1', 0, -1),
  ('reg--1-0', 'Region -1,0', -1, 0),
  ('reg--1-1', 'Region -1,1', -1, 1),
  ('reg-0-1', 'Region 0,1', 0, 1),
  ('reg-2-0', 'Region 2,0', 2, 0),
  ('reg-2--1', 'Region 2,-1', 2, -1),
  ('reg-2--2', 'Region 2,-2', 2, -2),
  ('reg-1--2', 'Region 1,-2', 1, -2),
  ('reg-0--2', 'Region 0,-2', 0, -2),
  ('reg--1--1', 'Region -1,-1', -1, -1),
  ('reg--2-0', 'Region -2,0', -2, 0),
  ('reg--2-1', 'Region -2,1', -2, 1),
  ('reg--2-2', 'Region -2,2', -2, 2),
  ('reg--1-2', 'Region -1,2', -1, 2),
  ('reg-0-2', 'Region 0,2', 0, 2),
  ('reg-1-1', 'Region 1,1', 1, 1);

-- Function to generate biome based on coordinates
CREATE OR REPLACE FUNCTION get_biome_for_tile(q INT, r INT) RETURNS TEXT AS $$
DECLARE
  biomes TEXT[] := ARRAY['PLAINS', 'DESERT', 'MOUNTAINS', 'FOREST', 'SWAMP', 'TUNDRA', 'OCEAN'];
  seed INT;
BEGIN
  seed := ABS(q * 31 + r * 17);
  RETURN biomes[(seed % 7) + 1];
END;
$$ LANGUAGE plpgsql;

-- Generate tiles for each region (37 tiles per region in radius-3 disk)
-- This uses a function to generate all tiles at once
DO $$
DECLARE
  region_record RECORD;
  q INT;
  r INT;
  s INT;
  radius INT := 3;
BEGIN
  FOR region_record IN SELECT id, rq, rr FROM regions LOOP
    FOR q IN -radius..radius LOOP
      FOR r IN GREATEST(-radius, -q-radius)..LEAST(radius, -q+radius) LOOP
        s := -q - r;
        INSERT INTO tiles (id, region_id, q, r, biome, settleable)
        VALUES (
          format('tile-%s-%s-%s-%s', region_record.rq, region_record.rr, q, r),
          region_record.id,
          q,
          r,
          get_biome_for_tile(q, r),
          true
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- Verify the data
SELECT COUNT(*) as region_count FROM regions;
SELECT COUNT(*) as tile_count FROM tiles;

-- Show sample data
SELECT * FROM regions LIMIT 5;
SELECT * FROM tiles LIMIT 10;
