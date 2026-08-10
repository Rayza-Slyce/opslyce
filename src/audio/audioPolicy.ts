import type { GameEngineState, GameScreen } from '../engine/gameEngine';
import type { Ops001Progression } from '../profile/localProfile';

export const AUDIO_CUES = [
  'incoming-transmission',
  'evidence-recorded',
  'flag-verified',
  'mission-complete',
  'operation-closed',
  'deploy-operation',
  'intrusion-anomaly',
  'ui-confirm',
  'byte-ping'
] as const;

export type AudioCue = (typeof AUDIO_CUES)[number];

export type AudioSnapshot = Readonly<{
  screen: GameScreen;
  progression: Ops001Progression | null;
  activeEvidenceIds: readonly string[];
}>;

export function createAudioSnapshot(state: GameEngineState): AudioSnapshot {
  return {
    screen: state.screen,
    progression: state.profile?.progression ?? null,
    activeEvidenceIds: state.profile?.activeCheckpoint?.activeEvidenceIds ?? []
  };
}

export function selectTransitionCue(
  previous: AudioSnapshot,
  current: AudioSnapshot
): AudioCue | null {
  if (current.progression === 'anomaly-recorded' && previous.progression !== 'anomaly-recorded') {
    return 'intrusion-anomaly';
  }

  if (
    current.progression === 'operation-verified' &&
    previous.progression !== 'operation-verified'
  ) {
    return 'flag-verified';
  }

  if (current.progression === 'recruit-operative' && previous.progression !== 'recruit-operative') {
    return 'mission-complete';
  }

  if (
    current.progression === 'operation-completion' &&
    previous.progression !== 'operation-completion'
  ) {
    return 'operation-closed';
  }

  if (
    current.progression === 'incident-teaser-received' &&
    previous.progression !== 'incident-teaser-received'
  ) {
    return 'incoming-transmission';
  }

  if (current.screen === 'welcome-transmission' && previous.screen !== 'welcome-transmission') {
    return 'incoming-transmission';
  }

  if (current.activeEvidenceIds.length > previous.activeEvidenceIds.length) {
    return 'evidence-recorded';
  }

  return null;
}

const HQ_AMBIENCE_SCREENS = new Set<GameScreen>([
  'codename-registration',
  'dashboard',
  'welcome-transmission',
  'mission-briefing',
  'mission-debrief',
  'mission-workspace',
  'field-manual'
]);

export function shouldUseHqAmbience(
  screen: GameScreen,
  settingsOpen: boolean,
  progression: Ops001Progression | null
): boolean {
  return !settingsOpen && progression !== 'anomaly-recorded' && HQ_AMBIENCE_SCREENS.has(screen);
}
