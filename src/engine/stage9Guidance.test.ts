import { createOps001ActiveCheckpoint } from '../profile/localProfile';
import { interpretTerminalCommand } from '../simulations/terminal/interpreter';
import {
  getRevealedHintLevel,
  recordRelatedError,
  resolveOps001HintContext,
  revealHintLevel,
  applyHintAssist
} from './stage9Guidance';

describe('Stage 9 Byte guidance', () => {
  it('resolves every canonical blocking context from typed checkpoint state', () => {
    const initial = createOps001ActiveCheckpoint();
    expect(resolveOps001HintContext(initial)).toBe('H-001');
    const listed = interpretTerminalCommand('ls', initial.terminal);
    if (listed.kind !== 'executed') throw new Error('Expected ls to execute.');
    expect(resolveOps001HintContext({ ...initial, terminal: listed.state })).toBe('H-002');
    expect(
      resolveOps001HintContext({
        ...initial,
        objectiveId: 'OBJ-002',
        progression: 'welcome-read-in-terminal',
        completedMilestones: ['OBJ-001']
      })
    ).toBe('H-003A');
    expect(
      resolveOps001HintContext({
        ...initial,
        objectiveId: 'OBJ-002',
        progression: 'welcome-read-in-terminal',
        completedMilestones: ['OBJ-001'],
        terminal: { ...initial.terminal, currentDirectory: '/home/recruit/training' }
      })
    ).toBe('H-003B');
    expect(
      resolveOps001HintContext({
        ...initial,
        objectiveId: 'OBJ-003',
        progression: 'verification-route-recovered',
        completedMilestones: ['OBJ-001', 'OBJ-002'],
        activeEvidenceIds: ['EV-001', 'EV-002']
      })
    ).toBe('H-004');
    expect(
      resolveOps001HintContext({
        ...initial,
        objectiveId: 'OBJ-004',
        progression: 'verification-flag-recovered',
        completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'],
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003']
      })
    ).toBe('H-005');
    expect(
      resolveOps001HintContext({
        ...initial,
        objectiveId: 'OBJ-005',
        progression: 'operation-verified',
        completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'],
        verifiedEvidenceIds: ['EV-003'],
        missionControl: { ...initial.missionControl, validation: 'accepted' }
      })
    ).toBeNull();
  });

  it('enforces Nudge then Instruction then Assist and persists only the highest level', () => {
    const initial = createOps001ActiveCheckpoint();
    expect(revealHintLevel(initial, 'H-001', 'instruction')).toBe(initial);
    const nudged = revealHintLevel(initial, 'H-001', 'nudge');
    expect(getRevealedHintLevel(nudged, 'H-001')).toBe('nudge');
    expect(applyHintAssist(nudged, 'H-001')).toBe(nudged);
    const instructed = revealHintLevel(nudged, 'H-001', 'instruction');
    const assisted = applyHintAssist(instructed, 'H-001');
    expect(assisted.hintProgress).toEqual([{ hintId: 'H-001', level: 'assist' }]);
    expect(assisted.preparedCommand).toMatchObject({
      value: 'ls',
      source: 'byte-assist'
    });
    expect(applyHintAssist(assisted, 'H-001').preparedCommand?.revision).toBe(2);
  });

  it('offers help only after the second related error and clears the streak on reveal', () => {
    const initial = createOps001ActiveCheckpoint();
    const once = recordRelatedError(initial, 'H-001');
    expect(once.relatedErrorStreak).toEqual({ hintId: 'H-001', count: 1 });
    const twice = recordRelatedError(once, 'H-001');
    expect(twice.relatedErrorStreak).toEqual({ hintId: 'H-001', count: 2 });
    expect(revealHintLevel(twice, 'H-001', 'nudge').relatedErrorStreak).toBeNull();
  });

  it('keeps reveal progress per context when directory state selects H-003A or H-003B', () => {
    const initial = createOps001ActiveCheckpoint();
    const atHome = {
      ...initial,
      objectiveId: 'OBJ-002' as const,
      progression: 'welcome-read-in-terminal' as const,
      completedMilestones: ['OBJ-001'] as const
    };
    const nudgedAtHome = revealHintLevel(atHome, 'H-003A', 'nudge');
    const inTraining = {
      ...nudgedAtHome,
      terminal: { ...nudgedAtHome.terminal, currentDirectory: '/home/recruit/training' as const }
    };
    expect(resolveOps001HintContext(inTraining)).toBe('H-003B');
    expect(getRevealedHintLevel(inTraining, 'H-003B')).toBeNull();
    expect(getRevealedHintLevel(inTraining, 'H-003A')).toBe('nudge');
  });
});
