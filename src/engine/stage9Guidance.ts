import { OPS001_CONTENT } from '../missions/ops001/content';
import type { HintLevel, Ops001ActiveCheckpoint, Ops001HintId } from '../profile/localProfile';
import { TERMINAL_INPUT_LIMIT } from '../simulations/terminal/interpreter';

export type HintPreparation =
  | Readonly<{ kind: 'terminal-command'; value: string }>
  | Readonly<{ kind: 'browser-route'; value: '/recruit-verification' }>
  | Readonly<{ kind: 'mission-control-flag'; value: 'FLAG{WELCOME_TO_HQ}' }>;

export type Ops001Hint = Readonly<{
  id: Ops001HintId;
  nudge: string;
  instruction: string;
  assist: string;
  preparation: HintPreparation;
}>;

const levelOrder: readonly HintLevel[] = ['nudge', 'instruction', 'assist'];

export function resolveOps001HintContext(checkpoint: Ops001ActiveCheckpoint): Ops001HintId | null {
  if (checkpoint.progression === 'operation-verified' || checkpoint.objectiveId === 'OBJ-005') {
    return null;
  }
  if (checkpoint.objectiveId === 'OBJ-001') {
    return checkpoint.terminal.commandsUsed.includes('ls') ? 'H-002' : 'H-001';
  }
  if (checkpoint.objectiveId === 'OBJ-002') {
    return checkpoint.terminal.currentDirectory === '/home/recruit/training' ? 'H-003B' : 'H-003A';
  }
  if (checkpoint.objectiveId === 'OBJ-003') return 'H-004';
  return 'H-005';
}

export function getOps001Hint(id: Ops001HintId): Ops001Hint {
  return { id, ...OPS001_CONTENT.workspace.hints.contexts[id] };
}

export function getRevealedHintLevel(
  checkpoint: Ops001ActiveCheckpoint,
  hintId: Ops001HintId
): HintLevel | null {
  return checkpoint.hintProgress.find((entry) => entry.hintId === hintId)?.level ?? null;
}

export function canRevealHintLevel(
  checkpoint: Ops001ActiveCheckpoint,
  hintId: Ops001HintId,
  level: HintLevel
): boolean {
  if (resolveOps001HintContext(checkpoint) !== hintId) return false;
  const current = getRevealedHintLevel(checkpoint, hintId);
  const expectedIndex = current === null ? 0 : levelOrder.indexOf(current) + 1;
  return levelOrder[expectedIndex] === level;
}

export function revealHintLevel(
  checkpoint: Ops001ActiveCheckpoint,
  hintId: Ops001HintId,
  level: HintLevel
): Ops001ActiveCheckpoint {
  if (!canRevealHintLevel(checkpoint, hintId, level)) return checkpoint;
  const hintProgress = checkpoint.hintProgress.filter((entry) => entry.hintId !== hintId);
  return {
    ...checkpoint,
    hintProgress: [...hintProgress, { hintId, level }],
    relatedErrorStreak: null
  };
}

export function recordRelatedError(
  checkpoint: Ops001ActiveCheckpoint,
  hintId: Ops001HintId
): Ops001ActiveCheckpoint {
  if (resolveOps001HintContext(checkpoint) !== hintId) return checkpoint;
  if (getRevealedHintLevel(checkpoint, hintId) !== null) return checkpoint;
  const count = checkpoint.relatedErrorStreak?.hintId === hintId ? 2 : 1;
  return { ...checkpoint, relatedErrorStreak: { hintId, count } };
}

export function clearObsoleteErrorStreak(
  checkpoint: Ops001ActiveCheckpoint
): Ops001ActiveCheckpoint {
  const hintId = resolveOps001HintContext(checkpoint);
  return checkpoint.relatedErrorStreak === null || checkpoint.relatedErrorStreak.hintId === hintId
    ? checkpoint
    : { ...checkpoint, relatedErrorStreak: null };
}

export function applyHintAssist(
  checkpoint: Ops001ActiveCheckpoint,
  hintId: Ops001HintId
): Ops001ActiveCheckpoint {
  if (resolveOps001HintContext(checkpoint) !== hintId) return checkpoint;
  const revealed = getRevealedHintLevel(checkpoint, hintId);
  if (revealed !== 'instruction' && revealed !== 'assist') return checkpoint;
  const withReveal =
    revealed === 'assist' ? checkpoint : revealHintLevel(checkpoint, hintId, 'assist');
  const preparation = getOps001Hint(hintId).preparation;
  if (preparation.kind === 'terminal-command') {
    if (preparation.value.length > TERMINAL_INPUT_LIMIT) return withReveal;
    return {
      ...withReveal,
      activeTool: 'terminal',
      preparedCommand: {
        value: preparation.value,
        source: 'byte-assist',
        revision: (withReveal.preparedCommand?.revision ?? 0) + 1
      }
    };
  }
  if (preparation.kind === 'browser-route') {
    return {
      ...withReveal,
      preparedBrowserRoute: {
        value: preparation.value,
        source: 'byte-assist',
        revision: (withReveal.preparedBrowserRoute?.revision ?? 0) + 1
      }
    };
  }
  return {
    ...withReveal,
    missionControl: {
      input: preparation.value,
      validation: 'idle',
      preparationSource: 'byte-assist',
      revision: withReveal.missionControl.revision + 1
    }
  };
}
