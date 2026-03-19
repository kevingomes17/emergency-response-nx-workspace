import type { IncidentType, Severity } from '@emergency-response/shared/data-models';

interface SeverityInput {
  type: IncidentType;
  casualties?: number;
  affectedArea?: 'small' | 'medium' | 'large';
  hazardousMaterials?: boolean;
  structuralDamage?: boolean;
}

const SEVERITY_SCORES: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const BASE_SCORES: Record<IncidentType, number> = {
  fire: 3,
  medical: 2,
  security: 2,
  water_leakage: 1,
  power_failure: 1,
};

export function scoreSeverity(input: SeverityInput): Severity {
  let score = BASE_SCORES[input.type];

  if (input.casualties && input.casualties > 0) {
    score += input.casualties >= 5 ? 3 : input.casualties >= 1 ? 2 : 0;
  }

  if (input.affectedArea === 'large') score += 2;
  else if (input.affectedArea === 'medium') score += 1;

  if (input.hazardousMaterials) score += 2;
  if (input.structuralDamage) score += 1;

  if (score >= 7) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function severityToScore(severity: Severity): number {
  return SEVERITY_SCORES[severity];
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_SCORES[b] - SEVERITY_SCORES[a];
}

export function isHigherOrEqualSeverity(
  severity: Severity,
  threshold: Severity
): boolean {
  return SEVERITY_SCORES[severity] >= SEVERITY_SCORES[threshold];
}
