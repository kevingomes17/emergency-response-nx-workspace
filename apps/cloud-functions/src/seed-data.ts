/**
 * Shared seed data constants for both Firestore and Supabase.
 * All vehicles, incidents, and service zones are in Pune, India.
 */

// ── Resources / Vehicles ─────────────────────────────────

export const DEMO_RESOURCES = [
  {
    unit_id: 'ft-001',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 18.5308, lng: 73.8475 }, // Shivajinagar
    capacity: 6,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'ft-002',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 18.5912, lng: 73.7389 }, // Hinjewadi
    capacity: 6,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'amb-001',
    type: 'ambulance',
    status: 'available',
    location: { lat: 18.5074, lng: 73.8077 }, // Kothrud
    capacity: 4,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'pol-001',
    type: 'police',
    status: 'available',
    location: { lat: 18.4988, lng: 73.9402 }, // Hadapsar
    capacity: 2,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'mnt-001',
    type: 'maintenance',
    status: 'available',
    location: { lat: 18.5120, lng: 73.8150 }, // Kothrud
    capacity: 3,
    last_updated: new Date().toISOString(),
  },
  {
    unit_id: 'elc-001',
    type: 'electrician',
    status: 'available',
    location: { lat: 18.5010, lng: 73.9450 }, // Hadapsar
    capacity: 2,
    last_updated: new Date().toISOString(),
  },
];

// ── Users ────────────────────────────────────────────────

export const DEMO_USERS = [
  { uid: 'dispatcher-001', display_name: 'Jane Smith', role: 'dispatcher', fcm_tokens: [] as string[], is_active: true },
  { uid: 'supervisor-001', display_name: 'Mike Johnson', role: 'supervisor', fcm_tokens: [] as string[], is_active: true },
  { uid: 'manager-001', display_name: 'Sarah Wilson', role: 'manager', fcm_tokens: [] as string[], is_active: true },
  { uid: 'director-001', display_name: 'Robert Brown', role: 'director', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-001', display_name: 'Alex Davis', role: 'responder', assigned_unit: 'ft-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-002', display_name: 'Chris Lee', role: 'responder', assigned_unit: 'ft-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-003', display_name: 'Sam Rivera', role: 'responder', assigned_unit: 'amb-001', fcm_tokens: [] as string[], is_active: true },
  { uid: 'responder-004', display_name: 'Pat Morgan', role: 'responder', assigned_unit: 'pol-001', fcm_tokens: [] as string[], is_active: true },
];

// ── Escalation Rules ─────────────────────────────────────

export const ESCALATION_RULES = [
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

// ── Incidents ────────────────────────────────────────────

export const DEMO_INCIDENTS = [
  {
    incident_id: 'inc-001',
    type: 'fire',
    severity: 'critical',
    status: 'dispatched',
    location: { lat: 18.5320, lng: 73.8500 }, // Shivajinagar
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
    location: { lat: 18.5100, lng: 73.8100 }, // Kothrud
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
    location: { lat: 18.5900, lng: 73.7350 }, // Hinjewadi
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
    location: { lat: 18.5000, lng: 73.9420 }, // Hadapsar
    description: 'Unauthorized access attempt at gate C',
    reported_by: 'guard-post-c',
    assigned_units: [] as string[],
    escalation_level: 0,
    created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ── Service Zones ────────────────────────────────────────

export interface SeedServiceZone {
  name: string;
  city: string;
  priority_score: number;
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

export const DEMO_SERVICE_ZONES: SeedServiceZone[] = [
  { name: 'Shivajinagar', city: 'Pune', priority_score: 3, sw_lat: 18.525, sw_lng: 73.840, ne_lat: 18.540, ne_lng: 73.860 },
  { name: 'Hinjewadi', city: 'Pune', priority_score: 2, sw_lat: 18.580, sw_lng: 73.720, ne_lat: 18.600, ne_lng: 73.750 },
  { name: 'Kothrud', city: 'Pune', priority_score: 2, sw_lat: 18.500, sw_lng: 73.800, ne_lat: 18.520, ne_lng: 73.820 },
  { name: 'Hadapsar', city: 'Pune', priority_score: 1, sw_lat: 18.490, sw_lng: 73.930, ne_lat: 18.510, ne_lng: 73.960 },
];
