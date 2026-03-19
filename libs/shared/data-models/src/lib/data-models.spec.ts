import {
  Incident,
  Resource,
  Alert,
  User,
  COLLECTIONS,
  INCIDENT_RESOURCE_MAP,
} from './data-models';

describe('data-models', () => {
  it('should create a valid Incident', () => {
    const incident: Incident = {
      incident_id: 'inc-001',
      type: 'fire',
      severity: 'critical',
      status: 'reported',
      location: { lat: 37.7749, lng: -122.4194 },
      description: 'Building fire on 3rd floor',
      assigned_units: [],
      escalation_level: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(incident.type).toBe('fire');
    expect(incident.severity).toBe('critical');
    expect(incident.escalation_level).toBe(0);
  });

  it('should create a valid Resource', () => {
    const resource: Resource = {
      unit_id: 'ft-001',
      type: 'fire_truck',
      status: 'available',
      location: { lat: 37.78, lng: -122.42 },
      capacity: 6,
      last_updated: new Date().toISOString(),
    };
    expect(resource.type).toBe('fire_truck');
    expect(resource.status).toBe('available');
  });

  it('should create a valid Alert', () => {
    const alert: Alert = {
      alert_id: 'alt-001',
      incident_id: 'inc-001',
      target_user_ids: [],
      target_roles: ['supervisor'],
      channel: 'push',
      priority: 'urgent',
      title: 'Critical fire incident',
      body: 'Building fire reported at downtown',
      acknowledged: false,
      created_at: new Date().toISOString(),
    };
    expect(alert.priority).toBe('urgent');
    expect(alert.acknowledged).toBe(false);
  });

  it('should create a valid User', () => {
    const user: User = {
      uid: 'user-001',
      display_name: 'John Doe',
      role: 'dispatcher',
      fcm_tokens: [],
      is_active: true,
    };
    expect(user.role).toBe('dispatcher');
  });

  it('should have correct collection paths', () => {
    expect(COLLECTIONS.INCIDENTS).toBe('incidents');
    expect(COLLECTIONS.RESOURCES).toBe('resources');
    expect(COLLECTIONS.ALERTS).toBe('alerts');
    expect(COLLECTIONS.USERS).toBe('users');
    expect(COLLECTIONS.ESCALATION_RULES).toBe('escalation_rules');
  });

  it('should map incident types to resource types', () => {
    expect(INCIDENT_RESOURCE_MAP['fire']).toBe('fire_truck');
    expect(INCIDENT_RESOURCE_MAP['medical']).toBe('ambulance');
    expect(INCIDENT_RESOURCE_MAP['security']).toBe('police');
    expect(INCIDENT_RESOURCE_MAP['water_leakage']).toBe('maintenance');
    expect(INCIDENT_RESOURCE_MAP['power_failure']).toBe('electrician');
  });
});
