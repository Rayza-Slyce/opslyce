import {
  createApplicantProfile,
  createEmptyLocalSave,
  createOps001ActiveCheckpoint
} from '../profile/localProfile';
import {
  interpretTerminalCommand,
  TERMINAL_INPUT_LIMIT,
  type TerminalState
} from '../simulations/terminal/interpreter';
import { BROWSER_HISTORY_LIMIT, navigateBrowser } from '../simulations/browser/browserState';
import {
  createLocalSaveStorage,
  LOCAL_SAVE_FORMAT_VERSION,
  LOCAL_SAVE_STORAGE_KEY,
  type KeyValueStorage
} from './localSaveStorage';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function asVersion4Terminal(state: TerminalState) {
  return {
    currentDirectory: state.currentDirectory,
    commandHistory: state.commandHistory,
    visibleInteractions: state.visibleInteractions.map((interaction) => ({
      prompt: interaction.prompt,
      submittedCommand: interaction.submittedCommand,
      commandId: interaction.commandId,
      resultKind: interaction.resultKind,
      output: interaction.output,
      ...(interaction.suggestion === undefined ? {} : { suggestion: interaction.suggestion })
    })),
    commandsUsed: state.commandsUsed,
    openedFiles: state.openedFiles
  };
}

function version1Save(codename = 'Agent Seven') {
  return {
    version: 1,
    profile: {
      codename,
      rank: 'Applicant',
      badges: [] as string[],
      completedMissions: [] as string[],
      persistentEvidence: [] as string[],
      fieldManualEntries: [] as string[],
      activeCheckpoint: null
    },
    settings: { soundEffects: false, hqAmbience: true }
  } as const;
}

describe('versioned local save storage', () => {
  it('returns fresh defaults when no save exists', () => {
    const storage = createLocalSaveStorage(new MemoryStorage());

    expect(storage.load()).toEqual({ data: createEmptyLocalSave(), notice: null });
  });

  it('writes and reloads version 12 profile, Terminal checkpoint and settings data', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const data = {
      profile: {
        ...createApplicantProfile('Agent Seven'),
        progression: 'operation-active-locate-message' as const,
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    };

    expect(storage.save(data)).toEqual({ saved: true });
    expect(JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '')).toMatchObject({
      version: LOCAL_SAVE_FORMAT_VERSION
    });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('round-trips the expanded Stage 9 checkpoint state', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const checkpoint = createOps001ActiveCheckpoint();
    const listed = interpretTerminalCommand('ls', checkpoint.terminal, 'prepared');
    if (listed.kind !== 'executed') throw new Error('Expected ls to execute.');
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'verification-route-recovered' as const,
        fieldManualEntries: ['command-ls', 'note-files-folders', 'note-browser-routes'] as const,
        activeCheckpoint: {
          ...checkpoint,
          progression: 'verification-route-recovered' as const,
          objectiveId: 'OBJ-003' as const,
          completedMilestones: ['OBJ-001', 'OBJ-002'] as const,
          activeTool: 'evidence' as const,
          terminal: listed.state,
          activeEvidenceIds: ['EV-001', 'EV-002'] as const,
          preparedCommand: {
            value: 'cat welcome.txt',
            source: 'command-guide' as const,
            revision: 4
          },
          pendingByteNotices: ['verification-route-recovered'] as const,
          seenByteNotices: ['command-ls'] as const
        }
      },
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    };

    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('persists revealed hints and Byte route preparation in checkpoint version 10', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint();
    const checkpoint = {
      ...initial,
      progression: 'verification-route-recovered' as const,
      objectiveId: 'OBJ-003' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002'] as const,
      hintProgress: [{ hintId: 'H-004', level: 'assist' }] as const,
      preparedBrowserRoute: {
        value: '/recruit-verification' as const,
        source: 'byte-assist' as const,
        revision: 2
      }
    };
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: checkpoint.progression,
        activeCheckpoint: checkpoint
      },
      settings: createEmptyLocalSave().settings
    };
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('accepts an undiscovered verification-route error before route recovery', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint();
    const checkpoint = {
      ...initial,
      browser: navigateBrowser(initial.browser, '/recruit-verification', false).state
    };
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: checkpoint.progression,
        activeCheckpoint: checkpoint
      },
      settings: createEmptyLocalSave().settings
    };
    expect(checkpoint.browser.history.at(-1)).toEqual({
      kind: 'error',
      error: 'route-not-found',
      enteredValue: '/recruit-verification'
    });
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('rejects a successful verification page before OBJ-004 and EV-003', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint();
    storage.save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'verification-route-recovered',
        activeCheckpoint: {
          ...initial,
          progression: 'verification-route-recovered',
          objectiveId: 'OBJ-003',
          completedMilestones: ['OBJ-001', 'OBJ-002'],
          activeEvidenceIds: ['EV-001', 'EV-002'],
          browser: navigateBrowser(initial.browser, '/recruit-verification', true).state
        }
      },
      settings: createEmptyLocalSave().settings
    });
    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it('round-trips OBJ-004, EV-003, Browser history and prepared flag state', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint('evidence');
    const browser = navigateBrowser(initial.browser, '/recruit-verification', true).state;
    const checkpoint = {
      ...initial,
      progression: 'verification-flag-recovered' as const,
      objectiveId: 'OBJ-004' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const,
      browser,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'] as const,
      missionControl: {
        input: 'FLAG{WELCOME_TO_HQ}',
        validation: 'idle' as const,
        preparationSource: 'evidence' as const,
        revision: 1
      },
      pendingByteNotices: ['verification-flag-recovered'] as const
    };
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: checkpoint.progression,
        fieldManualEntries: ['note-verification-flags'] as const,
        activeCheckpoint: checkpoint
      },
      settings: createEmptyLocalSave().settings
    };
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('migrates a valid version-8 checkpoint without losing Stage 8 play', () => {
    const memory = new MemoryStorage();
    const initial = createOps001ActiveCheckpoint('evidence');
    const terminalResult = interpretTerminalCommand(
      'cat training/trace-note.txt',
      initial.terminal
    );
    if (terminalResult.kind !== 'executed') throw new Error('Expected cat to execute.');
    const browser = navigateBrowser(initial.browser, '/recruit-verification', true).state;
    const checkpoint = {
      missionId: 'OPS-001',
      checkpointVersion: 6,
      progression: 'verification-flag-recovered',
      objectiveId: 'OBJ-004',
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'],
      activeTool: 'evidence',
      browser,
      terminal: terminalResult.state,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'],
      preparedCommand: null,
      preparedMissionControlFlag: 'FLAG{WELCOME_TO_HQ}',
      pendingByteNotices: ['verification-flag-recovered'],
      seenByteNotices: []
    };
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 8,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'verification-flag-recovered',
          fieldManualEntries: ['command-cat', 'note-browser-routes', 'note-verification-flags'],
          activeCheckpoint: checkpoint
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      })
    );

    const loaded = createLocalSaveStorage(memory).load();
    expect(loaded.notice).toBeNull();
    expect(loaded.data.settings.commandAssistance).toBe(true);
    expect(loaded.data.profile?.activeCheckpoint).toMatchObject({
      checkpointVersion: 10,
      progression: 'verification-flag-recovered',
      objectiveId: 'OBJ-004',
      browser,
      terminal: terminalResult.state,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'],
      missionControl: {
        input: 'FLAG{WELCOME_TO_HQ}',
        validation: 'idle',
        preparationSource: 'evidence'
      },
      preparedBrowserRoute: null,
      hintProgress: [],
      relatedErrorStreak: null,
      verifiedEvidenceIds: []
    });
  });

  it('round-trips coherent verified state and rejects contradictory verified checkpoints', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint('evidence');
    const verified = {
      ...initial,
      progression: 'operation-verified' as const,
      objectiveId: 'OBJ-005' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'] as const,
      verifiedEvidenceIds: ['EV-003'] as const,
      missionControl: {
        input: 'FLAG{WELCOME_TO_HQ}',
        validation: 'accepted' as const,
        preparationSource: 'evidence' as const,
        revision: 1
      }
    };
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: verified.progression,
        activeCheckpoint: verified
      },
      settings: createEmptyLocalSave().settings
    };
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });

    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: LOCAL_SAVE_FORMAT_VERSION,
        ...data,
        profile: {
          ...data.profile,
          activeCheckpoint: {
            ...verified,
            activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'],
            verifiedEvidenceIds: []
          }
        }
      })
    );
    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it('migrates a valid version-9 verified checkpoint into checkpoint version 10', () => {
    const memory = new MemoryStorage();
    const initial = createOps001ActiveCheckpoint('evidence');
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 9,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'operation-verified',
          activeCheckpoint: {
            ...initial,
            checkpointVersion: 7,
            progression: 'operation-verified',
            objectiveId: 'OBJ-005',
            completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
            activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'],
            verifiedEvidenceIds: ['EV-003'],
            missionControl: {
              input: 'FLAG{WELCOME_TO_HQ}',
              validation: 'accepted',
              preparationSource: 'evidence',
              revision: 1
            }
          }
        },
        settings: createEmptyLocalSave().settings
      })
    );

    const loaded = createLocalSaveStorage(memory).load();
    expect(loaded.notice).toBeNull();
    expect(loaded.data.profile).toMatchObject({
      rank: 'Applicant',
      progression: 'operation-verified',
      activeCheckpoint: { checkpointVersion: 10, progression: 'operation-verified' }
    });
  });

  it('migrates version 10 final state as read and collapses queued Byte cards to the newest slot', () => {
    const memory = new MemoryStorage();
    const initial = createOps001ActiveCheckpoint('evidence');
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 10,
        profile: {
          ...createApplicantProfile('Nova'),
          rank: 'Recruit Operative',
          badges: ['ghost-file'],
          completedMissions: ['OPS-001'],
          persistentEvidence: ['EV-005'],
          progression: 'incident-teaser-pending',
          activeCheckpoint: {
            ...initial,
            checkpointVersion: 8,
            progression: 'incident-teaser-pending',
            objectiveId: 'OBJ-005',
            completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
            activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'],
            verifiedEvidenceIds: ['EV-003'],
            missionControl: {
              input: 'FLAG{WELCOME_TO_HQ}',
              validation: 'accepted',
              preparationSource: 'evidence',
              revision: 1
            },
            pendingByteNotices: [
              'command-cat',
              'verification-route-recovered',
              'verification-flag-recovered'
            ],
            seenByteNotices: []
          }
        },
        settings: createEmptyLocalSave().settings
      })
    );

    const loaded = createLocalSaveStorage(memory).load();
    expect(loaded.notice).toBeNull();
    expect(loaded.data.profile).toMatchObject({
      progression: 'incident-teaser-read',
      activeCheckpoint: {
        checkpointVersion: 10,
        progression: 'incident-teaser-read',
        pendingByteNotices: ['verification-flag-recovered'],
        seenByteNotices: ['command-cat', 'verification-route-recovered']
      }
    });
  });

  it('migrates a version-11 read incident into the one-time completion presentation', () => {
    const memory = new MemoryStorage();
    const initial = createOps001ActiveCheckpoint('evidence');
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 11,
        profile: {
          ...createApplicantProfile('Nova'),
          rank: 'Recruit Operative',
          badges: ['ghost-file'],
          completedMissions: ['OPS-001'],
          persistentEvidence: ['EV-005'],
          progression: 'incident-teaser-read',
          activeCheckpoint: {
            ...initial,
            checkpointVersion: 9,
            progression: 'incident-teaser-read',
            objectiveId: 'OBJ-005',
            completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
            activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'],
            verifiedEvidenceIds: ['EV-003'],
            missionControl: {
              input: 'FLAG{WELCOME_TO_HQ}',
              validation: 'accepted',
              preparationSource: 'evidence',
              revision: 1
            }
          }
        },
        settings: createEmptyLocalSave().settings
      })
    );

    expect(createLocalSaveStorage(memory).load()).toMatchObject({
      notice: null,
      data: {
        profile: {
          progression: 'operation-completion',
          activeCheckpoint: {
            checkpointVersion: 10,
            progression: 'operation-completion'
          }
        }
      }
    });
  });

  it('round-trips the final completion presentation and completed HQ resting states', () => {
    for (const progression of ['operation-completion', 'operation-complete'] as const) {
      const memory = new MemoryStorage();
      const storage = createLocalSaveStorage(memory);
      const initial = createOps001ActiveCheckpoint('evidence');
      const data = {
        profile: {
          ...createApplicantProfile('Nova'),
          rank: 'Recruit Operative' as const,
          badges: ['ghost-file'],
          completedMissions: ['OPS-001'],
          persistentEvidence: ['EV-005'],
          progression,
          activeCheckpoint: {
            ...initial,
            progression,
            objectiveId: 'OBJ-005' as const,
            completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
            activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'] as const,
            verifiedEvidenceIds: ['EV-003'] as const,
            missionControl: {
              input: 'FLAG{WELCOME_TO_HQ}',
              validation: 'accepted' as const,
              preparationSource: 'evidence' as const,
              revision: 1
            }
          }
        },
        settings: createEmptyLocalSave().settings
      };
      expect(storage.save(data)).toEqual({ saved: true });
      expect(storage.load()).toEqual({ data, notice: null });
    }
  });

  it('round-trips the coherent final Stage 10.4 reward, EV-005 and read teaser state', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint('evidence');
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        rank: 'Recruit Operative' as const,
        badges: ['ghost-file'],
        completedMissions: ['OPS-001'],
        persistentEvidence: ['EV-005'],
        progression: 'incident-teaser-read' as const,
        activeCheckpoint: {
          ...initial,
          progression: 'incident-teaser-read' as const,
          objectiveId: 'OBJ-005' as const,
          completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
          activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'] as const,
          verifiedEvidenceIds: ['EV-003'] as const,
          missionControl: {
            input: 'FLAG{WELCOME_TO_HQ}',
            validation: 'accepted' as const,
            preparationSource: 'evidence' as const,
            revision: 1
          }
        }
      },
      settings: createEmptyLocalSave().settings
    };

    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });

    const contradictory = JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '') as {
      profile: { progression: string; activeCheckpoint: { progression: string } };
    };
    contradictory.profile.progression = 'recruit-operative';
    contradictory.profile.activeCheckpoint.progression = 'recruit-operative';
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(contradictory));
    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it('keeps progressed Evidence valid after bounded history evicts its source page', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint('evidence');
    let browser = navigateBrowser(initial.browser, '/recruit-verification', true).state;
    const publicRoutes = ['/about', '/bulletins', '/systems'] as const;
    for (let index = 0; index < BROWSER_HISTORY_LIMIT + 2; index += 1) {
      const route = publicRoutes[index % publicRoutes.length] ?? '/';
      browser = navigateBrowser(browser, route, true).state;
    }
    expect(browser.history).toHaveLength(BROWSER_HISTORY_LIMIT);
    expect(browser.history).not.toContainEqual({ kind: 'page', route: '/recruit-verification' });

    const checkpoint = {
      ...initial,
      progression: 'verification-flag-recovered' as const,
      objectiveId: 'OBJ-004' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const,
      browser,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'] as const
    };
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: checkpoint.progression,
        fieldManualEntries: ['note-verification-flags'] as const,
        activeCheckpoint: checkpoint
      },
      settings: createEmptyLocalSave().settings
    };
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load()).toEqual({ data, notice: null });
  });

  it('rejects contradictory or malformed current Browser history', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    storage.save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: createEmptyLocalSave().settings
    });
    const stored = JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '') as {
      profile: { activeCheckpoint: { browser: { historyIndex: number } } };
    };
    stored.profile.activeCheckpoint.browser.historyIndex = 9;
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(stored));
    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it.each([
    [
      'Browser-active state',
      (checkpoint: Record<string, unknown>) => (checkpoint['activeTool'] = 'browser')
    ],
    [
      'prepared Browser route state',
      (checkpoint: Record<string, unknown>) =>
        (checkpoint['preparedBrowserRoute'] = {
          value: '/recruit-verification',
          revision: 1
        })
    ]
  ])('rejects obsolete %s in a version-8 checkpoint', (_label, mutate) => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    storage.save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: createEmptyLocalSave().settings
    });
    const stored = JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '') as {
      profile: { activeCheckpoint: Record<string, unknown> };
    };
    mutate(stored.profile.activeCheckpoint);
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(stored));
    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it('reloads cleared transcript state without losing Terminal history or directory', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const checkpoint = createOps001ActiveCheckpoint();
    const changed = interpretTerminalCommand('cd training', checkpoint.terminal);
    if (changed.kind !== 'executed') throw new Error('Expected cd to execute.');
    const cleared = interpretTerminalCommand('clear', changed.state);
    if (cleared.kind !== 'executed') throw new Error('Expected clear to execute.');
    const data = {
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message' as const,
        activeCheckpoint: { ...checkpoint, terminal: cleared.state }
      },
      settings: createEmptyLocalSave().settings
    };
    expect(storage.save(data)).toEqual({ saved: true });
    expect(storage.load().data.profile?.activeCheckpoint?.terminal).toMatchObject({
      currentDirectory: '/home/recruit/training',
      commandHistory: ['cd training', 'clear'],
      visibleInteractions: [],
      commandsUsed: ['cd', 'clear']
    });
  });

  it.each(['command history', 'interaction command'] as const)(
    'rejects version-6 saves with an oversized %s',
    (field) => {
      const memory = new MemoryStorage();
      const storage = createLocalSaveStorage(memory);
      const checkpoint = createOps001ActiveCheckpoint();
      const executed = interpretTerminalCommand('ls', checkpoint.terminal);
      if (executed.kind !== 'executed') throw new Error('Expected ls to execute.');
      storage.save({
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'operation-active-locate-message',
          activeCheckpoint: { ...checkpoint, terminal: executed.state }
        },
        settings: createEmptyLocalSave().settings
      });
      const stored = JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '') as {
        profile: {
          activeCheckpoint: {
            terminal: {
              commandHistory: string[];
              visibleInteractions: { submittedCommand: string }[];
            };
          };
        };
      };
      const oversized = 'x'.repeat(TERMINAL_INPUT_LIMIT + 1);
      if (field === 'command history') {
        stored.profile.activeCheckpoint.terminal.commandHistory[0] = oversized;
      } else {
        const interaction = stored.profile.activeCheckpoint.terminal.visibleInteractions[0];
        if (interaction === undefined) throw new Error('Expected a stored interaction.');
        interaction.submittedCommand = oversized;
      }
      memory.values.set(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(stored));

      expect(storage.load()).toEqual({
        data: createEmptyLocalSave(),
        notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
      });
    }
  );

  it('writes a valid version 6 reset save without removing retained settings', () => {
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const resetData = {
      profile: null,
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    };

    expect(storage.save(resetData)).toEqual({ saved: true });
    expect(JSON.parse(memory.values.get(LOCAL_SAVE_STORAGE_KEY) ?? '')).toEqual({
      version: LOCAL_SAVE_FORMAT_VERSION,
      ...resetData
    });
    expect(storage.load()).toEqual({ data: resetData, notice: null });
  });

  it('migrates a valid Stage 3 version-1 save without losing profile or settings data', () => {
    const memory = new MemoryStorage();
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(version1Save()));

    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: createApplicantProfile('Agent Seven'),
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: false }
      },
      notice: null
    });
  });

  it('preserves the profile but resets a deployed version-2 prototype checkpoint', () => {
    const memory = new MemoryStorage();
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        profile: {
          codename: 'Nova',
          rank: 'Applicant',
          badges: [],
          completedMissions: [],
          persistentEvidence: [],
          fieldManualEntries: [],
          stage4Progression: 'operation-active-locate-message',
          activeCheckpoint: {
            missionId: 'OPS-001',
            checkpointVersion: 1,
            progression: 'operation-active-locate-message',
            objective: "Locate Agent Trace's missing message."
          }
        },
        settings: { soundEffects: false, hqAmbience: true }
      })
    );
    expect(createLocalSaveStorage(memory).load().data.profile).toMatchObject({
      codename: 'Nova',
      progression: 'ops001-available',
      activeCheckpoint: null
    });
  });

  it('preserves the profile but resets a version-3 Workspace checkpoint', () => {
    const memory = new MemoryStorage();
    const profile = {
      ...createApplicantProfile('Nova'),
      progression: 'operation-active-locate-message',
      activeCheckpoint: {
        missionId: 'OPS-001',
        checkpointVersion: 2,
        progression: 'operation-active-locate-message',
        objectiveId: 'OBJ-001',
        activeTool: 'evidence',
        browserLocked: true
      }
    };
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        profile,
        settings: { soundEffects: false, hqAmbience: true }
      })
    );
    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'ops001-available'
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: false }
      },
      notice: null
    });
  });

  it('loads a version-3 reset save with retained preferences', () => {
    const memory = new MemoryStorage();
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        profile: null,
        settings: { soundEffects: false, hqAmbience: true }
      })
    );
    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: null,
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: false }
      },
      notice: null
    });
  });

  it('preserves identity but resets genuine version-4 Terminal play', () => {
    const memory = new MemoryStorage();
    const listed = interpretTerminalCommand('ls', createOps001ActiveCheckpoint().terminal);
    if (listed.kind !== 'executed') throw new Error('Expected ls to execute.');
    const opened = interpretTerminalCommand('cat welcome.txt', listed.state);
    if (opened.kind !== 'executed') throw new Error('Expected cat to execute.');
    const legacyTerminal = asVersion4Terminal(opened.state);
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 4,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'operation-active-locate-message',
          activeCheckpoint: {
            missionId: 'OPS-001',
            checkpointVersion: 3,
            progression: 'operation-active-locate-message',
            objectiveId: 'OBJ-001',
            activeTool: 'evidence',
            browserLocked: true,
            terminal: legacyTerminal
          }
        },
        settings: { soundEffects: false, hqAmbience: true }
      })
    );

    const profile = createLocalSaveStorage(memory).load().data.profile;
    expect(profile).toMatchObject({
      codename: 'Nova',
      progression: 'ops001-available',
      activeCheckpoint: null
    });
  });

  it('does not derive progression when resetting version-4 trace-note play', () => {
    const memory = new MemoryStorage();
    const opened = interpretTerminalCommand(
      'cat training/trace-note.txt',
      createOps001ActiveCheckpoint().terminal
    );
    if (opened.kind !== 'executed') throw new Error('Expected cat to execute.');
    const legacyTerminal = asVersion4Terminal(opened.state);
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 4,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'operation-active-locate-message',
          activeCheckpoint: {
            missionId: 'OPS-001',
            checkpointVersion: 3,
            progression: 'operation-active-locate-message',
            objectiveId: 'OBJ-001',
            activeTool: 'terminal',
            browserLocked: true,
            terminal: legacyTerminal
          }
        },
        settings: { soundEffects: true, hqAmbience: true }
      })
    );

    expect(createLocalSaveStorage(memory).load().data.profile).toMatchObject({
      codename: 'Nova',
      progression: 'ops001-available',
      activeCheckpoint: null
    });
  });

  it('migrates a version-5 save to assistance Off and resets its checkpoint', () => {
    const memory = new MemoryStorage();
    const currentCheckpoint = createOps001ActiveCheckpoint();
    const checkpoint = {
      missionId: currentCheckpoint.missionId,
      checkpointVersion: 4 as const,
      progression: currentCheckpoint.progression,
      objectiveId: currentCheckpoint.objectiveId,
      completedMilestones: currentCheckpoint.completedMilestones,
      activeTool: currentCheckpoint.activeTool,
      browserLocked: true,
      terminal: currentCheckpoint.terminal,
      activeEvidenceIds: currentCheckpoint.activeEvidenceIds,
      preparedCommand: {
        value: 'cat welcome.txt',
        source: 'command-rail' as const,
        revision: 3
      },
      preparedBrowserRoute: null,
      pendingByteNotices: [],
      seenByteNotices: []
    };
    const profile = {
      ...createApplicantProfile('Nova'),
      progression: 'operation-active-locate-message' as const,
      fieldManualEntries: ['command-help'] as const,
      activeCheckpoint: checkpoint
    };
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 5,
        profile: {
          ...profile,
          activeCheckpoint: checkpoint
        },
        settings: { soundEffects: false, hqAmbience: true }
      })
    );

    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'ops001-available',
          fieldManualEntries: ['command-help']
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: false }
      },
      notice: null
    });
    expect(createLocalSaveStorage(memory).load().data.profile?.activeCheckpoint).toBeNull();
  });

  it('preserves version-6 preferences while resetting its active checkpoint', () => {
    const memory = new MemoryStorage();
    const current = createOps001ActiveCheckpoint();
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 6,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'browser-unlocked',
          fieldManualEntries: ['command-cat', 'note-browser-routes'],
          activeCheckpoint: {
            missionId: 'OPS-001',
            checkpointVersion: 4,
            progression: 'browser-unlocked',
            objectiveId: 'OBJ-003',
            completedMilestones: ['OBJ-001', 'OBJ-002'],
            activeTool: 'browser',
            browserLocked: false,
            terminal: current.terminal,
            activeEvidenceIds: ['EV-001', 'EV-002'],
            preparedCommand: {
              value: 'cat welcome.txt',
              source: 'command-rail',
              revision: 2
            },
            preparedBrowserRoute: '/recruit-verification',
            pendingByteNotices: ['browser-unlocked'],
            seenByteNotices: ['command-cat']
          }
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      })
    );

    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'ops001-available',
          fieldManualEntries: ['command-cat', 'note-browser-routes'],
          activeCheckpoint: null
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      },
      notice: null
    });
  });

  it('preserves a version-7 profile and preferences while discarding obsolete Browser state', () => {
    const memory = new MemoryStorage();
    const current = createOps001ActiveCheckpoint();
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 7,
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'verification-route-recovered',
          fieldManualEntries: ['command-cat', 'note-browser-routes'],
          activeCheckpoint: {
            missionId: 'OPS-001',
            checkpointVersion: 5,
            progression: 'verification-route-recovered',
            objectiveId: 'OBJ-003',
            completedMilestones: ['OBJ-001', 'OBJ-002'],
            activeTool: 'browser',
            browser: current.browser,
            terminal: current.terminal,
            activeEvidenceIds: ['EV-001', 'EV-002'],
            preparedCommand: {
              value: 'cat training/trace-note.txt',
              source: 'autocomplete',
              revision: 2
            },
            preparedBrowserRoute: { value: '/recruit-verification', revision: 1 },
            preparedMissionControlFlag: null,
            pendingByteNotices: [],
            seenByteNotices: []
          }
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      })
    );

    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: {
          ...createApplicantProfile('Nova'),
          progression: 'ops001-available',
          fieldManualEntries: ['command-cat', 'note-browser-routes']
        },
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
      },
      notice: null
    });
  });

  it.each([
    { profile: null, expectedProfile: null },
    {
      profile: {
        codename: 'Nova',
        rank: 'Applicant',
        badges: [],
        completedMissions: [],
        persistentEvidence: [],
        fieldManualEntries: [],
        stage4Progression: 'briefing-read',
        activeCheckpoint: null
      },
      expectedProfile: { ...createApplicantProfile('Nova'), progression: 'briefing-read' }
    }
  ])('migrates version-2 reset and pre-deployment saves %#', ({ profile, expectedProfile }) => {
    const memory = new MemoryStorage();
    memory.values.set(
      LOCAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        profile,
        settings: { soundEffects: false, hqAmbience: true }
      })
    );
    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: {
        profile: expectedProfile,
        settings: { soundEffects: false, hqAmbience: true, commandAssistance: false }
      },
      notice: null
    });
  });

  it.each([
    '{not-json',
    JSON.stringify({ version: 3, profile: null, settings: {} }),
    JSON.stringify({
      version: 2,
      profile: { ...createApplicantProfile('Invalid!') },
      settings: { soundEffects: true, hqAmbience: true }
    }),
    JSON.stringify({
      version: 2,
      profile: {
        ...createApplicantProfile('Nova'),
        stage4Progression: 'operation-active-locate-message',
        activeCheckpoint: null
      },
      settings: { soundEffects: true, hqAmbience: true }
    })
  ])('recovers calmly from invalid or incompatible stored data', (storedValue) => {
    const memory = new MemoryStorage();
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, storedValue);

    expect(createLocalSaveStorage(memory).load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Saved local data is invalid or incompatible. Create a new profile to replace it.'
    });
  });

  it('reports read and write failures without throwing', () => {
    const unavailable: KeyValueStorage = {
      getItem() {
        throw new Error('unavailable');
      },
      setItem() {
        throw new Error('unavailable');
      }
    };
    const storage = createLocalSaveStorage(unavailable);

    expect(storage.load()).toEqual({
      data: createEmptyLocalSave(),
      notice: 'Local progress could not be read. You can continue for this session.'
    });
    expect(storage.save(createEmptyLocalSave())).toEqual({
      saved: false,
      notice: 'Changes are active for this session but could not be saved on this device.'
    });
  });
});
