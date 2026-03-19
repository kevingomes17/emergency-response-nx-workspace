import {
  scoreSeverity,
  severityToScore,
  compareSeverity,
  isHigherOrEqualSeverity,
} from './util-severity';

describe('util-severity', () => {
  describe('scoreSeverity', () => {
    it('should rate a basic fire as medium', () => {
      expect(scoreSeverity({ type: 'fire' })).toBe('medium');
    });

    it('should rate fire with casualties as critical', () => {
      expect(
        scoreSeverity({ type: 'fire', casualties: 5, affectedArea: 'large' })
      ).toBe('critical');
    });

    it('should rate fire with hazardous materials as high or above', () => {
      const result = scoreSeverity({
        type: 'fire',
        hazardousMaterials: true,
      });
      expect(['high', 'critical']).toContain(result);
    });

    it('should rate basic water leakage as low', () => {
      expect(scoreSeverity({ type: 'water_leakage' })).toBe('low');
    });

    it('should rate power failure with large affected area as medium', () => {
      expect(
        scoreSeverity({ type: 'power_failure', affectedArea: 'large' })
      ).toBe('medium');
    });

    it('should rate medical with multiple casualties as high', () => {
      expect(
        scoreSeverity({ type: 'medical', casualties: 2, affectedArea: 'medium' })
      ).toBe('high');
    });

    it('should rate security with structural damage as medium', () => {
      expect(
        scoreSeverity({ type: 'security', structuralDamage: true })
      ).toBe('medium');
    });
  });

  describe('severityToScore', () => {
    it('should return 4 for critical', () => {
      expect(severityToScore('critical')).toBe(4);
    });

    it('should return 1 for low', () => {
      expect(severityToScore('low')).toBe(1);
    });
  });

  describe('compareSeverity', () => {
    it('should sort critical before low (negative = a first)', () => {
      expect(compareSeverity('critical', 'low')).toBeLessThan(0);
    });

    it('should return 0 for equal severities', () => {
      expect(compareSeverity('high', 'high')).toBe(0);
    });
  });

  describe('isHigherOrEqualSeverity', () => {
    it('should return true when severity meets threshold', () => {
      expect(isHigherOrEqualSeverity('critical', 'high')).toBe(true);
    });

    it('should return false when severity is below threshold', () => {
      expect(isHigherOrEqualSeverity('low', 'high')).toBe(false);
    });

    it('should return true when equal', () => {
      expect(isHigherOrEqualSeverity('medium', 'medium')).toBe(true);
    });
  });
});
