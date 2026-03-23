-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Vehicles table, keyed by Firestore document ID
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  type TEXT,
  status TEXT DEFAULT 'available',
  location GEOGRAPHY(POINT, 4326),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service zones with geographic boundaries
CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  priority_score INTEGER DEFAULT 1 CHECK (priority_score BETWEEN 1 AND 5),
  boundary GEOGRAPHY(MULTIPOLYGON, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON service_zones USING GIST (boundary);

-- Partial index for available vehicles (fast lookup during dispatch)
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON vehicles (status) WHERE status = 'available';

-- Enable RLS on service_zones and allow read access for anon role (control-room app)
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access on service_zones"
  ON service_zones FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on service_zones"
  ON service_zones FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on service_zones"
  ON service_zones FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on service_zones"
  ON service_zones FOR DELETE
  TO anon
  USING (true);

-- Allow service_role full access to vehicles (used by Cloud Functions)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access on vehicles"
  ON vehicles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
