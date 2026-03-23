-- Smart dispatch function: finds nearest available vehicle with boundary-crossing penalty
CREATE OR REPLACE FUNCTION calculate_dispatch(
  inc_lat FLOAT,
  inc_lng FLOAT,
  resource_type TEXT DEFAULT NULL,
  penalty_meters FLOAT DEFAULT 5000
)
RETURNS TABLE (vehicle_id TEXT, distance_meters FLOAT, weighted_cost FLOAT)
LANGUAGE sql STABLE
AS $$
  WITH incident_point AS (
    SELECT ST_SetSRID(ST_MakePoint(inc_lng, inc_lat), 4326)::geography AS geog
  ),
  incident_zone AS (
    SELECT id AS zone_id
    FROM service_zones, incident_point
    WHERE ST_Intersects(boundary, incident_point.geog)
    LIMIT 1
  )
  SELECT
    v.id AS vehicle_id,
    ST_Distance(v.location, ip.geog)::FLOAT AS distance_meters,
    (ST_Distance(v.location, ip.geog) +
      CASE
        -- No zone found for incident location -> no penalty
        WHEN iz.zone_id IS NULL THEN 0
        -- Vehicle is NOT in the same zone as incident -> apply penalty
        WHEN NOT EXISTS (
          SELECT 1 FROM service_zones sz
          WHERE sz.id = iz.zone_id
          AND ST_Intersects(sz.boundary, v.location)
        ) THEN penalty_meters
        -- Vehicle IS in the same zone -> no penalty
        ELSE 0
      END
    )::FLOAT AS weighted_cost
  FROM vehicles v
  CROSS JOIN incident_point ip
  LEFT JOIN incident_zone iz ON TRUE
  WHERE v.status = 'available'
    AND (resource_type IS NULL OR v.type = resource_type)
  ORDER BY weighted_cost ASC;
$$;
