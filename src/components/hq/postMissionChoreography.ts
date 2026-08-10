export const ANOMALY_PRESENTATION_PHASES = [
  'detecting',
  'captured',
  'trace-failed',
  'byte-reaction',
  'patch-reaction'
] as const;

export type AnomalyPresentationPhase = (typeof ANOMALY_PRESENTATION_PHASES)[number];

const nextPhase: Readonly<Record<AnomalyPresentationPhase, AnomalyPresentationPhase | null>> = {
  detecting: 'captured',
  captured: 'trace-failed',
  'trace-failed': 'byte-reaction',
  'byte-reaction': 'patch-reaction',
  'patch-reaction': null
};

const standardDelay: Readonly<Record<AnomalyPresentationPhase, number>> = {
  detecting: 1200,
  captured: 2400,
  'trace-failed': 1900,
  'byte-reaction': 2700,
  'patch-reaction': 3600
};

const reducedDelay: Readonly<Record<AnomalyPresentationPhase, number>> = {
  detecting: 700,
  captured: 1200,
  'trace-failed': 1000,
  'byte-reaction': 1600,
  'patch-reaction': 2200
};

export function nextAnomalyPresentationPhase(
  phase: AnomalyPresentationPhase
): AnomalyPresentationPhase | null {
  return nextPhase[phase];
}

export function anomalyPresentationDelay(
  phase: AnomalyPresentationPhase,
  reducedMotion: boolean
): number {
  return (reducedMotion ? reducedDelay : standardDelay)[phase];
}

export function promotionPresentationDelay(reducedMotion: boolean): number {
  return reducedMotion ? 1400 : 2500;
}

export function incidentArrivalDelay(reducedMotion: boolean): number {
  return reducedMotion ? 500 : 900;
}
