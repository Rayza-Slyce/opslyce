import {
  createApplicantProfile,
  createEmptyLocalSave,
  createOps001ActiveCheckpoint
} from '../profile/localProfile';
import { createInitialEngineState, transitionEngine, type GameEngineState } from './gameEngine';

function applicantState() {
  return createInitialEngineState(
    {
      profile: createApplicantProfile('Nova'),
      settings: createEmptyLocalSave().settings
    },
    null
  );
}

function persistedEvent(
  type:
    | 'communications/open-welcome'
    | 'communications/return-dashboard'
    | 'operation/open'
    | 'operation/deploy'
) {
  return { type, storageNotice: null } as const;
}

function deployedState() {
  return {
    ...applicantState(),
    screen: 'mission-workspace' as const,
    profile: {
      ...createApplicantProfile('Nova'),
      progression: 'operation-active-locate-message' as const,
      activeCheckpoint: createOps001ActiveCheckpoint()
    }
  };
}

function submit(
  state: GameEngineState,
  input: string,
  provenance: 'independent' | 'prepared' = 'independent'
) {
  return transitionEngine(state, {
    type: 'terminal/submit-command',
    input,
    provenance,
    storageNotice: null
  });
}

describe('Stage 7 engine transitions', () => {
  it('sends fresh devices to registration and existing profiles to the Dashboard', () => {
    expect(
      transitionEngine(createInitialEngineState(createEmptyLocalSave(), null), {
        type: 'title/enter-hq'
      }).screen
    ).toBe('codename-registration');
    expect(transitionEngine(applicantState(), { type: 'title/enter-hq' }).screen).toBe('dashboard');
  });

  it('implements the explicit welcome, operation, briefing and deployment progression', () => {
    const dashboard = transitionEngine(applicantState(), { type: 'title/enter-hq' });
    const welcome = transitionEngine(dashboard, persistedEvent('communications/open-welcome'));
    const available = transitionEngine(welcome, persistedEvent('communications/return-dashboard'));
    const briefing = transitionEngine(available, persistedEvent('operation/open'));
    const deployed = transitionEngine(briefing, persistedEvent('operation/deploy'));

    expect(welcome.profile?.progression).toBe('welcome-read');
    expect(welcome.screen).toBe('welcome-transmission');
    expect(available.profile?.progression).toBe('ops001-available');
    expect(briefing.profile?.progression).toBe('briefing-read');
    expect(briefing.screen).toBe('mission-briefing');
    expect(deployed.profile?.progression).toBe('operation-active-locate-message');
    expect(deployed.profile?.activeCheckpoint).toEqual(createOps001ActiveCheckpoint());
    expect(deployed.screen).toBe('mission-workspace');
  });

  it('does not open a briefing or deploy before the required player actions', () => {
    const dashboard = transitionEngine(applicantState(), { type: 'title/enter-hq' });

    expect(transitionEngine(dashboard, persistedEvent('operation/open'))).toEqual(dashboard);
    expect(transitionEngine(dashboard, persistedEvent('operation/deploy'))).toEqual(dashboard);
  });

  it('opens a resume summary before restoring a genuine Workspace checkpoint', () => {
    const undeployed = applicantState();
    const briefing = {
      ...applicantState(),
      profile: { ...createApplicantProfile('Nova'), progression: 'briefing-read' as const }
    };
    const deployed = transitionEngine(briefing, persistedEvent('operation/deploy'));

    expect(transitionEngine(undeployed, { type: 'title/continue-operation' }).screen).toBe('title');
    expect(transitionEngine(deployed, { type: 'navigation/return-title' }).screen).toBe('title');
    expect(
      transitionEngine(transitionEngine(deployed, { type: 'navigation/return-title' }), {
        type: 'title/open-resume-summary'
      }).screen
    ).toBe('resume-summary');
    const summary = transitionEngine(
      transitionEngine(deployed, { type: 'navigation/return-title' }),
      { type: 'title/open-resume-summary' }
    );
    expect(transitionEngine(summary, { type: 'title/continue-operation' }).screen).toBe(
      'mission-workspace'
    );
  });

  it('keeps Settings updates on the current view', () => {
    const briefing = {
      ...applicantState(),
      screen: 'mission-briefing' as const,
      profile: { ...createApplicantProfile('Nova'), progression: 'briefing-read' as const }
    };
    const updated = transitionEngine(briefing, {
      type: 'settings/updated',
      data: {
        profile: briefing.profile,
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      },
      notice: null
    });

    expect(updated.screen).toBe('mission-briefing');
    expect(updated.settings.soundEffects).toBe(false);
  });

  it('restarts the current operation from a clean OPS-001 checkpoint without deleting the profile', () => {
    const progressed = submit(submit(deployedState(), 'ls'), 'cat welcome.txt');
    expect(progressed.profile).toMatchObject({
      codename: 'Nova',
      progression: 'welcome-read-in-terminal',
      fieldManualEntries: ['command-ls', 'note-files-folders', 'command-cat']
    });

    const restarted = transitionEngine(progressed, {
      type: 'operation/restart-current',
      storageNotice: null
    });

    expect(restarted).toMatchObject({
      screen: 'mission-workspace',
      profile: {
        codename: 'Nova',
        rank: 'Applicant',
        progression: 'operation-active-locate-message',
        fieldManualEntries: [],
        activeCheckpoint: {
          progression: 'operation-active-locate-message',
          objectiveId: 'OBJ-001',
          activeEvidenceIds: [],
          completedMilestones: [],
          pendingByteNotices: [],
          seenByteNotices: []
        }
      }
    });
    expect(restarted.profile?.activeCheckpoint?.terminal.commandHistory).toEqual([]);
    expect(restarted.profile?.activeCheckpoint?.terminal.visibleInteractions).toEqual([]);
  });

  it('does not restart OPS-001 after the operation has entered post-mission HQ state', () => {
    const state = deployedState();
    const completed = {
      ...state,
      screen: 'dashboard' as const,
      profile: {
        ...state.profile,
        progression: 'operation-complete' as const,
        activeCheckpoint: {
          ...state.profile.activeCheckpoint,
          progression: 'operation-complete' as const
        }
      }
    };

    expect(
      transitionEngine(completed, { type: 'operation/restart-current', storageNotice: null })
    ).toBe(completed);
  });

  it('resets all profile progression while retaining settings and returning to title', () => {
    const deployed = {
      ...applicantState(),
      screen: 'mission-workspace' as const,
      profile: {
        ...createApplicantProfile('Nova'),
        badges: ['ghost-file'],
        completedMissions: ['OPS-001'],
        persistentEvidence: ['intrusion-mark'],
        fieldManualEntries: ['command-ls'] as const,
        progression: 'operation-active-locate-message' as const,
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    };

    const reset = transitionEngine(deployed, {
      type: 'progress/reset',
      data: { profile: null, settings: deployed.settings },
      notice: null
    });

    expect(reset).toMatchObject({
      profile: null,
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true },
      screen: 'title',
      storageNotice: null
    });
  });

  it('submits Terminal commands through the engine and ignores whitespace', () => {
    const deployed = {
      ...applicantState(),
      screen: 'mission-workspace' as const,
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message' as const,
        activeCheckpoint: createOps001ActiveCheckpoint()
      }
    };
    const submitted = transitionEngine(deployed, {
      type: 'terminal/submit-command',
      input: 'cd training',
      provenance: 'independent',
      storageNotice: null
    });
    expect(submitted.profile?.activeCheckpoint?.terminal).toMatchObject({
      currentDirectory: '/home/recruit/training',
      commandHistory: ['cd training'],
      commandsUsed: ['cd']
    });
    expect(
      transitionEngine(submitted, {
        type: 'terminal/submit-command',
        input: '  ',
        provenance: 'independent',
        storageNotice: null
      })
    ).toBe(submitted);
  });

  it('preserves every Terminal field while switching Workspace tools', () => {
    const checkpoint = createOps001ActiveCheckpoint();
    const terminalResult = transitionEngine(
      {
        ...applicantState(),
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'operation-active-locate-message',
          activeCheckpoint: checkpoint
        }
      },
      {
        type: 'terminal/submit-command',
        input: 'cat welcome.txt',
        provenance: 'independent',
        storageNotice: null
      }
    );
    const before = terminalResult.profile?.activeCheckpoint?.terminal;
    const evidence = transitionEngine(terminalResult, {
      type: 'workspace/select-tool',
      tool: 'evidence',
      storageNotice: null
    });
    const terminal = transitionEngine(evidence, {
      type: 'workspace/select-tool',
      tool: 'terminal',
      storageNotice: null
    });
    expect(terminal.profile?.activeCheckpoint?.terminal).toEqual(before);
  });

  it('completes OBJ-001 and OBJ-002 from genuine first-open events', () => {
    const welcome = submit(deployedState(), 'cat welcome.txt');
    expect(welcome.profile).toMatchObject({
      progression: 'welcome-read-in-terminal',
      fieldManualEntries: ['command-cat'],
      activeCheckpoint: {
        objectiveId: 'OBJ-002',
        completedMilestones: ['OBJ-001'],
        activeEvidenceIds: []
      }
    });

    const note = submit(welcome, 'cat training/trace-note.txt');
    expect(note.profile).toMatchObject({
      progression: 'verification-route-recovered',
      fieldManualEntries: ['command-cat', 'note-browser-routes'],
      activeCheckpoint: {
        objectiveId: 'OBJ-003',
        completedMilestones: ['OBJ-001', 'OBJ-002'],
        activeEvidenceIds: ['EV-001', 'EV-002']
      }
    });
  });

  it('supports the direct trace-note path without regressions or duplicate effects', () => {
    const direct = submit(deployedState(), 'cat training/trace-note.txt');
    const repeated = submit(direct, 'cat training/trace-note.txt');
    const laterWelcome = submit(repeated, 'cat welcome.txt');

    expect(laterWelcome.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-003',
      completedMilestones: ['OBJ-001', 'OBJ-002'],
      activeEvidenceIds: ['EV-001', 'EV-002'],
      pendingByteNotices: ['verification-route-recovered'],
      seenByteNotices: ['command-cat']
    });
    expect(laterWelcome.profile?.fieldManualEntries).toEqual([
      'command-cat',
      'note-browser-routes'
    ]);
  });

  it('keeps equipment reads, errors and failed cats free of mission progression', () => {
    const equipment = submit(deployedState(), 'cat training/equipment.txt');
    const missing = submit(equipment, 'cat missing.txt');
    expect(missing.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-001',
      completedMilestones: [],
      activeEvidenceIds: []
    });
  });

  it('replaces the live command explanation while preserving exact Manual unlocks', () => {
    const help = submit(deployedState(), 'help');
    const listed = submit(help, 'ls');
    const unchangedCd = submit(listed, 'cd .');
    const changedCd = submit(unchangedCd, 'cd training');
    const cleared = submit(changedCd, 'clear');

    expect(cleared.profile?.fieldManualEntries).toEqual([
      'command-help',
      'command-ls',
      'note-files-folders',
      'command-cd',
      'note-paths',
      'command-clear'
    ]);
    expect(cleared.profile?.activeCheckpoint?.pendingByteNotices).toEqual(['command-clear']);
    expect(cleared.profile?.activeCheckpoint?.seenByteNotices).toEqual([
      'command-help',
      'command-ls',
      'command-cd'
    ]);
    const dismissed = transitionEngine(cleared, {
      type: 'byte/dismiss-notice',
      storageNotice: null
    });
    expect(dismissed.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: [],
      seenByteNotices: ['command-help', 'command-ls', 'command-cd', 'command-clear']
    });
  });

  it('keeps failed and repeated commands from replacing or replaying the live explanation', () => {
    const listed = submit(deployedState(), 'ls');
    const failed = submit(listed, 'cat missing.txt');
    expect(failed.profile?.activeCheckpoint?.pendingByteNotices).toEqual(['command-ls']);

    const read = submit(failed, 'cat welcome.txt');
    expect(read.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: ['command-cat'],
      seenByteNotices: ['command-ls']
    });

    const repeated = submit(read, 'ls');
    expect(repeated.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: ['command-cat'],
      seenByteNotices: ['command-ls']
    });
  });

  it('uses one newest-wins automatic slot across command, file and flag feedback', () => {
    const listed = submit(deployedState(), 'ls');
    const note = submit(listed, 'cat training/trace-note.txt');
    expect(note.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: ['verification-route-recovered'],
      seenByteNotices: ['command-ls', 'command-cat']
    });

    const flag = transitionEngine(note, {
      type: 'browser/open-route',
      input: '/recruit-verification',
      storageNotice: null
    });
    expect(flag.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: ['verification-flag-recovered'],
      seenByteNotices: ['command-ls', 'command-cat', 'verification-route-recovered']
    });

    const dismissed = transitionEngine(flag, {
      type: 'byte/dismiss-notice',
      storageNotice: null
    });
    expect(dismissed.profile?.activeCheckpoint).toMatchObject({
      pendingByteNotices: [],
      seenByteNotices: [
        'command-ls',
        'command-cat',
        'verification-route-recovered',
        'verification-flag-recovered'
      ]
    });
  });

  it('persists prepared commands with provenance and clears them without Terminal loss', () => {
    const prepared = transitionEngine(deployedState(), {
      type: 'terminal/prepare-command',
      value: 'ls ',
      source: 'command-guide',
      storageNotice: null
    });
    expect(prepared.profile?.activeCheckpoint?.preparedCommand).toEqual({
      value: 'ls ',
      source: 'command-guide',
      revision: 1
    });
    const preparedAgain = transitionEngine(prepared, {
      type: 'terminal/prepare-command',
      value: 'ls ',
      source: 'command-guide',
      storageNotice: null
    });
    expect(preparedAgain.profile?.activeCheckpoint?.preparedCommand?.revision).toBe(2);
    const executed = transitionEngine(preparedAgain, {
      type: 'terminal/submit-command',
      input: 'ls ',
      provenance: 'prepared',
      storageNotice: null
    });
    expect(executed.profile?.activeCheckpoint?.preparedCommand).toBeNull();
    expect(executed.profile?.activeCheckpoint?.terminal.visibleInteractions[0]?.provenance).toBe(
      'prepared'
    );
  });

  it('keeps EV-002 route transfer outside engine progression', () => {
    const recovered = submit(deployedState(), 'cat training/trace-note.txt');
    expect(recovered.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-003',
      activeTool: 'terminal',
      progression: 'verification-route-recovered',
      browser: { history: [{ kind: 'page', route: '/' }], historyIndex: 0 }
    });
    expect(recovered.profile?.activeCheckpoint?.completedMilestones).toEqual([
      'OBJ-001',
      'OBJ-002'
    ]);
  });

  it('allows optional public browsing without mission effects', () => {
    const about = transitionEngine(deployedState(), {
      type: 'browser/open-route',
      input: '/about',
      storageNotice: null
    });
    expect(about.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-001',
      activeTool: 'terminal',
      activeEvidenceIds: [],
      browser: { historyIndex: 1 }
    });
  });

  it('keeps the guessed mission route unknown until discovery', () => {
    const guessed = transitionEngine(deployedState(), {
      type: 'browser/open-route',
      input: '/recruit-verification',
      storageNotice: null
    });
    expect(guessed.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-001',
      activeEvidenceIds: [],
      browser: {
        historyIndex: 1,
        history: [
          { kind: 'page', route: '/' },
          {
            kind: 'error',
            error: 'route-not-found',
            enteredValue: '/recruit-verification'
          }
        ]
      }
    });
  });

  it('opens the recovered route once and prepares but never submits its flag', () => {
    const recovered = submit(deployedState(), 'cat training/trace-note.txt');
    const opened = transitionEngine(recovered, {
      type: 'browser/open-route',
      input: '/recruit-verification',
      storageNotice: null
    });
    expect(opened.profile).toMatchObject({
      progression: 'verification-flag-recovered',
      fieldManualEntries: ['command-cat', 'note-browser-routes', 'note-verification-flags'],
      activeCheckpoint: {
        objectiveId: 'OBJ-004',
        completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'],
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'],
        pendingByteNotices: ['verification-flag-recovered'],
        seenByteNotices: ['command-cat', 'verification-route-recovered']
      }
    });
    const repeated = transitionEngine(opened, {
      type: 'browser/open-route',
      input: '/recruit-verification',
      storageNotice: null
    });
    expect(repeated.profile?.activeCheckpoint?.activeEvidenceIds).toEqual([
      'EV-001',
      'EV-002',
      'EV-003'
    ]);
    const prepared = transitionEngine(opened, {
      type: 'evidence/prepare-mission-control',
      storageNotice: null
    });
    expect(prepared.profile?.activeCheckpoint?.missionControl).toMatchObject({
      input: 'FLAG{WELCOME_TO_HQ}',
      preparationSource: 'evidence'
    });
    expect(prepared.profile?.activeCheckpoint?.objectiveId).toBe('OBJ-004');
  });
});

describe('Stage 9 guidance and verification transitions', () => {
  it('reveals guidance in order and Byte Assist prepares without executing', () => {
    const initial = deployedState();
    const outOfOrder = transitionEngine(initial, {
      type: 'byte/reveal-hint',
      hintId: 'H-001',
      level: 'instruction',
      storageNotice: null
    });
    expect(outOfOrder).toBe(initial);
    const nudged = transitionEngine(initial, {
      type: 'byte/reveal-hint',
      hintId: 'H-001',
      level: 'nudge',
      storageNotice: null
    });
    const instructed = transitionEngine(nudged, {
      type: 'byte/reveal-hint',
      hintId: 'H-001',
      level: 'instruction',
      storageNotice: null
    });
    const assisted = transitionEngine(instructed, {
      type: 'byte/use-assist',
      hintId: 'H-001',
      storageNotice: null
    });
    expect(assisted.profile?.activeCheckpoint).toMatchObject({
      hintProgress: [{ hintId: 'H-001', level: 'assist' }],
      preparedCommand: { value: 'ls', source: 'byte-assist', revision: 1 },
      terminal: { commandHistory: [], visibleInteractions: [] }
    });
  });

  it('offers Byte only after two related Terminal errors and clears it on progress', () => {
    const once = submit(deployedState(), 'cat missing.txt');
    expect(once.profile?.activeCheckpoint?.relatedErrorStreak).toEqual({
      hintId: 'H-001',
      count: 1
    });
    const twice = submit(once, 'cat missing.txt');
    expect(twice.profile?.activeCheckpoint?.relatedErrorStreak).toEqual({
      hintId: 'H-001',
      count: 2
    });
    const progressed = submit(twice, 'ls');
    expect(progressed.profile?.activeCheckpoint?.relatedErrorStreak).toBeNull();
  });

  it('keeps rejected flag input recoverable and prevents a correct early guess', () => {
    const entered = transitionEngine(deployedState(), {
      type: 'mission-control/update-input',
      value: 'FLAG{WELCOME_TO_HQ}',
      storageNotice: null
    });
    const rejected = transitionEngine(entered, {
      type: 'mission-control/submit',
      storageNotice: null
    });
    expect(rejected.profile?.activeCheckpoint?.missionControl).toMatchObject({
      input: 'FLAG{WELCOME_TO_HQ}',
      validation: 'incorrect'
    });
    expect(rejected.profile?.activeCheckpoint?.objectiveId).toBe('OBJ-001');
  });

  it('atomically verifies OBJ-004, EV-003 and EV-004 once after genuine discovery', () => {
    const initial = createOps001ActiveCheckpoint('evidence');
    const checkpoint = {
      ...initial,
      progression: 'verification-flag-recovered' as const,
      objectiveId: 'OBJ-004' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'] as const,
      missionControl: {
        ...initial.missionControl,
        input: '  flag{welcome_to_hq}  '
      }
    };
    const state: GameEngineState = {
      ...deployedState(),
      profile: {
        ...createApplicantProfile('Nova'),
        progression: checkpoint.progression,
        activeCheckpoint: checkpoint
      }
    };
    const verified = transitionEngine(state, {
      type: 'mission-control/submit',
      storageNotice: null
    });
    expect(verified.profile).toMatchObject({
      progression: 'operation-verified',
      activeCheckpoint: {
        progression: 'operation-verified',
        objectiveId: 'OBJ-005',
        completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'],
        verifiedEvidenceIds: ['EV-003'],
        missionControl: { validation: 'accepted' }
      }
    });
    expect(
      transitionEngine(verified, { type: 'mission-control/submit', storageNotice: null })
    ).toBe(verified);
  });

  it('prepares Browser and Mission Control assists without navigating or submitting', () => {
    const base = createOps001ActiveCheckpoint();
    const routeCheckpoint = {
      ...base,
      progression: 'verification-route-recovered' as const,
      objectiveId: 'OBJ-003' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002'] as const
    };
    let routeState: GameEngineState = {
      ...deployedState(),
      profile: {
        ...createApplicantProfile('Nova'),
        progression: routeCheckpoint.progression,
        activeCheckpoint: routeCheckpoint
      }
    };
    for (const level of ['nudge', 'instruction'] as const) {
      routeState = transitionEngine(routeState, {
        type: 'byte/reveal-hint',
        hintId: 'H-004',
        level,
        storageNotice: null
      });
    }
    routeState = transitionEngine(routeState, {
      type: 'byte/use-assist',
      hintId: 'H-004',
      storageNotice: null
    });
    expect(routeState.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-003',
      browser: base.browser,
      preparedBrowserRoute: {
        value: '/recruit-verification',
        source: 'byte-assist'
      }
    });

    const homeState = transitionEngine(routeState, {
      type: 'browser/home',
      storageNotice: null
    });
    expect(homeState.profile?.activeCheckpoint).toMatchObject({
      preparedBrowserRoute: null,
      browser: { history: [{ kind: 'page', route: '/' }], historyIndex: 0 }
    });

    let backState = transitionEngine(routeState, {
      type: 'browser/open-route',
      input: '/about',
      storageNotice: null
    });
    backState = transitionEngine(backState, {
      type: 'browser/open-route',
      input: '/systems',
      storageNotice: null
    });
    backState = transitionEngine(backState, {
      type: 'byte/use-assist',
      hintId: 'H-004',
      storageNotice: null
    });
    expect(backState.profile?.activeCheckpoint?.preparedBrowserRoute?.value).toBe(
      '/recruit-verification'
    );
    backState = transitionEngine(backState, { type: 'browser/back', storageNotice: null });
    expect(backState.profile?.activeCheckpoint).toMatchObject({
      preparedBrowserRoute: null,
      browser: { historyIndex: 1 }
    });
    expect(backState.profile?.activeCheckpoint?.browser.history[1]).toEqual({
      kind: 'page',
      route: '/about'
    });

    const flagCheckpoint = {
      ...base,
      progression: 'verification-flag-recovered' as const,
      objectiveId: 'OBJ-004' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'] as const
    };
    let flagState: GameEngineState = {
      ...deployedState(),
      profile: {
        ...createApplicantProfile('Nova'),
        progression: flagCheckpoint.progression,
        activeCheckpoint: flagCheckpoint
      }
    };
    for (const level of ['nudge', 'instruction'] as const) {
      flagState = transitionEngine(flagState, {
        type: 'byte/reveal-hint',
        hintId: 'H-005',
        level,
        storageNotice: null
      });
    }
    flagState = transitionEngine(flagState, {
      type: 'byte/use-assist',
      hintId: 'H-005',
      storageNotice: null
    });
    expect(flagState.profile?.activeCheckpoint).toMatchObject({
      objectiveId: 'OBJ-004',
      missionControl: {
        input: 'FLAG{WELCOME_TO_HQ}',
        validation: 'idle',
        preparationSource: 'byte-assist'
      }
    });
  });
});

describe('Stage 10 debrief, reward and contained anomaly transitions', () => {
  function operationVerifiedState() {
    const initial = createOps001ActiveCheckpoint('evidence');
    const checkpoint = {
      ...initial,
      progression: 'operation-verified' as const,
      objectiveId: 'OBJ-005' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'] as const,
      verifiedEvidenceIds: ['EV-003'] as const,
      missionControl: {
        ...initial.missionControl,
        input: 'FLAG{WELCOME_TO_HQ}',
        validation: 'accepted' as const
      }
    };
    return {
      ...deployedState(),
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-verified' as const,
        activeCheckpoint: checkpoint
      }
    } satisfies GameEngineState;
  }

  it('enters the debrief only after the verified transition is explicitly completed', () => {
    const verified = operationVerifiedState();
    expect(verified.screen).toBe('mission-workspace');
    expect(verified.profile.rank).toBe('Applicant');

    const debrief = transitionEngine(verified, {
      type: 'operation/enter-debrief',
      storageNotice: null
    });
    expect(debrief).toMatchObject({
      screen: 'mission-debrief',
      profile: {
        rank: 'Applicant',
        progression: 'debrief',
        badges: [],
        activeCheckpoint: { progression: 'debrief' }
      }
    });
  });

  it('requires Return to HQ before applying the rank and Ghost File exactly once', () => {
    const debrief = transitionEngine(operationVerifiedState(), {
      type: 'operation/enter-debrief',
      storageNotice: null
    });
    expect(debrief.profile?.rank).toBe('Applicant');
    expect(debrief.profile?.badges).toEqual([]);

    const promoted = transitionEngine(debrief, {
      type: 'debrief/return-hq',
      storageNotice: null
    });
    expect(promoted).toMatchObject({
      screen: 'dashboard',
      profile: {
        rank: 'Recruit Operative',
        badges: ['ghost-file'],
        completedMissions: ['OPS-001'],
        persistentEvidence: [],
        progression: 'recruit-operative',
        activeCheckpoint: {
          progression: 'recruit-operative',
          activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004']
        }
      }
    });
    expect(transitionEngine(promoted, { type: 'debrief/return-hq', storageNotice: null })).toBe(
      promoted
    );
  });

  it('records EV-005 once, gates the incoming incident behind evidence review and records it read once', () => {
    const debrief = transitionEngine(operationVerifiedState(), {
      type: 'operation/enter-debrief',
      storageNotice: null
    });
    const promoted = transitionEngine(debrief, {
      type: 'debrief/return-hq',
      storageNotice: null
    });
    const tooEarlyTeaser = transitionEngine(promoted, {
      type: 'hq/deliver-incident-teaser',
      storageNotice: null
    });
    expect(tooEarlyTeaser).toBe(promoted);

    const anomaly = transitionEngine(promoted, {
      type: 'hq/record-anomaly',
      storageNotice: null
    });
    expect(anomaly.profile).toMatchObject({
      progression: 'anomaly-recorded',
      persistentEvidence: ['EV-005'],
      activeCheckpoint: {
        progression: 'anomaly-recorded',
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005']
      }
    });
    expect(transitionEngine(anomaly, { type: 'hq/record-anomaly', storageNotice: null })).toBe(
      anomaly
    );

    const reactionsSettled = transitionEngine(anomaly, {
      type: 'hq/settle-anomaly-reactions',
      storageNotice: null
    });
    expect(reactionsSettled.profile?.progression).toBe('anomaly-review-pending');
    expect(
      transitionEngine(reactionsSettled, {
        type: 'hq/deliver-incident-teaser',
        storageNotice: null
      })
    ).toBe(reactionsSettled);

    const reviewCompleted = transitionEngine(reactionsSettled, {
      type: 'hq/complete-evidence-review',
      storageNotice: null
    });
    expect(reviewCompleted.profile?.progression).toBe('incident-teaser-pending');

    const teaser = transitionEngine(reviewCompleted, {
      type: 'hq/deliver-incident-teaser',
      storageNotice: null
    });
    expect(teaser.profile).toMatchObject({
      progression: 'incident-teaser-received',
      badges: ['ghost-file'],
      persistentEvidence: ['EV-005'],
      activeCheckpoint: {
        progression: 'incident-teaser-received',
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005']
      }
    });
    expect(
      transitionEngine(teaser, { type: 'hq/deliver-incident-teaser', storageNotice: null })
    ).toBe(teaser);

    const read = transitionEngine(teaser, {
      type: 'hq/read-incident-teaser',
      storageNotice: null
    });
    expect(read.profile?.progression).toBe('incident-teaser-read');
    expect(transitionEngine(read, { type: 'hq/read-incident-teaser', storageNotice: null })).toBe(
      read
    );
    const completion = transitionEngine(read, {
      type: 'hq/present-operation-completion',
      storageNotice: null
    });
    expect(completion.profile).toMatchObject({
      progression: 'operation-completion',
      activeCheckpoint: { progression: 'operation-completion' }
    });
    expect(
      transitionEngine(completion, {
        type: 'hq/present-operation-completion',
        storageNotice: null
      })
    ).toBe(completion);

    const resting = transitionEngine(completion, {
      type: 'hq/return-from-operation-completion',
      storageNotice: null
    });
    expect(resting.profile).toMatchObject({
      progression: 'operation-complete',
      activeCheckpoint: { progression: 'operation-complete' }
    });
    expect(
      transitionEngine(resting, {
        type: 'hq/return-from-operation-completion',
        storageNotice: null
      })
    ).toBe(resting);
    expect(read.profile?.activeCheckpoint?.activeEvidenceIds).toEqual([
      'EV-001',
      'EV-002',
      'EV-003',
      'EV-004',
      'EV-005'
    ]);
  });
});
