-- ============================================
-- ENABLE REALTIME FOR SETTLEMENTS
-- ============================================
-- Adds settlements table to Realtime publication
-- so clients can subscribe to settlement changes

-- Enable realtime for settlements table
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;

-- Enable realtime for battles table (if not already enabled)
DO $$
BEGIN
  -- Check if battles is already in publication, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'battles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE battles;
  END IF;
END $$;

-- Enable realtime for scout_reports table (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'scout_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scout_reports;
  END IF;
END $$;
