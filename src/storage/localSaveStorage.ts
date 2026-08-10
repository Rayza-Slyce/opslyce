import { z } from 'zod';
import { validateCodename } from '../profile/codename';
import {
  createEmptyLocalSave,
  BYTE_NOTICE_IDS,
  FIELD_MANUAL_ENTRY_IDS,
  OPS001_EVIDENCE_IDS,
  OPS001_OBJECTIVE_IDS,
  OPS001_HINT_IDS,
  HINT_LEVELS,
  MISSION_CONTROL_INPUT_LIMIT,
  PREPARATION_SOURCES,
  WORKSPACE_TOOLS,
  type FieldManualEntryId,
  type LocalSaveData,
  type LocalOperativeProfile,
  type OperativeSettings,
  type Ops001Progression
} from '../profile/localProfile';
import {
  TERMINAL_COMMAND_IDS,
  TERMINAL_HISTORY_LIMIT,
  TERMINAL_INPUT_LIMIT,
  TERMINAL_TRANSCRIPT_LIMIT
} from '../simulations/terminal/interpreter';
import { BROWSER_HISTORY_LIMIT } from '../simulations/browser/browserState';
import { BROWSER_ADDRESS_LIMIT, BROWSER_ROUTES } from '../simulations/browser/routeContract';

export const LOCAL_SAVE_FORMAT_VERSION = 12;
export const LOCAL_SAVE_STORAGE_KEY = 'opslyce.local-save';

const legacySettingsSchema = z
  .object({
    soundEffects: z.boolean(),
    hqAmbience: z.boolean()
  })
  .strict();

const settingsSchema = legacySettingsSchema.extend({ commandAssistance: z.boolean() }).strict();

const profileFields = {
  codename: z.string().refine((value) => {
    const result = validateCodename(value);
    return result.valid && result.value === value;
  }),
  rank: z.literal('Applicant'),
  badges: z.array(z.string()),
  completedMissions: z.array(z.string()),
  persistentEvidence: z.array(z.string()),
  fieldManualEntries: z.array(z.string())
} as const;

const version1ProfileSchema = z
  .object({
    ...profileFields,
    activeCheckpoint: z.null()
  })
  .strict();

const legacyProgressionSchema = z.enum([
  'applicant-at-hq',
  'welcome-read',
  'ops001-available',
  'briefing-read',
  'operation-active-locate-message'
]);

const legacyStage7ProgressionSchema = z.enum([
  ...legacyProgressionSchema.options,
  'welcome-read-in-terminal',
  'browser-unlocked'
]);

const version2CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(1),
    progression: z.literal('operation-active-locate-message'),
    objective: z.literal("Locate Agent Trace's missing message.")
  })
  .strict();

const version2ProfileSchema = z
  .object({
    ...profileFields,
    stage4Progression: legacyProgressionSchema,
    activeCheckpoint: version2CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ activeCheckpoint, stage4Progression }) =>
      (stage4Progression === 'operation-active-locate-message') === (activeCheckpoint !== null)
  );

const version1SaveSchema = z
  .object({
    version: z.literal(1),
    profile: version1ProfileSchema.nullable(),
    settings: legacySettingsSchema
  })
  .strict();

const version2SaveSchema = z
  .object({
    version: z.literal(2),
    profile: version2ProfileSchema.nullable(),
    settings: legacySettingsSchema
  })
  .strict();

const version3CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(2),
    progression: z.literal('operation-active-locate-message'),
    objectiveId: z.literal('OBJ-001'),
    activeTool: z.enum(['terminal', 'evidence']),
    browserLocked: z.literal(true)
  })
  .strict();

const version3ProfileSchema = z
  .object({
    ...profileFields,
    progression: legacyProgressionSchema,
    activeCheckpoint: version3CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ activeCheckpoint, progression }) =>
      (progression === 'operation-active-locate-message') === (activeCheckpoint !== null)
  );

const version3SaveSchema = z
  .object({
    version: z.literal(3),
    profile: version3ProfileSchema.nullable(),
    settings: legacySettingsSchema
  })
  .strict();

const virtualPathSchema = z.enum([
  '/home/recruit',
  '/home/recruit/training',
  '/home/recruit/welcome.txt',
  '/home/recruit/training/equipment.txt',
  '/home/recruit/training/trace-note.txt'
]);
const terminalLineSchema = z
  .object({
    type: z.enum(['normal', 'file', 'folder', 'path', 'warning']),
    text: z.string(),
    canonicalTarget: virtualPathSchema.optional()
  })
  .strict();

const virtualFilePathSchema = z.enum([
  '/home/recruit/welcome.txt',
  '/home/recruit/training/equipment.txt',
  '/home/recruit/training/trace-note.txt'
]);
const terminalOutputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('lines'), lines: z.array(terminalLineSchema) }).strict(),
  z.object({ kind: z.literal('file-content'), canonicalPath: virtualFilePathSchema }).strict()
]);
const terminalSuggestionSchema = z.object({ display: z.string(), command: z.string() }).strict();
const version4TerminalInteractionSchema = z
  .object({
    prompt: z.string(),
    submittedCommand: z.string().max(TERMINAL_INPUT_LIMIT),
    commandId: z.enum(TERMINAL_COMMAND_IDS).nullable(),
    resultKind: z.enum(['success', 'error', 'guidance']),
    output: terminalOutputSchema,
    suggestion: terminalSuggestionSchema.optional()
  })
  .strict();
const version4TerminalStateFields = {
  currentDirectory: z.enum(['/home/recruit', '/home/recruit/training']),
  commandHistory: z.array(z.string().max(TERMINAL_INPUT_LIMIT)).max(TERMINAL_HISTORY_LIMIT),
  visibleInteractions: z.array(version4TerminalInteractionSchema).max(TERMINAL_TRANSCRIPT_LIMIT),
  commandsUsed: z.array(z.enum(TERMINAL_COMMAND_IDS)),
  openedFiles: z.array(virtualFilePathSchema)
} as const;
const version4TerminalStateSchema = z
  .object(version4TerminalStateFields)
  .strict()
  .refine(({ commandsUsed }) => new Set(commandsUsed).size === commandsUsed.length)
  .refine(({ openedFiles }) => new Set(openedFiles).size === openedFiles.length);

const version4CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(3),
    progression: z.literal('operation-active-locate-message'),
    objectiveId: z.literal('OBJ-001'),
    activeTool: z.enum(['terminal', 'evidence']),
    browserLocked: z.literal(true),
    terminal: version4TerminalStateSchema
  })
  .strict();

const version4ProfileSchema = z
  .object({
    ...profileFields,
    progression: legacyProgressionSchema,
    activeCheckpoint: version4CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ activeCheckpoint, progression }) =>
      (progression === 'operation-active-locate-message') === (activeCheckpoint !== null)
  );

const version4SaveSchema = z
  .object({
    version: z.literal(4),
    profile: version4ProfileSchema.nullable(),
    settings: legacySettingsSchema
  })
  .strict();

const terminalInteractionSchema = version4TerminalInteractionSchema.extend({
  provenance: z.enum(['independent', 'prepared'])
});
const terminalStateSchema = z
  .object({
    ...version4TerminalStateFields,
    visibleInteractions: z.array(terminalInteractionSchema).max(TERMINAL_TRANSCRIPT_LIMIT),
    qualifyingCommandsUsed: z.array(z.enum(TERMINAL_COMMAND_IDS)),
    revealedPaths: z.array(virtualPathSchema)
  })
  .strict()
  .refine(
    ({ qualifyingCommandsUsed }) =>
      new Set(qualifyingCommandsUsed).size === qualifyingCommandsUsed.length
  )
  .refine(({ revealedPaths }) => new Set(revealedPaths).size === revealedPaths.length);
const legacyPreparationSources = [
  'command-rail',
  'command-guide',
  'terminal-object',
  'interpreter-suggestion',
  'autocomplete'
] as const;
const legacyPreparedCommandSchema = z
  .object({
    value: z.string().min(1).max(TERMINAL_INPUT_LIMIT),
    source: z.enum(legacyPreparationSources),
    revision: z.number().int().nonnegative()
  })
  .strict();
const legacyStage7ManualIds = FIELD_MANUAL_ENTRY_IDS.filter(
  (id) => id !== 'note-verification-flags'
);
const legacyStage7EvidenceIds = ['EV-001', 'EV-002'] as const;
const legacyStage7ObjectiveIds = ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const;
const legacyStage7ByteNotices = [
  'command-help',
  'command-ls',
  'command-cd',
  'command-cat',
  'command-clear',
  'browser-unlocked'
] as const;
const legacyWorkspaceTools = ['terminal', 'browser', 'evidence'] as const;
const version6ActiveCheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(4),
    progression: z.enum([
      'operation-active-locate-message',
      'welcome-read-in-terminal',
      'browser-unlocked'
    ]),
    objectiveId: z.enum(legacyStage7ObjectiveIds),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002'])),
    activeTool: z.enum(legacyWorkspaceTools),
    browserLocked: z.boolean(),
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(legacyStage7EvidenceIds)),
    preparedCommand: legacyPreparedCommandSchema.nullable(),
    preparedBrowserRoute: z.literal('/recruit-verification').nullable(),
    pendingByteNotices: z.array(z.enum(legacyStage7ByteNotices)),
    seenByteNotices: z.array(z.enum(legacyStage7ByteNotices))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ activeTool, browserLocked }) => activeTool !== 'browser' || !browserLocked)
  .refine(({ browserLocked, objectiveId, progression }) =>
    browserLocked
      ? objectiveId !== 'OBJ-003' && progression !== 'browser-unlocked'
      : objectiveId === 'OBJ-003' && progression === 'browser-unlocked'
  )
  .refine(({ objectiveId, completedMilestones, activeEvidenceIds }) => {
    if (objectiveId === 'OBJ-001') {
      return completedMilestones.length === 0 && activeEvidenceIds.length === 0;
    }
    if (objectiveId === 'OBJ-002') {
      return (
        completedMilestones.length === 1 &&
        completedMilestones[0] === 'OBJ-001' &&
        activeEvidenceIds.length === 0
      );
    }
    return (
      completedMilestones.join(',') === 'OBJ-001,OBJ-002' &&
      activeEvidenceIds.join(',') === 'EV-001,EV-002'
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'browser-unlocked')
  )
  .refine(
    ({ preparedBrowserRoute, browserLocked }) => preparedBrowserRoute === null || !browserLocked
  );
const version5ProfileSchema = z
  .object({
    ...profileFields,
    fieldManualEntries: z.array(z.enum(legacyStage7ManualIds)),
    progression: legacyStage7ProgressionSchema,
    activeCheckpoint: version6ActiveCheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      ['operation-active-locate-message', 'welcome-read-in-terminal', 'browser-unlocked'].includes(
        progression
      ) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  );
const version5SaveSchema = z
  .object({
    version: z.literal(5),
    profile: version5ProfileSchema.nullable(),
    settings: legacySettingsSchema
  })
  .strict();
const version6SaveSchema = z
  .object({
    version: z.literal(6),
    profile: version5ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const browserHistoryEntrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('page'), route: z.enum(BROWSER_ROUTES) }).strict(),
  z
    .object({
      kind: z.literal('error'),
      error: z.enum(['route-not-found', 'route-not-available']),
      enteredValue: z.string().max(BROWSER_ADDRESS_LIMIT)
    })
    .strict()
]);
const browserStateSchema = z
  .object({
    history: z.array(browserHistoryEntrySchema).min(1).max(BROWSER_HISTORY_LIMIT),
    historyIndex: z.number().int().nonnegative()
  })
  .strict()
  .refine(({ history, historyIndex }) => historyIndex < history.length);
const preparedBrowserRouteSchema = z
  .object({
    value: z.literal('/recruit-verification'),
    revision: z.number().int().nonnegative()
  })
  .strict();
const version7CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(5),
    progression: z.enum([
      'operation-active-locate-message',
      'welcome-read-in-terminal',
      'verification-route-recovered',
      'verification-flag-recovered'
    ]),
    objectiveId: z.enum(OPS001_OBJECTIVE_IDS),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002', 'OBJ-003'])),
    activeTool: z.enum(legacyWorkspaceTools),
    browser: browserStateSchema,
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(OPS001_EVIDENCE_IDS)),
    preparedCommand: legacyPreparedCommandSchema.nullable(),
    preparedBrowserRoute: preparedBrowserRouteSchema.nullable(),
    preparedMissionControlFlag: z.literal('FLAG{WELCOME_TO_HQ}').nullable(),
    pendingByteNotices: z.array(z.enum(BYTE_NOTICE_IDS)),
    seenByteNotices: z.array(z.enum(BYTE_NOTICE_IDS))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ objectiveId, completedMilestones, activeEvidenceIds }) => {
    const objectiveIndex = OPS001_OBJECTIVE_IDS.indexOf(objectiveId);
    return (
      completedMilestones.join(',') === OPS001_OBJECTIVE_IDS.slice(0, objectiveIndex).join(',') &&
      activeEvidenceIds.join(',') ===
        (objectiveId === 'OBJ-001' || objectiveId === 'OBJ-002'
          ? ''
          : objectiveId === 'OBJ-003'
            ? 'EV-001,EV-002'
            : 'EV-001,EV-002,EV-003')
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered')
  )
  .refine(
    ({ preparedBrowserRoute, activeEvidenceIds }) =>
      preparedBrowserRoute === null || activeEvidenceIds.includes('EV-002')
  )
  .refine(
    ({ preparedMissionControlFlag, activeEvidenceIds }) =>
      preparedMissionControlFlag === null || activeEvidenceIds.includes('EV-003')
  )
  .refine(({ browser, activeEvidenceIds }) =>
    browser.history.every(
      (entry) =>
        entry.kind !== 'page' ||
        entry.route !== '/recruit-verification' ||
        activeEvidenceIds.includes('EV-003')
    )
  );
const version7ProgressionSchema = z.enum([
  ...legacyProgressionSchema.options,
  'welcome-read-in-terminal',
  'verification-route-recovered',
  'verification-flag-recovered'
]);
const version7ProfileSchema = z
  .object({
    ...profileFields,
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: version7ProgressionSchema,
    activeCheckpoint: version7CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      [
        'operation-active-locate-message',
        'welcome-read-in-terminal',
        'verification-route-recovered',
        'verification-flag-recovered'
      ].includes(progression) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  );
const version7SaveSchema = z
  .object({
    version: z.literal(7),
    profile: version7ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const preparedCommandSchema = z
  .object({
    value: z.string().min(1).max(TERMINAL_INPUT_LIMIT),
    source: z.enum(['command-guide', 'terminal-object']),
    revision: z.number().int().nonnegative()
  })
  .strict();
const version8ObjectiveIds = ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const;
const version8EvidenceIds = ['EV-001', 'EV-002', 'EV-003'] as const;
const version8CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(6),
    progression: z.enum([
      'operation-active-locate-message',
      'welcome-read-in-terminal',
      'verification-route-recovered',
      'verification-flag-recovered'
    ]),
    objectiveId: z.enum(version8ObjectiveIds),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002', 'OBJ-003'])),
    activeTool: z.enum(WORKSPACE_TOOLS),
    browser: browserStateSchema,
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(version8EvidenceIds)),
    preparedCommand: preparedCommandSchema.nullable(),
    preparedMissionControlFlag: z.literal('FLAG{WELCOME_TO_HQ}').nullable(),
    pendingByteNotices: z.array(z.enum(BYTE_NOTICE_IDS)),
    seenByteNotices: z.array(z.enum(BYTE_NOTICE_IDS))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ objectiveId, completedMilestones, activeEvidenceIds }) => {
    const objectiveIndex = version8ObjectiveIds.indexOf(objectiveId);
    return (
      completedMilestones.join(',') === version8ObjectiveIds.slice(0, objectiveIndex).join(',') &&
      activeEvidenceIds.join(',') ===
        (objectiveId === 'OBJ-001' || objectiveId === 'OBJ-002'
          ? ''
          : objectiveId === 'OBJ-003'
            ? 'EV-001,EV-002'
            : 'EV-001,EV-002,EV-003')
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered')
  )
  .refine(
    ({ preparedMissionControlFlag, activeEvidenceIds }) =>
      preparedMissionControlFlag === null || activeEvidenceIds.includes('EV-003')
  )
  .refine(({ browser, activeEvidenceIds }) =>
    browser.history.every(
      (entry) =>
        entry.kind !== 'page' ||
        entry.route !== '/recruit-verification' ||
        activeEvidenceIds.includes('EV-003')
    )
  );
const version8ProfileSchema = z
  .object({
    ...profileFields,
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: version7ProgressionSchema,
    activeCheckpoint: version8CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      [
        'operation-active-locate-message',
        'welcome-read-in-terminal',
        'verification-route-recovered',
        'verification-flag-recovered'
      ].includes(progression) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  );
const version8SaveSchema = z
  .object({
    version: z.literal(8),
    profile: version8ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const currentPreparedCommandSchema = z
  .object({
    value: z.string().min(1).max(TERMINAL_INPUT_LIMIT),
    source: z.enum(PREPARATION_SOURCES),
    revision: z.number().int().nonnegative()
  })
  .strict();
const hintProgressSchema = z
  .object({ hintId: z.enum(OPS001_HINT_IDS), level: z.enum(HINT_LEVELS) })
  .strict();
const version9CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(7),
    progression: z.enum([
      'operation-active-locate-message',
      'welcome-read-in-terminal',
      'verification-route-recovered',
      'verification-flag-recovered',
      'operation-verified'
    ]),
    objectiveId: z.enum(OPS001_OBJECTIVE_IDS),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'])),
    activeTool: z.enum(WORKSPACE_TOOLS),
    browser: browserStateSchema,
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(OPS001_EVIDENCE_IDS)),
    preparedCommand: currentPreparedCommandSchema.nullable(),
    preparedBrowserRoute: z
      .object({
        value: z.literal('/recruit-verification'),
        source: z.literal('byte-assist'),
        revision: z.number().int().nonnegative()
      })
      .strict()
      .nullable(),
    missionControl: z
      .object({
        input: z.string().max(MISSION_CONTROL_INPUT_LIMIT),
        validation: z.enum(['idle', 'empty', 'malformed', 'incorrect', 'accepted']),
        preparationSource: z.enum(['evidence', 'byte-assist']).nullable(),
        revision: z.number().int().nonnegative()
      })
      .strict(),
    hintProgress: z.array(hintProgressSchema).max(OPS001_HINT_IDS.length),
    relatedErrorStreak: z
      .object({ hintId: z.enum(OPS001_HINT_IDS), count: z.union([z.literal(1), z.literal(2)]) })
      .strict()
      .nullable(),
    verifiedEvidenceIds: z.array(z.literal('EV-003')).max(1),
    pendingByteNotices: z.array(z.enum(BYTE_NOTICE_IDS)),
    seenByteNotices: z.array(z.enum(BYTE_NOTICE_IDS))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ verifiedEvidenceIds }) => new Set(verifiedEvidenceIds).size === verifiedEvidenceIds.length
  )
  .refine(
    ({ hintProgress }) =>
      new Set(hintProgress.map(({ hintId }) => hintId)).size === hintProgress.length
  )
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ objectiveId, completedMilestones, activeEvidenceIds }) => {
    const objectiveIndex = OPS001_OBJECTIVE_IDS.indexOf(objectiveId);
    const expectedEvidence =
      objectiveId === 'OBJ-001' || objectiveId === 'OBJ-002'
        ? ''
        : objectiveId === 'OBJ-003'
          ? 'EV-001,EV-002'
          : objectiveId === 'OBJ-004'
            ? 'EV-001,EV-002,EV-003'
            : 'EV-001,EV-002,EV-003,EV-004';
    return (
      completedMilestones.join(',') === OPS001_OBJECTIVE_IDS.slice(0, objectiveIndex).join(',') &&
      activeEvidenceIds.join(',') === expectedEvidence
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered') ||
      (objectiveId === 'OBJ-005' && progression === 'operation-verified')
  )
  .refine(({ objectiveId, verifiedEvidenceIds, missionControl }) =>
    objectiveId === 'OBJ-005'
      ? verifiedEvidenceIds.join(',') === 'EV-003' && missionControl.validation === 'accepted'
      : verifiedEvidenceIds.length === 0 && missionControl.validation !== 'accepted'
  )
  .refine(
    ({ preparedBrowserRoute, activeEvidenceIds, objectiveId }) =>
      preparedBrowserRoute === null ||
      (activeEvidenceIds.includes('EV-002') && objectiveId === 'OBJ-003')
  )
  .refine(({ browser, activeEvidenceIds }) =>
    browser.history.every(
      (entry) =>
        entry.kind !== 'page' ||
        entry.route !== '/recruit-verification' ||
        activeEvidenceIds.includes('EV-003')
    )
  );

const currentProgressionV9Schema = z.enum([
  ...version7ProgressionSchema.options,
  'operation-verified'
]);
const version9ProfileSchema = z
  .object({
    ...profileFields,
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: currentProgressionV9Schema,
    activeCheckpoint: version9CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      [
        'operation-active-locate-message',
        'welcome-read-in-terminal',
        'verification-route-recovered',
        'verification-flag-recovered',
        'operation-verified'
      ].includes(progression) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  );
const version9SaveSchema = z
  .object({
    version: z.literal(9),
    profile: version9ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const version10StageProgressions = [
  'operation-active-locate-message',
  'welcome-read-in-terminal',
  'verification-route-recovered',
  'verification-flag-recovered',
  'operation-verified',
  'debrief',
  'recruit-operative',
  'anomaly-recorded',
  'incident-teaser-pending'
] as const;
const version10CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(8),
    progression: z.enum(version10StageProgressions),
    objectiveId: z.enum(OPS001_OBJECTIVE_IDS),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'])),
    activeTool: z.enum(WORKSPACE_TOOLS),
    browser: browserStateSchema,
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(OPS001_EVIDENCE_IDS)),
    preparedCommand: currentPreparedCommandSchema.nullable(),
    preparedBrowserRoute: z
      .object({
        value: z.literal('/recruit-verification'),
        source: z.literal('byte-assist'),
        revision: z.number().int().nonnegative()
      })
      .strict()
      .nullable(),
    missionControl: z
      .object({
        input: z.string().max(MISSION_CONTROL_INPUT_LIMIT),
        validation: z.enum(['idle', 'empty', 'malformed', 'incorrect', 'accepted']),
        preparationSource: z.enum(['evidence', 'byte-assist']).nullable(),
        revision: z.number().int().nonnegative()
      })
      .strict(),
    hintProgress: z.array(hintProgressSchema).max(OPS001_HINT_IDS.length),
    relatedErrorStreak: z
      .object({ hintId: z.enum(OPS001_HINT_IDS), count: z.union([z.literal(1), z.literal(2)]) })
      .strict()
      .nullable(),
    verifiedEvidenceIds: z.array(z.literal('EV-003')).max(1),
    pendingByteNotices: z.array(z.enum(BYTE_NOTICE_IDS)),
    seenByteNotices: z.array(z.enum(BYTE_NOTICE_IDS))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ verifiedEvidenceIds }) => new Set(verifiedEvidenceIds).size === verifiedEvidenceIds.length
  )
  .refine(
    ({ hintProgress }) =>
      new Set(hintProgress.map(({ hintId }) => hintId)).size === hintProgress.length
  )
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ objectiveId, progression, completedMilestones, activeEvidenceIds }) => {
    const objectiveIndex = OPS001_OBJECTIVE_IDS.indexOf(objectiveId);
    const afterAnomaly =
      progression === 'anomaly-recorded' || progression === 'incident-teaser-pending';
    const expectedEvidence =
      objectiveId === 'OBJ-001' || objectiveId === 'OBJ-002'
        ? ''
        : objectiveId === 'OBJ-003'
          ? 'EV-001,EV-002'
          : objectiveId === 'OBJ-004'
            ? 'EV-001,EV-002,EV-003'
            : afterAnomaly
              ? 'EV-001,EV-002,EV-003,EV-004,EV-005'
              : 'EV-001,EV-002,EV-003,EV-004';
    return (
      completedMilestones.join(',') === OPS001_OBJECTIVE_IDS.slice(0, objectiveIndex).join(',') &&
      activeEvidenceIds.join(',') === expectedEvidence
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered') ||
      (objectiveId === 'OBJ-005' &&
        [
          'operation-verified',
          'debrief',
          'recruit-operative',
          'anomaly-recorded',
          'incident-teaser-pending'
        ].includes(progression))
  )
  .refine(({ objectiveId, verifiedEvidenceIds, missionControl }) =>
    objectiveId === 'OBJ-005'
      ? verifiedEvidenceIds.join(',') === 'EV-003' && missionControl.validation === 'accepted'
      : verifiedEvidenceIds.length === 0 && missionControl.validation !== 'accepted'
  )
  .refine(
    ({ preparedBrowserRoute, activeEvidenceIds, objectiveId }) =>
      preparedBrowserRoute === null ||
      (activeEvidenceIds.includes('EV-002') && objectiveId === 'OBJ-003')
  )
  .refine(({ browser, activeEvidenceIds }) =>
    browser.history.every(
      (entry) =>
        entry.kind !== 'page' ||
        entry.route !== '/recruit-verification' ||
        activeEvidenceIds.includes('EV-003')
    )
  );

const version10ProgressionSchema = z.enum([
  ...currentProgressionV9Schema.options,
  'debrief',
  'recruit-operative',
  'anomaly-recorded',
  'incident-teaser-pending'
]);
const version10ProfileSchema = z
  .object({
    ...profileFields,
    rank: z.enum(['Applicant', 'Recruit Operative']),
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: version10ProgressionSchema,
    activeCheckpoint: version10CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      version10StageProgressions.includes(
        progression as (typeof version10StageProgressions)[number]
      ) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  )
  .refine(({ progression, rank, badges, completedMissions, persistentEvidence }) => {
    const promoted =
      progression === 'recruit-operative' ||
      progression === 'anomaly-recorded' ||
      progression === 'incident-teaser-pending';
    const anomalyRecorded =
      progression === 'anomaly-recorded' || progression === 'incident-teaser-pending';
    return (
      (promoted ? rank === 'Recruit Operative' : rank === 'Applicant') &&
      badges.includes('ghost-file') === promoted &&
      completedMissions.includes('OPS-001') === promoted &&
      persistentEvidence.includes('EV-005') === anomalyRecorded
    );
  });
const version10SaveSchema = z
  .object({
    version: z.literal(10),
    profile: version10ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const version11StageProgressions = [
  'operation-active-locate-message',
  'welcome-read-in-terminal',
  'verification-route-recovered',
  'verification-flag-recovered',
  'operation-verified',
  'debrief',
  'recruit-operative',
  'anomaly-recorded',
  'anomaly-review-pending',
  'incident-teaser-pending',
  'incident-teaser-received',
  'incident-teaser-read'
] as const;
const version11CheckpointSchema = z
  .object({
    missionId: z.literal('OPS-001'),
    checkpointVersion: z.literal(9),
    progression: z.enum(version11StageProgressions),
    objectiveId: z.enum(OPS001_OBJECTIVE_IDS),
    completedMilestones: z.array(z.enum(['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'])),
    activeTool: z.enum(WORKSPACE_TOOLS),
    browser: browserStateSchema,
    terminal: terminalStateSchema,
    activeEvidenceIds: z.array(z.enum(OPS001_EVIDENCE_IDS)),
    preparedCommand: currentPreparedCommandSchema.nullable(),
    preparedBrowserRoute: z
      .object({
        value: z.literal('/recruit-verification'),
        source: z.literal('byte-assist'),
        revision: z.number().int().nonnegative()
      })
      .strict()
      .nullable(),
    missionControl: z
      .object({
        input: z.string().max(MISSION_CONTROL_INPUT_LIMIT),
        validation: z.enum(['idle', 'empty', 'malformed', 'incorrect', 'accepted']),
        preparationSource: z.enum(['evidence', 'byte-assist']).nullable(),
        revision: z.number().int().nonnegative()
      })
      .strict(),
    hintProgress: z.array(hintProgressSchema).max(OPS001_HINT_IDS.length),
    relatedErrorStreak: z
      .object({ hintId: z.enum(OPS001_HINT_IDS), count: z.union([z.literal(1), z.literal(2)]) })
      .strict()
      .nullable(),
    verifiedEvidenceIds: z.array(z.literal('EV-003')).max(1),
    pendingByteNotices: z.array(z.enum(BYTE_NOTICE_IDS)).max(1),
    seenByteNotices: z.array(z.enum(BYTE_NOTICE_IDS))
  })
  .strict()
  .refine(
    ({ completedMilestones }) => new Set(completedMilestones).size === completedMilestones.length
  )
  .refine(({ activeEvidenceIds }) => new Set(activeEvidenceIds).size === activeEvidenceIds.length)
  .refine(
    ({ verifiedEvidenceIds }) => new Set(verifiedEvidenceIds).size === verifiedEvidenceIds.length
  )
  .refine(
    ({ hintProgress }) =>
      new Set(hintProgress.map(({ hintId }) => hintId)).size === hintProgress.length
  )
  .refine(
    ({ pendingByteNotices }) => new Set(pendingByteNotices).size === pendingByteNotices.length
  )
  .refine(({ seenByteNotices }) => new Set(seenByteNotices).size === seenByteNotices.length)
  .refine(({ pendingByteNotices, seenByteNotices }) =>
    pendingByteNotices.every((notice) => !seenByteNotices.includes(notice))
  )
  .refine(({ objectiveId, progression, completedMilestones, activeEvidenceIds }) => {
    const objectiveIndex = OPS001_OBJECTIVE_IDS.indexOf(objectiveId);
    const afterAnomaly = [
      'anomaly-recorded',
      'anomaly-review-pending',
      'incident-teaser-pending',
      'incident-teaser-received',
      'incident-teaser-read'
    ].includes(progression);
    const expectedEvidence =
      objectiveId === 'OBJ-001' || objectiveId === 'OBJ-002'
        ? ''
        : objectiveId === 'OBJ-003'
          ? 'EV-001,EV-002'
          : objectiveId === 'OBJ-004'
            ? 'EV-001,EV-002,EV-003'
            : afterAnomaly
              ? 'EV-001,EV-002,EV-003,EV-004,EV-005'
              : 'EV-001,EV-002,EV-003,EV-004';
    return (
      completedMilestones.join(',') === OPS001_OBJECTIVE_IDS.slice(0, objectiveIndex).join(',') &&
      activeEvidenceIds.join(',') === expectedEvidence
    );
  })
  .refine(
    ({ progression, objectiveId }) =>
      (objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered') ||
      (objectiveId === 'OBJ-005' &&
        [
          'operation-verified',
          'debrief',
          'recruit-operative',
          'anomaly-recorded',
          'anomaly-review-pending',
          'incident-teaser-pending',
          'incident-teaser-received',
          'incident-teaser-read'
        ].includes(progression))
  )
  .refine(({ objectiveId, verifiedEvidenceIds, missionControl }) =>
    objectiveId === 'OBJ-005'
      ? verifiedEvidenceIds.join(',') === 'EV-003' && missionControl.validation === 'accepted'
      : verifiedEvidenceIds.length === 0 && missionControl.validation !== 'accepted'
  )
  .refine(
    ({ preparedBrowserRoute, activeEvidenceIds, objectiveId }) =>
      preparedBrowserRoute === null ||
      (activeEvidenceIds.includes('EV-002') && objectiveId === 'OBJ-003')
  )
  .refine(({ browser, activeEvidenceIds }) =>
    browser.history.every(
      (entry) =>
        entry.kind !== 'page' ||
        entry.route !== '/recruit-verification' ||
        activeEvidenceIds.includes('EV-003')
    )
  );

const version11ProgressionSchema = z.enum([
  ...currentProgressionV9Schema.options,
  'debrief',
  'recruit-operative',
  'anomaly-recorded',
  'anomaly-review-pending',
  'incident-teaser-pending',
  'incident-teaser-received',
  'incident-teaser-read'
]);
const version11ProfileSchema = z
  .object({
    ...profileFields,
    rank: z.enum(['Applicant', 'Recruit Operative']),
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: version11ProgressionSchema,
    activeCheckpoint: version11CheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      version11StageProgressions.includes(
        progression as (typeof version11StageProgressions)[number]
      ) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  )
  .refine(({ progression, rank, badges, completedMissions, persistentEvidence }) => {
    const promoted = [
      'recruit-operative',
      'anomaly-recorded',
      'anomaly-review-pending',
      'incident-teaser-pending',
      'incident-teaser-received',
      'incident-teaser-read'
    ].includes(progression);
    const anomalyRecorded = [
      'anomaly-recorded',
      'anomaly-review-pending',
      'incident-teaser-pending',
      'incident-teaser-received',
      'incident-teaser-read'
    ].includes(progression);
    return (
      (promoted ? rank === 'Recruit Operative' : rank === 'Applicant') &&
      badges.includes('ghost-file') === promoted &&
      completedMissions.includes('OPS-001') === promoted &&
      persistentEvidence.includes('EV-005') === anomalyRecorded
    );
  });
const version11SaveSchema = z
  .object({
    version: z.literal(11),
    profile: version11ProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

const currentStageProgressions = [
  ...version11StageProgressions,
  'operation-completion',
  'operation-complete'
] as const;
const currentCheckpointSchema = z
  .object({
    ...version11CheckpointSchema.shape,
    checkpointVersion: z.literal(10),
    progression: z.enum(currentStageProgressions)
  })
  .strict()
  .superRefine((checkpoint, context) => {
    const legacyEquivalent = {
      ...checkpoint,
      checkpointVersion: 9 as const,
      progression:
        checkpoint.progression === 'operation-completion' ||
        checkpoint.progression === 'operation-complete'
          ? ('incident-teaser-read' as const)
          : checkpoint.progression
    };
    if (!version11CheckpointSchema.safeParse(legacyEquivalent).success) {
      context.addIssue({ code: 'custom', message: 'Contradictory OPS-001 checkpoint.' });
    }
  });
const currentProgressionSchema = z.enum([
  ...version11ProgressionSchema.options,
  'operation-completion',
  'operation-complete'
]);
const currentProfileSchema = z
  .object({
    ...profileFields,
    rank: z.enum(['Applicant', 'Recruit Operative']),
    fieldManualEntries: z.array(z.enum(FIELD_MANUAL_ENTRY_IDS)),
    progression: currentProgressionSchema,
    activeCheckpoint: currentCheckpointSchema.nullable()
  })
  .strict()
  .refine(
    ({ fieldManualEntries }) => new Set(fieldManualEntries).size === fieldManualEntries.length
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      currentStageProgressions.includes(
        progression as (typeof currentStageProgressions)[number]
      ) ===
      (activeCheckpoint !== null)
  )
  .refine(
    ({ activeCheckpoint, progression }) =>
      activeCheckpoint === null || activeCheckpoint.progression === progression
  )
  .refine(({ progression, rank, badges, completedMissions, persistentEvidence }) => {
    const promoted = [
      'recruit-operative',
      'anomaly-recorded',
      'anomaly-review-pending',
      'incident-teaser-pending',
      'incident-teaser-received',
      'incident-teaser-read',
      'operation-completion',
      'operation-complete'
    ].includes(progression);
    const anomalyRecorded = [
      'anomaly-recorded',
      'anomaly-review-pending',
      'incident-teaser-pending',
      'incident-teaser-received',
      'incident-teaser-read',
      'operation-completion',
      'operation-complete'
    ].includes(progression);
    return (
      (promoted ? rank === 'Recruit Operative' : rank === 'Applicant') &&
      badges.includes('ghost-file') === promoted &&
      completedMissions.includes('OPS-001') === promoted &&
      persistentEvidence.includes('EV-005') === anomalyRecorded
    );
  });
const currentSaveSchema = z
  .object({
    version: z.literal(LOCAL_SAVE_FORMAT_VERSION),
    profile: currentProfileSchema.nullable(),
    settings: settingsSchema
  })
  .strict();

type StoredLocalSave = Readonly<{
  version: typeof LOCAL_SAVE_FORMAT_VERSION;
  profile: LocalOperativeProfile | null;
  settings: OperativeSettings;
}>;

export type LocalSaveLoadResult = Readonly<{
  data: LocalSaveData;
  notice: string | null;
}>;

export type LocalSaveWriteResult =
  Readonly<{ saved: true }> | Readonly<{ saved: false; notice: string }>;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalSaveStorage {
  load(): LocalSaveLoadResult;
  save(data: LocalSaveData): LocalSaveWriteResult;
}

export function createLocalSaveStorage(storage: KeyValueStorage): LocalSaveStorage {
  return {
    load() {
      let storedValue: string | null;

      try {
        storedValue = storage.getItem(LOCAL_SAVE_STORAGE_KEY);
      } catch {
        return {
          data: createEmptyLocalSave(),
          notice: 'Local progress could not be read. You can continue for this session.'
        };
      }

      if (storedValue === null) {
        return { data: createEmptyLocalSave(), notice: null };
      }

      try {
        const parsed: unknown = JSON.parse(storedValue);
        const currentResult = currentSaveSchema.safeParse(parsed);

        if (currentResult.success) {
          return {
            data: {
              profile: currentResult.data.profile,
              settings: currentResult.data.settings
            },
            notice: null
          };
        }

        const version11Result = version11SaveSchema.safeParse(parsed);

        if (version11Result.success) {
          return { data: migrateVersion11Save(version11Result.data), notice: null };
        }

        const version10Result = version10SaveSchema.safeParse(parsed);

        if (version10Result.success) {
          return { data: migrateVersion10Save(version10Result.data), notice: null };
        }

        const version9Result = version9SaveSchema.safeParse(parsed);

        if (version9Result.success) {
          return { data: migrateVersion9Save(version9Result.data), notice: null };
        }

        const version8Result = version8SaveSchema.safeParse(parsed);

        if (version8Result.success) {
          return { data: migrateVersion8Save(version8Result.data), notice: null };
        }

        const version7Result = version7SaveSchema.safeParse(parsed);

        if (version7Result.success) {
          return { data: migrateVersion7Save(version7Result.data), notice: null };
        }

        const version6Result = version6SaveSchema.safeParse(parsed);

        if (version6Result.success) {
          return { data: migrateVersion6Save(version6Result.data), notice: null };
        }

        const version5Result = version5SaveSchema.safeParse(parsed);

        if (version5Result.success) {
          return { data: migrateVersion5Save(version5Result.data), notice: null };
        }

        const version4Result = version4SaveSchema.safeParse(parsed);

        if (version4Result.success) {
          return { data: migrateVersion4Save(version4Result.data), notice: null };
        }

        const version3Result = version3SaveSchema.safeParse(parsed);

        if (version3Result.success) {
          return { data: migrateVersion3Save(version3Result.data), notice: null };
        }

        const version2Result = version2SaveSchema.safeParse(parsed);

        if (version2Result.success) {
          return { data: migrateVersion2Save(version2Result.data), notice: null };
        }

        const version1Result = version1SaveSchema.safeParse(parsed);

        if (version1Result.success) {
          return { data: migrateVersion1Save(version1Result.data), notice: null };
        }

        return invalidStoredDataResult();
      } catch {
        return invalidStoredDataResult();
      }
    },

    save(data) {
      const storedData: StoredLocalSave = {
        version: LOCAL_SAVE_FORMAT_VERSION,
        profile: data.profile,
        settings: data.settings
      };

      try {
        storage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(storedData));
        return { saved: true };
      } catch {
        return {
          saved: false,
          notice: 'Changes are active for this session but could not be saved on this device.'
        };
      }
    }
  };
}

function migrateVersion1Save(data: z.infer<typeof version1SaveSchema>): LocalSaveData {
  return migratePrototypeSave(data.profile, data.settings, 'applicant-at-hq');
}

function migrateVersion2Save(data: z.infer<typeof version2SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.stage4Progression ?? 'applicant-at-hq'
  );
}

function migrateVersion3Save(data: z.infer<typeof version3SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.progression ?? 'applicant-at-hq'
  );
}

function migrateVersion4Save(data: z.infer<typeof version4SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.progression ?? 'applicant-at-hq'
  );
}

function migrateVersion5Save(data: z.infer<typeof version5SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.progression ?? 'applicant-at-hq'
  );
}

function migrateVersion6Save(data: z.infer<typeof version6SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.progression ?? 'applicant-at-hq'
  );
}

function migrateVersion7Save(data: z.infer<typeof version7SaveSchema>): LocalSaveData {
  return migratePrototypeSave(
    data.profile,
    data.settings,
    data.profile?.progression ?? 'applicant-at-hq'
  );
}

function migrateVersion8Save(data: z.infer<typeof version8SaveSchema>): LocalSaveData {
  if (data.profile?.activeCheckpoint == null) {
    return {
      profile: data.profile === null ? null : { ...data.profile, activeCheckpoint: null },
      settings: data.settings
    };
  }
  const checkpoint = data.profile.activeCheckpoint;
  return {
    settings: data.settings,
    profile: {
      ...data.profile,
      activeCheckpoint: {
        ...checkpoint,
        checkpointVersion: 10,
        preparedBrowserRoute: null,
        missionControl: {
          input: checkpoint.preparedMissionControlFlag ?? '',
          validation: 'idle',
          preparationSource: checkpoint.preparedMissionControlFlag === null ? null : 'evidence',
          revision: checkpoint.preparedMissionControlFlag === null ? 0 : 1
        },
        hintProgress: [],
        relatedErrorStreak: null,
        verifiedEvidenceIds: []
      }
    }
  };
}

function migrateVersion9Save(data: z.infer<typeof version9SaveSchema>): LocalSaveData {
  return {
    settings: data.settings,
    profile:
      data.profile === null
        ? null
        : {
            ...data.profile,
            activeCheckpoint:
              data.profile.activeCheckpoint === null
                ? null
                : { ...data.profile.activeCheckpoint, checkpointVersion: 10 }
          }
  };
}

function migrateVersion10Save(data: z.infer<typeof version10SaveSchema>): LocalSaveData {
  if (data.profile === null) return { profile: null, settings: data.settings };
  const checkpoint = data.profile.activeCheckpoint;
  if (checkpoint === null) {
    return { profile: { ...data.profile, activeCheckpoint: null }, settings: data.settings };
  }
  const retainedNotice = checkpoint.pendingByteNotices.at(-1);
  const replacedNotices = checkpoint.pendingByteNotices.slice(0, -1);
  const progression =
    checkpoint.progression === 'incident-teaser-pending'
      ? ('incident-teaser-read' as const)
      : checkpoint.progression;
  return {
    settings: data.settings,
    profile: {
      ...data.profile,
      progression,
      activeCheckpoint: {
        ...checkpoint,
        checkpointVersion: 10,
        progression,
        pendingByteNotices: retainedNotice === undefined ? [] : [retainedNotice],
        seenByteNotices: replacedNotices.reduce<readonly (typeof BYTE_NOTICE_IDS)[number][]>(
          (seen, notice) => (seen.includes(notice) ? seen : [...seen, notice]),
          checkpoint.seenByteNotices
        )
      }
    }
  };
}

function migrateVersion11Save(data: z.infer<typeof version11SaveSchema>): LocalSaveData {
  if (data.profile === null) return { profile: null, settings: data.settings };
  const checkpoint = data.profile.activeCheckpoint;
  if (checkpoint === null) {
    return { profile: { ...data.profile, activeCheckpoint: null }, settings: data.settings };
  }
  const progression =
    checkpoint.progression === 'incident-teaser-read'
      ? ('operation-completion' as const)
      : checkpoint.progression;
  return {
    settings: data.settings,
    profile: {
      ...data.profile,
      progression,
      activeCheckpoint: {
        ...checkpoint,
        checkpointVersion: 10,
        progression
      }
    }
  };
}

type PrototypeProfile = Readonly<{
  codename: string;
  rank: 'Applicant';
  badges: readonly string[];
  completedMissions: readonly string[];
  persistentEvidence: readonly string[];
  fieldManualEntries: readonly string[];
  activeCheckpoint: unknown;
}>;

function migratePrototypeSave(
  profile: PrototypeProfile | null,
  settings: z.infer<typeof legacySettingsSchema> | OperativeSettings,
  progression: string
): LocalSaveData {
  if (profile === null) {
    return {
      profile: null,
      settings: 'commandAssistance' in settings ? settings : migrateLegacySettings(settings)
    };
  }

  const checkpointWasActive = profile.activeCheckpoint !== null;
  const safeProgression: Ops001Progression = checkpointWasActive
    ? 'ops001-available'
    : normaliseInactiveProgression(progression);

  return {
    profile: {
      codename: profile.codename,
      rank: profile.rank,
      badges: profile.badges,
      completedMissions: profile.completedMissions,
      persistentEvidence: profile.persistentEvidence,
      fieldManualEntries: migrateLegacyManualEntries(profile.fieldManualEntries),
      progression: safeProgression,
      activeCheckpoint: null
    },
    settings: 'commandAssistance' in settings ? settings : migrateLegacySettings(settings)
  };
}

function normaliseInactiveProgression(progression: string): Ops001Progression {
  return progression === 'applicant-at-hq' ||
    progression === 'welcome-read' ||
    progression === 'ops001-available' ||
    progression === 'briefing-read'
    ? progression
    : 'ops001-available';
}

function migrateLegacySettings(settings: z.infer<typeof legacySettingsSchema>): OperativeSettings {
  return { ...settings, commandAssistance: false };
}

function migrateLegacyManualEntries(entries: readonly string[]): readonly FieldManualEntryId[] {
  return entries.filter((entry): entry is FieldManualEntryId =>
    (FIELD_MANUAL_ENTRY_IDS as readonly string[]).includes(entry)
  );
}

export function createBrowserLocalSaveStorage(): LocalSaveStorage {
  return createLocalSaveStorage({
    getItem(key) {
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    }
  });
}

function invalidStoredDataResult(): LocalSaveLoadResult {
  return {
    data: createEmptyLocalSave(),
    notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
  };
}
