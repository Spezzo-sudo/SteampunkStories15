-- 003_settlement_rls_security.sql
-- Security-first migration that enables row level security for all
-- player-owned militarized tables and applies least-privilege policies.

BEGIN;

-- Enable RLS on every table that carries player ownership context.
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE convoys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Settlements: owner-only visibility + mutations.
DROP POLICY IF EXISTS settlements_owner_select ON settlements;
CREATE POLICY settlements_owner_select
  ON settlements
  FOR SELECT
  USING (player_id = auth.uid());

DROP POLICY IF EXISTS settlements_owner_modify ON settlements;
CREATE POLICY settlements_owner_modify
  ON settlements
  FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Ships: tie access directly to owning player.
DROP POLICY IF EXISTS ships_owner_select ON ships;
CREATE POLICY ships_owner_select
  ON ships
  FOR SELECT
  USING (player_id = auth.uid());

DROP POLICY IF EXISTS ships_owner_modify ON ships;
CREATE POLICY ships_owner_modify
  ON ships
  FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Convoys: only owning commander can view/mutate missions.
DROP POLICY IF EXISTS convoys_owner_select ON convoys;
CREATE POLICY convoys_owner_select
  ON convoys
  FOR SELECT
  USING (player_id = auth.uid());

DROP POLICY IF EXISTS convoys_owner_modify ON convoys;
CREATE POLICY convoys_owner_modify
  ON convoys
  FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Scout reports: only the scouting player has access.
DROP POLICY IF EXISTS scout_reports_owner_select ON scout_reports;
CREATE POLICY scout_reports_owner_select
  ON scout_reports
  FOR SELECT
  USING (player_id = auth.uid());

DROP POLICY IF EXISTS scout_reports_owner_modify ON scout_reports;
CREATE POLICY scout_reports_owner_modify
  ON scout_reports
  FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Defenses: join back to settlement to validate ownership.
DROP POLICY IF EXISTS defenses_owner_select ON defenses;
CREATE POLICY defenses_owner_select
  ON defenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM settlements s
      WHERE s.id = defenses.settlement_id
        AND s.player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS defenses_owner_modify ON defenses;
CREATE POLICY defenses_owner_modify
  ON defenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM settlements s
      WHERE s.id = defenses.settlement_id
        AND s.player_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM settlements s
      WHERE s.id = defenses.settlement_id
        AND s.player_id = auth.uid()
    )
  );

-- Battles: both attacker and defender can read/modify their entries.
DROP POLICY IF EXISTS battles_participant_select ON battles;
CREATE POLICY battles_participant_select
  ON battles
  FOR SELECT
  USING (
    auth.uid() = attacker_id
    OR auth.uid() = defender_id
  );

DROP POLICY IF EXISTS battles_participant_modify ON battles;
CREATE POLICY battles_participant_modify
  ON battles
  FOR ALL
  USING (
    auth.uid() = attacker_id
    OR auth.uid() = defender_id
  )
  WITH CHECK (
    auth.uid() = attacker_id
    OR auth.uid() = defender_id
  );

COMMIT;

