import type {
  Incident,
  EscalationRule,
  EscalationAction,
  EscalationThreshold,
  Severity,
  UserRole,
} from '@emergency-response/shared/data-models';

export function evaluateEscalation(
  incident: Incident,
  rules: EscalationRule[],
  now: Date
): EscalationAction[] {
  const rule = rules.find((r) => r.severity === incident.severity);
  if (!rule) return [];

  // Don't escalate resolved/closed incidents
  if (incident.status === 'resolved' || incident.status === 'closed') {
    return [];
  }

  const actions: EscalationAction[] = [];
  const createdAt = new Date(incident.created_at);
  const minutesElapsed = (now.getTime() - createdAt.getTime()) / 60_000;

  // Initial notification on creation (within first minute)
  if (minutesElapsed < 1 && incident.escalation_level === 0) {
    actions.push({
      type: 'notify',
      target_roles: rule.notify_roles,
      reason: `New ${incident.severity} ${incident.type} incident reported`,
    });

    if (rule.auto_dispatch) {
      actions.push({
        type: 'auto_dispatch',
        target_roles: ['responder'],
        reason: `Auto-dispatch triggered for ${incident.severity} severity`,
      });
    }
  }

  // Time-based escalation for unacknowledged incidents
  if (incident.status === 'reported') {
    const applicableThresholds = rule.escalation_thresholds
      .filter(
        (t) =>
          minutesElapsed >= t.minutes_unacknowledged &&
          t.new_escalation_level > incident.escalation_level
      )
      .sort((a, b) => b.new_escalation_level - a.new_escalation_level);

    if (applicableThresholds.length > 0) {
      const highest = applicableThresholds[0];
      actions.push({
        type: 'escalate',
        target_roles: [highest.escalate_to],
        new_escalation_level: highest.new_escalation_level,
        reason: `Unacknowledged for ${Math.floor(minutesElapsed)} min — escalating to ${highest.escalate_to}`,
      });
    }
  }

  return actions;
}

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    rule_id: 'rule-critical',
    severity: 'critical',
    auto_dispatch: true,
    notify_roles: ['supervisor'],
    escalation_thresholds: [
      {
        minutes_unacknowledged: 2,
        escalate_to: 'manager',
        new_escalation_level: 2,
      },
      {
        minutes_unacknowledged: 5,
        escalate_to: 'director',
        new_escalation_level: 3,
      },
    ],
  },
  {
    rule_id: 'rule-high',
    severity: 'high',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      {
        minutes_unacknowledged: 5,
        escalate_to: 'supervisor',
        new_escalation_level: 1,
      },
      {
        minutes_unacknowledged: 10,
        escalate_to: 'manager',
        new_escalation_level: 2,
      },
    ],
  },
  {
    rule_id: 'rule-medium',
    severity: 'medium',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      {
        minutes_unacknowledged: 15,
        escalate_to: 'supervisor',
        new_escalation_level: 1,
      },
    ],
  },
  {
    rule_id: 'rule-low',
    severity: 'low',
    auto_dispatch: false,
    notify_roles: ['dispatcher'],
    escalation_thresholds: [
      {
        minutes_unacknowledged: 30,
        escalate_to: 'supervisor',
        new_escalation_level: 1,
      },
    ],
  },
];

export function getAlertPriorityForSeverity(
  severity: Severity
): 'urgent' | 'high' | 'normal' | 'low' {
  switch (severity) {
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'medium':
      return 'normal';
    case 'low':
      return 'low';
  }
}
