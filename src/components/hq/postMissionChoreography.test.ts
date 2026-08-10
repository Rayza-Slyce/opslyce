import {
  anomalyPresentationDelay,
  incidentArrivalDelay,
  nextAnomalyPresentationPhase,
  promotionPresentationDelay
} from './postMissionChoreography';

describe('post-mission choreography', () => {
  it('keeps authored beats ordered and gives capture and reactions deliberate holds', () => {
    expect(nextAnomalyPresentationPhase('detecting')).toBe('captured');
    expect(nextAnomalyPresentationPhase('captured')).toBe('trace-failed');
    expect(nextAnomalyPresentationPhase('trace-failed')).toBe('byte-reaction');
    expect(nextAnomalyPresentationPhase('byte-reaction')).toBe('patch-reaction');
    expect(nextAnomalyPresentationPhase('patch-reaction')).toBeNull();

    expect(promotionPresentationDelay(false)).toBeGreaterThan(
      anomalyPresentationDelay('detecting', false)
    );
    expect(anomalyPresentationDelay('captured', false)).toBeGreaterThan(
      anomalyPresentationDelay('detecting', false)
    );
    expect(anomalyPresentationDelay('patch-reaction', false)).toBeGreaterThan(
      anomalyPresentationDelay('byte-reaction', false)
    );
  });

  it('reduces motion duration while retaining non-zero sequential breathing room', () => {
    for (const phase of [
      'detecting',
      'captured',
      'trace-failed',
      'byte-reaction',
      'patch-reaction'
    ] as const) {
      expect(anomalyPresentationDelay(phase, true)).toBeGreaterThan(0);
      expect(anomalyPresentationDelay(phase, true)).toBeLessThan(
        anomalyPresentationDelay(phase, false)
      );
    }
    expect(promotionPresentationDelay(true)).toBeGreaterThan(0);
    expect(incidentArrivalDelay(true)).toBeGreaterThan(0);
    expect(incidentArrivalDelay(true)).toBeLessThan(incidentArrivalDelay(false));
  });
});
