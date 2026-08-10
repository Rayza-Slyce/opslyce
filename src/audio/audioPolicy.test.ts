import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUES,
  selectTransitionCue,
  shouldUseHqAmbience,
  type AudioSnapshot
} from './audioPolicy';

function snapshot(overrides: Partial<AudioSnapshot> = {}): AudioSnapshot {
  return {
    screen: 'mission-workspace',
    progression: 'operation-active-locate-message',
    activeEvidenceIds: [],
    ...overrides
  };
}

describe('audio policy', () => {
  it('keeps interaction cues inside the same bounded sound-effects package', () => {
    expect(AUDIO_CUES).toContain('ui-confirm');
    expect(AUDIO_CUES).toContain('byte-ping');
    expect(AUDIO_CUES).toContain('operation-closed');
    expect(AUDIO_CUES).toContain('deploy-operation');
  });

  it('maps story transitions to restrained semantic cues', () => {
    expect(
      selectTransitionCue(
        snapshot(),
        snapshot({ screen: 'welcome-transmission', progression: 'welcome-read' })
      )
    ).toBe('incoming-transmission');

    expect(
      selectTransitionCue(snapshot(), snapshot({ activeEvidenceIds: ['EV-001', 'EV-002'] }))
    ).toBe('evidence-recorded');

    expect(selectTransitionCue(snapshot(), snapshot({ progression: 'operation-verified' }))).toBe(
      'flag-verified'
    );

    expect(
      selectTransitionCue(
        snapshot({ progression: 'debrief' }),
        snapshot({ progression: 'recruit-operative' })
      )
    ).toBe('mission-complete');

    expect(
      selectTransitionCue(
        snapshot({ progression: 'recruit-operative' }),
        snapshot({ progression: 'anomaly-recorded', activeEvidenceIds: ['EV-005'] })
      )
    ).toBe('intrusion-anomaly');

    expect(
      selectTransitionCue(
        snapshot({ progression: 'incident-teaser-pending' }),
        snapshot({ progression: 'incident-teaser-received' })
      )
    ).toBe('incoming-transmission');

    expect(
      selectTransitionCue(
        snapshot({ progression: 'incident-teaser-read' }),
        snapshot({ progression: 'operation-completion' })
      )
    ).toBe('operation-closed');
  });

  it('does not replay a cue for a stable restored state', () => {
    const restored = snapshot({
      screen: 'dashboard',
      progression: 'operation-complete',
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005']
    });
    expect(selectTransitionCue(restored, restored)).toBeNull();
  });

  it('keeps the strongest simultaneous story cue instead of stacking evidence audio', () => {
    expect(
      selectTransitionCue(
        snapshot({ progression: 'verification-flag-recovered', activeEvidenceIds: ['EV-003'] }),
        snapshot({ progression: 'operation-verified', activeEvidenceIds: ['EV-003', 'EV-004'] })
      )
    ).toBe('flag-verified');

    expect(
      selectTransitionCue(
        snapshot({ progression: 'recruit-operative', activeEvidenceIds: ['EV-004'] }),
        snapshot({ progression: 'anomaly-recorded', activeEvidenceIds: ['EV-004', 'EV-005'] })
      )
    ).toBe('intrusion-anomaly');
  });

  it('uses ambience only on HQ-facing screens and pauses it for Settings', () => {
    expect(shouldUseHqAmbience('dashboard', false, 'welcome-read')).toBe(true);
    expect(shouldUseHqAmbience('welcome-transmission', false, 'welcome-read')).toBe(true);
    expect(shouldUseHqAmbience('mission-debrief', false, 'debrief')).toBe(true);
    expect(shouldUseHqAmbience('mission-workspace', false, 'welcome-read-in-terminal')).toBe(true);
    expect(shouldUseHqAmbience('dashboard', true, 'welcome-read')).toBe(false);
    expect(shouldUseHqAmbience('dashboard', false, 'anomaly-recorded')).toBe(false);
  });
});
