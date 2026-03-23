/**
 * Seed script for Supabase (vehicles + service zones).
 * Run: npx ts-node apps/cloud-functions/src/seed-supabase.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { DEMO_RESOURCES, DEMO_SERVICE_ZONES } from './seed-data';

const SUPABASE_URL = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedVehicles() {
  const vehicles = DEMO_RESOURCES.map((r) => ({
    id: r.unit_id,
    type: r.type,
    status: r.status,
    location: `POINT(${r.location.lng} ${r.location.lat})`,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('vehicles')
    .upsert(vehicles, { onConflict: 'id' });

  if (error) throw new Error(`Failed to seed vehicles: ${error.message}`);
  console.log(`Seeded ${vehicles.length} vehicles to Supabase`);
}

async function seedServiceZones() {
  const zones = DEMO_SERVICE_ZONES.map((z) => ({
    name: z.name,
    city: z.city,
    priority_score: z.priority_score,
    boundary:
      `SRID=4326;MULTIPOLYGON(((` +
      `${z.sw_lng} ${z.sw_lat}, ` +
      `${z.sw_lng} ${z.ne_lat}, ` +
      `${z.ne_lng} ${z.ne_lat}, ` +
      `${z.ne_lng} ${z.sw_lat}, ` +
      `${z.sw_lng} ${z.sw_lat}` +
      `)))`,
  }));

  const { error } = await supabase.from('service_zones').insert(zones);

  if (error) throw new Error(`Failed to seed service zones: ${error.message}`);
  console.log(`Seeded ${zones.length} service zones to Supabase`);
}

async function seed() {
  console.log('Seeding Supabase...');
  await seedVehicles();
  await seedServiceZones();
  console.log('Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
