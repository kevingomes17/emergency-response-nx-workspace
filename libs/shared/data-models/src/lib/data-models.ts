// ── Incident ──────────────────────────────────────────────

export type IncidentType =
  | 'fire'
  | 'medical'
  | 'security'
  | 'water_leakage'
  | 'power_failure';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'reported'
  | 'acknowledged'
  | 'dispatched'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Incident {
  incident_id: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  location: GeoLocation;
  description?: string;
  reported_by?: string;
  assigned_units: string[];
  escalation_level: number; // 0=none, 1=supervisor, 2=manager, 3=director
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

// ── Resource ─────────────────────────────────────────────

export type ResourceType =
  | 'ambulance'
  | 'fire_truck'
  | 'police'
  | 'maintenance'
  | 'electrician';

export type ResourceStatus =
  | 'available'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'offline';

export interface Resource {
  unit_id: string;
  type: ResourceType;
  status: ResourceStatus;
  location: GeoLocation;
  capacity: number;
  assigned_incident?: string;
  last_updated: string;
}

// ── Alert ────────────────────────────────────────────────

export type AlertChannel = 'push' | 'in_app';
export type AlertPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Alert {
  alert_id: string;
  incident_id: string;
  target_user_ids: string[];
  target_roles: string[];
  channel: AlertChannel;
  priority: AlertPriority;
  title: string;
  body: string;
  acknowledged: boolean;
  created_at: string;
}

// ── User ─────────────────────────────────────────────────

export type UserRole =
  | 'dispatcher'
  | 'responder'
  | 'supervisor'
  | 'manager'
  | 'director'
  | 'admin';

export interface User {
  uid: string;
  display_name: string;
  role: UserRole;
  assigned_unit?: string; // resource unit_id this user operates
  fcm_tokens: string[];
  is_active: boolean;
}

// ── Escalation Rule ──────────────────────────────────────

export interface EscalationThreshold {
  minutes_unacknowledged: number;
  escalate_to: UserRole;
  new_escalation_level: number;
}

export interface EscalationRule {
  rule_id: string;
  severity: Severity;
  auto_dispatch: boolean;
  notify_roles: UserRole[];
  escalation_thresholds: EscalationThreshold[];
}

// ── Escalation Action (output of evaluateEscalation) ─────

export type EscalationActionType = 'notify' | 'auto_dispatch' | 'escalate';

export interface EscalationAction {
  type: EscalationActionType;
  target_roles: UserRole[];
  new_escalation_level?: number;
  reason: string;
}

// ── Resource-to-Incident type mapping ────────────────────

export const INCIDENT_RESOURCE_MAP: Record<IncidentType, ResourceType> = {
  fire: 'fire_truck',
  medical: 'ambulance',
  security: 'police',
  water_leakage: 'maintenance',
  power_failure: 'electrician',
};

// ── Firestore collection paths ──────────────────────────

export const COLLECTIONS = {
  INCIDENTS: 'incidents',
  RESOURCES: 'resources',
  ALERTS: 'alerts',
  USERS: 'users',
  ESCALATION_RULES: 'escalation_rules',
} as const;
