import { OPS001_CONTENT } from '../missions/ops001/content';
import {
  createInitialTerminalState,
  type TerminalState
} from '../simulations/terminal/interpreter';
import { createInitialBrowserState, type BrowserState } from '../simulations/browser/browserState';

export type OperativeSettings = Readonly<{
  soundEffects: boolean;
  hqAmbience: boolean;
  commandAssistance: boolean;
}>;

export type Ops001Progression =
  | 'applicant-at-hq'
  | 'welcome-read'
  | 'ops001-available'
  | 'briefing-read'
  | 'operation-active-locate-message'
  | 'welcome-read-in-terminal'
  | 'verification-route-recovered'
  | 'verification-flag-recovered'
  | 'operation-verified'
  | 'debrief'
  | 'recruit-operative'
  | 'anomaly-recorded'
  | 'anomaly-review-pending'
  | 'incident-teaser-pending'
  | 'incident-teaser-received'
  | 'incident-teaser-read'
  | 'operation-completion'
  | 'operation-complete';

export const WORKSPACE_TOOLS = ['terminal', 'evidence'] as const;
export type WorkspaceTool = (typeof WORKSPACE_TOOLS)[number];
export const OPS001_OBJECTIVE_IDS = [
  'OBJ-001',
  'OBJ-002',
  'OBJ-003',
  'OBJ-004',
  'OBJ-005'
] as const;
export type Ops001ObjectiveId = (typeof OPS001_OBJECTIVE_IDS)[number];
export const OPS001_EVIDENCE_IDS = ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'] as const;
export type Ops001EvidenceId = (typeof OPS001_EVIDENCE_IDS)[number];
export const FIELD_MANUAL_ENTRY_IDS = [
  'command-help',
  'command-ls',
  'command-cd',
  'command-cat',
  'command-clear',
  'note-files-folders',
  'note-paths',
  'note-browser-routes',
  'note-verification-flags'
] as const;
export type FieldManualEntryId = (typeof FIELD_MANUAL_ENTRY_IDS)[number];
export const BYTE_NOTICE_IDS = [
  'command-help',
  'command-ls',
  'command-cd',
  'command-cat',
  'command-clear',
  'verification-route-recovered',
  'verification-flag-recovered'
] as const;
export type ByteNoticeId = (typeof BYTE_NOTICE_IDS)[number];
export const PREPARATION_SOURCES = ['command-guide', 'terminal-object', 'byte-assist'] as const;
export type PreparationSource = (typeof PREPARATION_SOURCES)[number];
export type PreparedCommand = Readonly<{
  value: string;
  source: PreparationSource;
  revision: number;
}>;
export type ActiveOperationProgression =
  | 'operation-active-locate-message'
  | 'welcome-read-in-terminal'
  | 'verification-route-recovered'
  | 'verification-flag-recovered'
  | 'operation-verified'
  | 'debrief'
  | 'recruit-operative'
  | 'anomaly-recorded'
  | 'anomaly-review-pending'
  | 'incident-teaser-pending'
  | 'incident-teaser-received'
  | 'incident-teaser-read'
  | 'operation-completion'
  | 'operation-complete';

export function isRestartableOps001Progression(progression: ActiveOperationProgression): boolean {
  switch (progression) {
    case 'operation-active-locate-message':
    case 'welcome-read-in-terminal':
    case 'verification-route-recovered':
    case 'verification-flag-recovered':
      return true;
    default:
      return false;
  }
}

export const OPS001_HINT_IDS = ['H-001', 'H-002', 'H-003A', 'H-003B', 'H-004', 'H-005'] as const;
export type Ops001HintId = (typeof OPS001_HINT_IDS)[number];
export const HINT_LEVELS = ['nudge', 'instruction', 'assist'] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];
export type HintProgress = Readonly<{ hintId: Ops001HintId; level: HintLevel }>;
export type RelatedErrorStreak = Readonly<{ hintId: Ops001HintId; count: 1 | 2 }>;
export type PreparedBrowserRoute = Readonly<{
  value: '/recruit-verification';
  source: 'byte-assist';
  revision: number;
}>;
export const MISSION_CONTROL_INPUT_LIMIT = 160;
export type MissionControlValidation = 'idle' | 'empty' | 'malformed' | 'incorrect' | 'accepted';
export type MissionControlPreparationSource = 'evidence' | 'byte-assist';
export type MissionControlState = Readonly<{
  input: string;
  validation: MissionControlValidation;
  preparationSource: MissionControlPreparationSource | null;
  revision: number;
}>;

export type Ops001ActiveCheckpoint = Readonly<{
  missionId: 'OPS-001';
  checkpointVersion: 10;
  progression: ActiveOperationProgression;
  objectiveId: Ops001ObjectiveId;
  completedMilestones: readonly Exclude<Ops001ObjectiveId, 'OBJ-005'>[];
  activeTool: WorkspaceTool;
  browser: BrowserState;
  terminal: TerminalState;
  activeEvidenceIds: readonly Ops001EvidenceId[];
  preparedCommand: PreparedCommand | null;
  preparedBrowserRoute: PreparedBrowserRoute | null;
  missionControl: MissionControlState;
  hintProgress: readonly HintProgress[];
  relatedErrorStreak: RelatedErrorStreak | null;
  verifiedEvidenceIds: readonly 'EV-003'[];
  pendingByteNotices: readonly ByteNoticeId[];
  seenByteNotices: readonly ByteNoticeId[];
}>;

export type LocalOperativeProfile = Readonly<{
  codename: string;
  rank: 'Applicant' | 'Recruit Operative';
  badges: readonly string[];
  completedMissions: readonly string[];
  persistentEvidence: readonly string[];
  fieldManualEntries: readonly FieldManualEntryId[];
  progression: Ops001Progression;
  activeCheckpoint: Ops001ActiveCheckpoint | null;
}>;

export type LocalSaveData = Readonly<{
  profile: LocalOperativeProfile | null;
  settings: OperativeSettings;
}>;

export const DEFAULT_OPERATIVE_SETTINGS: OperativeSettings = Object.freeze({
  soundEffects: true,
  hqAmbience: true,
  commandAssistance: false
});

export function createEmptyLocalSave(): LocalSaveData {
  return {
    profile: null,
    settings: { ...DEFAULT_OPERATIVE_SETTINGS }
  };
}

export function createApplicantProfile(codename: string): LocalOperativeProfile {
  return {
    codename,
    rank: 'Applicant',
    badges: [],
    completedMissions: [],
    persistentEvidence: [],
    fieldManualEntries: [],
    progression: 'applicant-at-hq',
    activeCheckpoint: null
  };
}

export function updateProfileCodename(
  profile: LocalOperativeProfile,
  codename: string
): LocalOperativeProfile {
  return { ...profile, codename };
}

export function createOps001ActiveCheckpoint(
  activeTool: WorkspaceTool = 'terminal'
): Ops001ActiveCheckpoint {
  return {
    ...OPS001_CONTENT.initialCheckpoint,
    activeTool,
    browser: createInitialBrowserState(),
    terminal: createInitialTerminalState(),
    completedMilestones: [],
    activeEvidenceIds: [],
    preparedCommand: null,
    preparedBrowserRoute: null,
    missionControl: {
      input: '',
      validation: 'idle',
      preparationSource: null,
      revision: 0
    },
    hintProgress: [],
    relatedErrorStreak: null,
    verifiedEvidenceIds: [],
    pendingByteNotices: [],
    seenByteNotices: []
  };
}
