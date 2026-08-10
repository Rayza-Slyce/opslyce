import {
  createOps001ActiveCheckpoint,
  type LocalOperativeProfile,
  type LocalSaveData,
  MISSION_CONTROL_INPUT_LIMIT,
  type HintLevel,
  type Ops001HintId,
  type Ops001ActiveCheckpoint,
  type Ops001Progression,
  type PreparationSource,
  type WorkspaceTool,
  isRestartableOps001Progression
} from '../profile/localProfile';
import {
  interpretTerminalCommand,
  TERMINAL_INPUT_LIMIT,
  type TerminalSubmissionProvenance
} from '../simulations/terminal/interpreter';
import { applyStage7TerminalExecution, appendUnique } from './stage7Progression';
import { applyBrowserNavigation, browserNavigationResultFor } from './stage8Progression';
import { OPS001_VERIFICATION_FLAG } from '../missions/ops001/browserContent';
import {
  clearObsoleteErrorStreak,
  recordRelatedError,
  resolveOps001HintContext,
  revealHintLevel,
  applyHintAssist
} from './stage9Guidance';
import { validateOps001Flag } from './flagValidator';

export type GameScreen =
  | 'title'
  | 'resume-summary'
  | 'codename-registration'
  | 'dashboard'
  | 'welcome-transmission'
  | 'mission-briefing'
  | 'mission-workspace'
  | 'mission-debrief'
  | 'field-manual';

export type PersistentProgressionCommand =
  | Readonly<{ type: 'communications/open-welcome' }>
  | Readonly<{ type: 'communications/return-dashboard' }>
  | Readonly<{ type: 'operation/open' }>
  | Readonly<{ type: 'operation/deploy' }>
  | Readonly<{ type: 'operation/restart-current' }>
  | Readonly<{ type: 'workspace/select-tool'; tool: WorkspaceTool }>
  | Readonly<{
      type: 'terminal/submit-command';
      input: string;
      provenance: TerminalSubmissionProvenance;
    }>
  | Readonly<{
      type: 'terminal/prepare-command';
      value: string;
      source: PreparationSource;
    }>
  | Readonly<{ type: 'terminal/clear-prepared-command' }>
  | Readonly<{ type: 'byte/dismiss-notice' }>
  | Readonly<{ type: 'byte/reveal-hint'; hintId: Ops001HintId; level: HintLevel }>
  | Readonly<{ type: 'byte/use-assist'; hintId: Ops001HintId }>
  | Readonly<{ type: 'evidence/prepare-mission-control' }>
  | Readonly<{ type: 'browser/clear-prepared-route' }>
  | Readonly<{ type: 'browser/open-route'; input: string }>
  | Readonly<{ type: 'browser/home' }>
  | Readonly<{ type: 'browser/back' }>
  | Readonly<{ type: 'mission-control/update-input'; value: string }>
  | Readonly<{ type: 'mission-control/submit' }>
  | Readonly<{ type: 'operation/enter-debrief' }>
  | Readonly<{ type: 'debrief/return-hq' }>
  | Readonly<{ type: 'hq/record-anomaly' }>
  | Readonly<{ type: 'hq/settle-anomaly-reactions' }>
  | Readonly<{ type: 'hq/complete-evidence-review' }>
  | Readonly<{ type: 'hq/deliver-incident-teaser' }>
  | Readonly<{ type: 'hq/read-incident-teaser' }>
  | Readonly<{ type: 'hq/present-operation-completion' }>
  | Readonly<{ type: 'hq/return-from-operation-completion' }>;

export type PersistentProgressionEvent = PersistentProgressionCommand &
  Readonly<{ storageNotice: string | null }>;

export type GameEngineState = Readonly<
  LocalSaveData & {
    status: 'stage11-ready';
    screen: GameScreen;
    storageNotice: string | null;
  }
>;

export type GameEngineEvent =
  | Readonly<{ type: 'title/enter-hq' }>
  | Readonly<{ type: 'title/open-resume-summary' }>
  | Readonly<{ type: 'title/continue-operation' }>
  | Readonly<{ type: 'title/cancel-resume' }>
  | PersistentProgressionEvent
  | Readonly<{ type: 'workspace/return-hq' }>
  | Readonly<{ type: 'dashboard/open-field-manual' }>
  | Readonly<{ type: 'navigation/back-dashboard' }>
  | Readonly<{ type: 'profile/updated'; data: LocalSaveData; notice: string | null }>
  | Readonly<{ type: 'settings/updated'; data: LocalSaveData; notice: string | null }>
  | Readonly<{ type: 'progress/reset'; data: LocalSaveData; notice: string | null }>
  | Readonly<{ type: 'navigation/return-title' }>;

export function createInitialEngineState(
  data: LocalSaveData,
  storageNotice: string | null
): GameEngineState {
  return { ...data, status: 'stage11-ready', screen: 'title', storageNotice };
}

export function selectLocalSaveData(state: GameEngineState): LocalSaveData {
  return { profile: state.profile, settings: state.settings };
}

export function isOperationAvailable(progression: Ops001Progression): boolean {
  return progression !== 'applicant-at-hq';
}

export function transitionEngine(state: GameEngineState, event: GameEngineEvent): GameEngineState {
  switch (event.type) {
    case 'title/enter-hq':
      return { ...state, screen: state.profile === null ? 'codename-registration' : 'dashboard' };
    case 'title/open-resume-summary':
      return state.profile?.activeCheckpoint == null
        ? state
        : { ...state, screen: 'resume-summary' };
    case 'title/continue-operation':
      return state.profile?.activeCheckpoint == null
        ? state
        : {
            ...state,
            screen:
              state.profile.activeCheckpoint.progression === 'debrief'
                ? 'mission-debrief'
                : 'mission-workspace'
          };
    case 'title/cancel-resume':
      return { ...state, screen: 'title' };
    case 'communications/open-welcome':
      return updateProgression(
        state,
        state.profile?.progression === 'applicant-at-hq' ? 'welcome-read' : null,
        'welcome-transmission',
        event.storageNotice
      );
    case 'communications/return-dashboard':
      return updateProgression(
        state,
        state.profile?.progression === 'welcome-read' ? 'ops001-available' : null,
        'dashboard',
        event.storageNotice
      );
    case 'operation/open':
      if (state.profile === null || !isOperationAvailable(state.profile.progression)) return state;
      if (state.profile.activeCheckpoint !== null) {
        return { ...state, screen: 'mission-workspace' };
      }
      return updateProgression(
        state,
        state.profile.progression === 'ops001-available' ? 'briefing-read' : null,
        'mission-briefing',
        event.storageNotice
      );
    case 'operation/deploy':
      if (state.profile?.progression !== 'briefing-read') return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          progression: 'operation-active-locate-message',
          activeCheckpoint: createOps001ActiveCheckpoint()
        },
        screen: 'mission-workspace',
        storageNotice: event.storageNotice
      };
    case 'operation/restart-current': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (
        profile === null ||
        checkpoint == null ||
        !isRestartableOps001Progression(checkpoint.progression)
      )
        return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'operation-active-locate-message',
          activeCheckpoint: createOps001ActiveCheckpoint(),
          // OPS-001 currently owns every Field Manual unlock. A restart should be a clean tutorial replay.
          fieldManualEntries: []
        },
        screen: 'mission-workspace',
        storageNotice: event.storageNotice
      };
    }
    case 'workspace/select-tool':
      if (state.profile?.activeCheckpoint == null) return state;
      if (state.profile.activeCheckpoint.activeTool === event.tool) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          activeCheckpoint: { ...state.profile.activeCheckpoint, activeTool: event.tool }
        },
        storageNotice: event.storageNotice
      };
    case 'terminal/submit-command': {
      if (state.profile?.activeCheckpoint == null) return state;
      const execution = interpretTerminalCommand(
        event.input,
        state.profile.activeCheckpoint.terminal,
        event.provenance
      );
      if (execution.kind === 'no-op') return state;
      const updatedProfile = applyStage7TerminalExecution(state.profile, execution);
      const priorHint = resolveOps001HintContext(state.profile.activeCheckpoint);
      let nextCheckpoint = updatedProfile.activeCheckpoint;
      if (nextCheckpoint === null) return state;
      nextCheckpoint = clearObsoleteErrorStreak(nextCheckpoint);
      if (execution.interaction?.resultKind === 'error' && priorHint !== null) {
        nextCheckpoint = recordRelatedError(nextCheckpoint, priorHint);
      }
      return {
        ...state,
        profile: { ...updatedProfile, activeCheckpoint: nextCheckpoint },
        storageNotice: event.storageNotice
      };
    }
    case 'terminal/prepare-command': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      const value = event.value;
      if (
        profile === null ||
        checkpoint == null ||
        value.trim().length === 0 ||
        value.length > TERMINAL_INPUT_LIMIT
      )
        return state;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: {
            ...checkpoint,
            preparedCommand: {
              value,
              source: event.source,
              revision: (checkpoint.preparedCommand?.revision ?? 0) + 1
            }
          }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'terminal/clear-prepared-command': {
      if (state.profile?.activeCheckpoint?.preparedCommand == null) return state;
      const profile = state.profile;
      const checkpoint = state.profile.activeCheckpoint;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: { ...checkpoint, preparedCommand: null }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'byte/dismiss-notice': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      const notice = checkpoint?.pendingByteNotices[0];
      if (profile === null || checkpoint == null || notice === undefined) return state;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: {
            ...checkpoint,
            pendingByteNotices: checkpoint.pendingByteNotices.slice(1),
            seenByteNotices: appendUnique(checkpoint.seenByteNotices, notice)
          }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'byte/reveal-hint': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint == null) return state;
      const next = revealHintLevel(checkpoint, event.hintId, event.level);
      return next === checkpoint
        ? state
        : {
            ...state,
            profile: { ...profile, activeCheckpoint: next },
            storageNotice: event.storageNotice
          };
    }
    case 'byte/use-assist': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint == null) return state;
      const next = applyHintAssist(checkpoint, event.hintId);
      return next === checkpoint
        ? state
        : {
            ...state,
            profile: { ...profile, activeCheckpoint: next },
            storageNotice: event.storageNotice
          };
    }
    case 'evidence/prepare-mission-control': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || !checkpoint?.activeEvidenceIds.includes('EV-003')) return state;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: {
            ...checkpoint,
            missionControl: {
              input: OPS001_VERIFICATION_FLAG,
              validation: 'idle',
              preparationSource: 'evidence',
              revision: checkpoint.missionControl.revision + 1
            }
          }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'browser/clear-prepared-route': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.preparedBrowserRoute == null) return state;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: { ...checkpoint, preparedBrowserRoute: null }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'browser/open-route':
    case 'browser/home':
    case 'browser/back': {
      if (state.profile?.activeCheckpoint == null) return state;
      const priorHint = resolveOps001HintContext(state.profile.activeCheckpoint);
      const navigationPreview =
        event.type === 'browser/open-route'
          ? browserNavigationResultFor(state.profile.activeCheckpoint, event.input)
          : null;
      const profile = applyBrowserNavigation(
        state.profile,
        event.type === 'browser/open-route'
          ? { kind: 'open', input: event.input }
          : event.type === 'browser/home'
            ? { kind: 'home' }
            : { kind: 'back' }
      );
      let checkpoint = profile.activeCheckpoint ?? state.profile.activeCheckpoint;
      checkpoint = clearObsoleteErrorStreak(checkpoint);
      if (
        event.type === 'browser/open-route' &&
        priorHint === 'H-004' &&
        navigationPreview !== null &&
        navigationPreview.inspection.kind !== 'accepted' &&
        navigationPreview.inspection.kind !== 'empty'
      ) {
        checkpoint = recordRelatedError(checkpoint, priorHint);
      }
      if (checkpoint.preparedBrowserRoute !== null) {
        checkpoint = { ...checkpoint, preparedBrowserRoute: null };
      }
      if (profile === state.profile && checkpoint === state.profile.activeCheckpoint) return state;
      return {
        ...state,
        profile: { ...profile, activeCheckpoint: checkpoint },
        storageNotice: event.storageNotice
      };
    }
    case 'mission-control/update-input': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (
        profile === null ||
        checkpoint == null ||
        event.value.length > MISSION_CONTROL_INPUT_LIMIT
      )
        return state;
      if (checkpoint.missionControl.input === event.value) return state;
      return {
        ...state,
        profile: {
          ...profile,
          activeCheckpoint: {
            ...checkpoint,
            missionControl: {
              ...checkpoint.missionControl,
              input: event.value,
              validation: 'idle',
              preparationSource: null
            }
          }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'mission-control/submit': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint == null || checkpoint.progression === 'operation-verified')
        return state;
      const result = validateOps001Flag(
        checkpoint.missionControl.input,
        checkpoint.activeEvidenceIds.includes('EV-003')
      );
      if (result !== 'accepted') {
        let next: Ops001ActiveCheckpoint = {
          ...checkpoint,
          missionControl: { ...checkpoint.missionControl, validation: result }
        };
        const hintId = resolveOps001HintContext(checkpoint);
        if (hintId === 'H-005') next = recordRelatedError(next, hintId);
        return {
          ...state,
          profile: { ...profile, activeCheckpoint: next },
          storageNotice: event.storageNotice
        };
      }
      const verifiedCheckpoint = {
        ...checkpoint,
        progression: 'operation-verified' as const,
        objectiveId: 'OBJ-005' as const,
        completedMilestones: appendUnique(checkpoint.completedMilestones, 'OBJ-004'),
        activeEvidenceIds: appendUnique(checkpoint.activeEvidenceIds, 'EV-004'),
        verifiedEvidenceIds: appendUnique(checkpoint.verifiedEvidenceIds, 'EV-003'),
        missionControl: {
          ...checkpoint.missionControl,
          validation: 'accepted' as const
        },
        relatedErrorStreak: null
      };
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'operation-verified',
          activeCheckpoint: verifiedCheckpoint
        },
        storageNotice: event.storageNotice
      };
    }
    case 'operation/enter-debrief': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'operation-verified') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'debrief',
          activeCheckpoint: { ...checkpoint, progression: 'debrief' }
        },
        screen: 'mission-debrief',
        storageNotice: event.storageNotice
      };
    }
    case 'debrief/return-hq': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'debrief') return state;
      return {
        ...state,
        profile: {
          ...profile,
          rank: 'Recruit Operative',
          badges: appendUnique(profile.badges, 'ghost-file'),
          completedMissions: appendUnique(profile.completedMissions, 'OPS-001'),
          progression: 'recruit-operative',
          activeCheckpoint: { ...checkpoint, progression: 'recruit-operative' }
        },
        screen: 'dashboard',
        storageNotice: event.storageNotice
      };
    }
    case 'hq/record-anomaly': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile?.rank !== 'Recruit Operative' || checkpoint?.progression !== 'recruit-operative')
        return state;
      return {
        ...state,
        profile: {
          ...profile,
          persistentEvidence: appendUnique(profile.persistentEvidence, 'EV-005'),
          progression: 'anomaly-recorded',
          activeCheckpoint: {
            ...checkpoint,
            progression: 'anomaly-recorded',
            activeEvidenceIds: appendUnique(checkpoint.activeEvidenceIds, 'EV-005')
          }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/settle-anomaly-reactions': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'anomaly-recorded') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'anomaly-review-pending',
          activeCheckpoint: { ...checkpoint, progression: 'anomaly-review-pending' }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/complete-evidence-review': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'anomaly-review-pending') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'incident-teaser-pending',
          activeCheckpoint: { ...checkpoint, progression: 'incident-teaser-pending' }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/deliver-incident-teaser': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'incident-teaser-pending') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'incident-teaser-received',
          activeCheckpoint: { ...checkpoint, progression: 'incident-teaser-received' }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/read-incident-teaser': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'incident-teaser-received') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'incident-teaser-read',
          activeCheckpoint: { ...checkpoint, progression: 'incident-teaser-read' }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/present-operation-completion': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'incident-teaser-read') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'operation-completion',
          activeCheckpoint: { ...checkpoint, progression: 'operation-completion' }
        },
        storageNotice: event.storageNotice
      };
    }
    case 'hq/return-from-operation-completion': {
      const profile = state.profile;
      const checkpoint = profile?.activeCheckpoint;
      if (profile === null || checkpoint?.progression !== 'operation-completion') return state;
      return {
        ...state,
        profile: {
          ...profile,
          progression: 'operation-complete',
          activeCheckpoint: { ...checkpoint, progression: 'operation-complete' }
        },
        screen: 'dashboard',
        storageNotice: event.storageNotice
      };
    }
    case 'workspace/return-hq':
      return state.profile === null ? state : { ...state, screen: 'dashboard' };
    case 'dashboard/open-field-manual':
      return state.profile === null ? state : { ...state, screen: 'field-manual' };
    case 'navigation/back-dashboard':
      return state.profile === null ? state : { ...state, screen: 'dashboard' };
    case 'profile/updated':
      return { ...state, ...event.data, screen: 'dashboard', storageNotice: event.notice };
    case 'settings/updated':
      return { ...state, ...event.data, storageNotice: event.notice };
    case 'progress/reset':
      return { ...state, ...event.data, screen: 'title', storageNotice: event.notice };
    case 'navigation/return-title':
      return { ...state, screen: 'title' };
  }
}

function updateProgression(
  state: GameEngineState,
  progression: Ops001Progression | null,
  screen: GameScreen,
  storageNotice: string | null
): GameEngineState {
  if (state.profile === null) return state;
  const profile: LocalOperativeProfile =
    progression === null ? state.profile : { ...state.profile, progression };
  return { ...state, profile, screen, storageNotice };
}
