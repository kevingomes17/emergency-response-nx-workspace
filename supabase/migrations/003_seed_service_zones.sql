-- Seed service zones for Pune (India)

INSERT INTO service_zones (name, city, priority_score, boundary) VALUES
  (
    'Shivajinagar',
    'Pune',
    3,
    ST_GeogFromText('SRID=4326;MULTIPOLYGON(((73.840 18.525, 73.840 18.540, 73.860 18.540, 73.860 18.525, 73.840 18.525)))')
  ),
  (
    'Hinjewadi',
    'Pune',
    2,
    ST_GeogFromText('SRID=4326;MULTIPOLYGON(((73.720 18.580, 73.720 18.600, 73.750 18.600, 73.750 18.580, 73.720 18.580)))')
  ),
  (
    'Kothrud',
    'Pune',
    2,
    ST_GeogFromText('SRID=4326;MULTIPOLYGON(((73.800 18.500, 73.800 18.520, 73.820 18.520, 73.820 18.500, 73.800 18.500)))')
  ),
  (
    'Hadapsar',
    'Pune',
    1,
    ST_GeogFromText('SRID=4326;MULTIPOLYGON(((73.930 18.490, 73.930 18.510, 73.960 18.510, 73.960 18.490, 73.930 18.490)))')
  );
