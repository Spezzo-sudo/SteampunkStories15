-- Extends the shipyard queue to support quantities and a queued/cancelled lifecycle.

ALTER TABLE shipyard_queue
  ADD COLUMN IF NOT EXISTS ship_quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE shipyard_queue
  ADD CONSTRAINT IF NOT EXISTS shipyard_queue_quantity_positive CHECK (ship_quantity > 0);

ALTER TABLE shipyard_queue
  DROP CONSTRAINT IF EXISTS valid_shipyard_status;

ALTER TABLE shipyard_queue
  ADD CONSTRAINT valid_shipyard_status CHECK (status IN ('queued', 'building', 'completed', 'cancelled'));

ALTER TABLE shipyard_queue
  ALTER COLUMN status SET DEFAULT 'queued';

UPDATE shipyard_queue
SET status = 'queued'
WHERE status = 'building';
