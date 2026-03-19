import type { Incident } from '@emergency-response/shared/data-models';
import {
  evaluateEscalation,
  DEFAULT_ESCALATION_RULES,
  getAlertPriorityForSeverity,
} from './util-escalation';

function makeIncident(
  overrides: Partial<Incident> = {}
): Incident {
  return {
    incident_id: 'inc-001',
    type: 'fire',
    severity: 'critical',
    status: 'reported',
    location: { lat: 37.77, lng: -122.42 },
    assigned_units: [],
    escalation_level: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('util-escalation', () => {
  describe('evaluateEscalation', () => {
    it('should notify and auto-dispatch on new critical incident', () => {
      const now = new Date();
      const incident = makeIncident({
        created_at: now.toISOString(),
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'notify', target_roles: ['supervisor'] }),
          expect.objectContaining({ type: 'auto_dispatch' }),
        ])
      );
    });

    it('should NOT auto-dispatch for high severity', () => {
      const now = new Date();
      const incident = makeIncident({
        severity: 'high',
        created_at: now.toISOString(),
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      expect(actions.find((a) => a.type === 'auto_dispatch')).toBeUndefined();
    });

    it('should escalate critical to manager after 2 min unacknowledged', () => {
      const now = new Date();
      const threeMinAgo = new Date(now.getTime() - 3 * 60_000);
      const incident = makeIncident({
        created_at: threeMinAgo.toISOString(),
        escalation_level: 0,
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      const escalateAction = actions.find((a) => a.type === 'escalate');
      expect(escalateAction).toBeDefined();
      expect(escalateAction!.target_roles).toContain('manager');
      expect(escalateAction!.new_escalation_level).toBe(2);
    });

    it('should escalate critical to director after 5 min unacknowledged', () => {
      const now = new Date();
      const sixMinAgo = new Date(now.getTime() - 6 * 60_000);
      const incident = makeIncident({
        created_at: sixMinAgo.toISOString(),
        escalation_level: 0,
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      const escalateAction = actions.find((a) => a.type === 'escalate');
      expect(escalateAction).toBeDefined();
      expect(escalateAction!.target_roles).toContain('director');
      expect(escalateAction!.new_escalation_level).toBe(3);
    });

    it('should NOT escalate already-escalated incidents past current level', () => {
      const now = new Date();
      const sixMinAgo = new Date(now.getTime() - 6 * 60_000);
      const incident = makeIncident({
        created_at: sixMinAgo.toISOString(),
        escalation_level: 3, // already at max
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      const escalateAction = actions.find((a) => a.type === 'escalate');
      expect(escalateAction).toBeUndefined();
    });

    it('should NOT escalate resolved incidents', () => {
      const now = new Date();
      const incident = makeIncident({
        status: 'resolved',
        created_at: new Date(now.getTime() - 10 * 60_000).toISOString(),
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      expect(actions).toHaveLength(0);
    });

    it('should NOT escalate acknowledged incidents', () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60_000);
      const incident = makeIncident({
        status: 'acknowledged',
        created_at: fiveMinAgo.toISOString(),
      });

      const actions = evaluateEscalation(
        incident,
        DEFAULT_ESCALATION_RULES,
        now
      );

      const escalateAction = actions.find((a) => a.type === 'escalate');
      expect(escalateAction).toBeUndefined();
    });

    it('should return empty actions if no matching rule', () => {
      const now = new Date();
      const incident = makeIncident({
        severity: 'critical',
        created_at: now.toISOString(),
      });

      const actions = evaluateEscalation(incident, [], now);
      expect(actions).toHaveLength(0);
    });
  });

  describe('getAlertPriorityForSeverity', () => {
    it('should map critical to urgent', () => {
      expect(getAlertPriorityForSeverity('critical')).toBe('urgent');
    });

    it('should map high to high', () => {
      expect(getAlertPriorityForSeverity('high')).toBe('high');
    });

    it('should map medium to normal', () => {
      expect(getAlertPriorityForSeverity('medium')).toBe('normal');
    });

    it('should map low to low', () => {
      expect(getAlertPriorityForSeverity('low')).toBe('low');
    });
  });

  describe('DEFAULT_ESCALATION_RULES', () => {
    it('should have rules for all 4 severity levels', () => {
      const severities = DEFAULT_ESCALATION_RULES.map((r) => r.severity);
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
      expect(severities).toContain('low');
    });
  });
});
