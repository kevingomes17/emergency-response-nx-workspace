/**
 * Seed script for demo data.
 * Run: npx ts-node apps/cloud-functions/src/seed.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, writeBatch } from 'firebase/firestore';

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

const DEMO_RESOURCES = [
  {
    unit_id: 'ft-001',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 37.7749, lng: -122.4194 },
    capacity: 6,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'ft-002',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 37.785, lng: -122.409 },
    capacity: 6,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'amb-001',
    type: 'ambulance',
    status: 'available',
    location: { lat: 37.77, lng: -122.43 },
    capacity: 4,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'pol-001',
    type: 'police',
    status: 'available',
    location: { lat: 37.78, lng: -122.41 },
    capacity: 2,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'mnt-001',
    type: 'maintenance',
    status: 'available',
    location: { lat: 37.76, lng: -122.44 },
    capacity: 3,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'elc-001',
    type: 'electrician',
    status: 'available',
    location: { lat: 37.79, lng: -122.40 },
    capacity: 2,
    last_updated: new Date().toISOString(),
  },
];

const DEMO_USERS = [
  { uid: 'dispatcher-001', display_name: 'Jane Smith', role: 'dispatcher', fcm_tokens: [] as string[], is_active: true },
  { uid: 'supervisor-001', display_name: 'Mike Johnson', role: 'supervisor', fcm_tokens: [] as string[], is_active: true },
  { uid: 'manager-001', display_name: 'Sarah Wilson', role: 'manager', fcm_tokens: [] as string[], is_active: true },
  { uid: 'director-001', display_name: 'Robert Brown', role: 'director', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-001', display_name: 'Alex Davis', role: 'responder', assigned_unit: 'ft-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-002', display_name: 'Chris Lee', role: 'responder', assigned_unit: 'ft-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-003', display_name: 'Sam Rivera', role: 'responder', assigned_unit: 'amb-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-004', display_name: 'Pat Morgan', role: 'responder', assigned_unit: 'pol-001', fcm_tokens: [] as string[], is_active: true },
];

const ESCALATION_RULES = [
  {
    rule_id: 'rule-critical',
    severity: 'critical',
    auto_dispatch: true,
    notify_roles: ['supervisor'],
    escalation_thresholds: [
      { minutes_unacknowledged: 2, escalate_to: 'manager', new_escalation_level: 2 },
      { minutes_unacknowledged: 5, escalate_to: 'director', new_escalation_level: 3 },
    ],
  },
  {
    rule_id: 'rule-high',
    severity: 'high',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      { minutes_unacknowledged: 5, escalate_to: 'supervisor', new_escalation_level: 1 },
      { minutes_unacknowledged: 10, escalate_to: 'manager', new_escalation_level: 2 },
    ],
  },
  {
    rule_id: 'rule-medium',
    severity: 'medium',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      { minutes_unacknowledged: 15, escalate_to: 'supervisor', new_escalation_level: 1 },
    ],
  },
  {
    rule_id: 'rule-low',
    severity: 'low',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      { minutes_unacknowledged: 30, escalate_to: 'supervisor', new_escalation_level: 1 },
    ],
  },
];

const DEMO_INCIDENTS = [
  {
    incident_id: 'inc-001',
    type: 'fire',
    severity: 'critical',
    status: 'dispatched',
    location: { lat: 37.7749, lng: -122.4194 },
    description: 'Building fire on 3rd floor, smoke visible',
    reported_by: 'sensor-a1',
    assigned_units: ['ft-001'],
    escalation_level: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    incident_id: 'inc-002',
    type: 'medical',
    severity: 'high',
    status: 'dispatched',
    location: { lat: 37.785, lng: -122.409 },
    description: 'Person collapsed in lobby, unresponsive',
    reported_by: 'security-cam-b2',
    assigned_units: ['amb-001'],
    escalation_level: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    incident_id: 'inc-003',
    type: 'water_leakage',
    severity: 'medium',
    status: 'acknowledged',
    location: { lat: 37.76, lng: -122.44 },
    description: 'Pipe burst in basement, water spreading',
    reported_by: 'maintenance-sensor',
    assigned_units: ['mnt-001'],
    escalation_level: 0,
    created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    incident_id: 'inc-004',
    type: 'security',
    severity: 'low',
    status: 'reported',
    location: { lat: 37.79, lng: -122.40 },
    description: 'Unauthorized access attempt at gate C',
    reported_by: 'guard-post-c',
    assigned_units: [] as string[],
    escalation_level: 0,
    created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seed() {
  console.log('Seeding demo data...');

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

  await batch.commit();
  console.log(
    `Seeded: ${DEMO_INCIDENTS.length} incidents, ${DEMO_RESOURCES.length} resources, ${DEMO_USERS.length} users, ${ESCALATION_RULES.length} escalation rules`
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
