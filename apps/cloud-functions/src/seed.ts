/**
 * Seed script for Firestore demo data.
 * Run: npx ts-node apps/cloud-functions/src/seed.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, writeBatch } from 'firebase/firestore';
import {
  DEMO_RESOURCES,
  DEMO_USERS,
  ESCALATION_RULES,
  DEMO_INCIDENTS,
  DEMO_SERVICE_ZONES,
} from './seed-data';

const useEmulator = process.env['VITE_USE_FIREBASE_EMULATOR'] === 'true';

const firebaseConfig = {
  projectId: process.env['VITE_FIREBASE_PROJECT_ID'],
  appId: process.env['VITE_FIREBASE_APP_ID'],
  storageBucket: process.env['VITE_FIREBASE_STORAGE_BUCKET'],
  apiKey: process.env['VITE_FIREBASE_API_KEY'],
  authDomain: process.env['VITE_FIREBASE_AUTH_DOMAIN'],
  messagingSenderId: process.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

if (useEmulator) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('Connected to Firestore emulator at localhost:8080');
}

async function seed() {
  console.log('Seeding Firestore demo data...');

  const batch = writeBatch(db);

  for (const resource of DEMO_RESOURCES) {
    batch.set(doc(db, 'resources', resource.unit_id), resource);
  }

  for (const user of DEMO_USERS) {
    batch.set(doc(db, 'users', user.uid), user);
  }

  for (const rule of ESCALATION_RULES) {
    batch.set(doc(db, 'escalation_rules', rule.rule_id), rule);
  }

  for (const incident of DEMO_INCIDENTS) {
    batch.set(doc(db, 'incidents', incident.incident_id), incident);
  }

  for (const zone of DEMO_SERVICE_ZONES) {
    const zoneId = `${zone.city.toLowerCase()}-${zone.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    batch.set(doc(db, 'service_zones', zoneId), {
      name: zone.name,
      city: zone.city,
      priority_score: zone.priority_score,
      sw_lat: zone.sw_lat,
      sw_lng: zone.sw_lng,
      ne_lat: zone.ne_lat,
      ne_lng: zone.ne_lng,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  await batch.commit();
  console.log(
    `Seeded: ${DEMO_INCIDENTS.length} incidents, ${DEMO_RESOURCES.length} resources, ${DEMO_USERS.length} users, ${ESCALATION_RULES.length} escalation rules, ${DEMO_SERVICE_ZONES.length} service zones`
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
