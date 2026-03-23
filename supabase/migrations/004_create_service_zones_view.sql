-- View that returns service zone boundaries as GeoJSON text
-- PostgREST returns raw geography as hex EWKB which is not usable client-side
CREATE OR REPLACE VIEW service_zones_view AS
SELECT
  id,
  name,
  city,
  priority_score,
  ST_AsGeoJSON(boundary)::text AS boundary,
  created_at,
  updated_at
FROM service_zones;

-- Allow anon role to read the view
GRANT SELECT ON service_zones_view TO anon;
