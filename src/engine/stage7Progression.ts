import type {
  ByteNoticeId,
  FieldManualEntryId,
  LocalOperativeProfile,
  Ops001ActiveCheckpoint
} from '../profile/localProfile';
import {
  revealTerminalPaths,
  type TerminalCommandId,
  type TerminalExecution
} from '../simulations/terminal/interpreter';

const commandManualEntries: Readonly<Record<TerminalCommandId, FieldManualEntryId>> = {
  help: 'command-help',
  ls: 'command-ls',
  cd: 'command-cd',
  cat: 'command-cat',
  clear: 'command-clear'
};

const commandNotices: Readonly<Record<TerminalCommandId, ByteNoticeId>> = {
  help: 'command-help',
  ls: 'command-ls',
  cd: 'command-cd',
  cat: 'command-cat',
  clear: 'command-clear'
};

export function applyStage7TerminalExecution(
  profile: LocalOperativeProfile,
  execution: Extract<TerminalExecution, { kind: 'executed' }>
): LocalOperativeProfile {
  const existing = profile.activeCheckpoint;
  if (existing === null) return profile;
  let checkpoint: Ops001ActiveCheckpoint = {
    ...existing,
    terminal: execution.state,
    preparedCommand: null
  };
  let manualEntries = profile.fieldManualEntries;

  for (const event of execution.events) {
    if (event.type === 'terminal/command-succeeded' && event.firstQualifyingUse) {
      const commandEntry = commandManualEntries[event.commandId];
      manualEntries = appendUnique(manualEntries, commandEntry);
      if (event.commandId === 'ls') {
        manualEntries = appendUnique(manualEntries, 'note-files-folders');
      }
      if (event.commandId === 'cd' && event.directoryChanged) {
        manualEntries = appendUnique(manualEntries, 'note-paths');
      }
      checkpoint = replaceByteNotice(checkpoint, commandNotices[event.commandId]);
    }

    if (event.type !== 'terminal/file-opened' || !event.firstOpen) continue;

    if (event.canonicalPath === '/home/recruit/welcome.txt') {
      checkpoint = {
        ...checkpoint,
        terminal: revealTerminalPaths(checkpoint.terminal, [
          '/home/recruit/training',
          '/home/recruit/training/trace-note.txt'
        ]),
        ...(checkpoint.objectiveId === 'OBJ-001'
          ? {
              objectiveId: 'OBJ-002' as const,
              progression: 'welcome-read-in-terminal' as const,
              completedMilestones: appendUnique(checkpoint.completedMilestones, 'OBJ-001')
            }
          : {})
      };
    }

    if (event.canonicalPath === '/home/recruit/training/trace-note.txt') {
      checkpoint = {
        ...checkpoint,
        progression: 'verification-route-recovered',
        objectiveId: 'OBJ-003',
        completedMilestones: appendUnique(
          appendUnique(checkpoint.completedMilestones, 'OBJ-001'),
          'OBJ-002'
        ),
        activeEvidenceIds: appendUnique(
          appendUnique(checkpoint.activeEvidenceIds, 'EV-001'),
          'EV-002'
        )
      };
      checkpoint = replaceByteNotice(checkpoint, 'verification-route-recovered');
      manualEntries = appendUnique(manualEntries, 'note-browser-routes');
    }
  }

  return {
    ...profile,
    progression: checkpoint.progression,
    activeCheckpoint: checkpoint,
    fieldManualEntries: manualEntries
  };
}

export function replaceByteNotice(
  checkpoint: Ops001ActiveCheckpoint,
  notice: ByteNoticeId
): Ops001ActiveCheckpoint {
  if (
    checkpoint.pendingByteNotices.includes(notice) ||
    checkpoint.seenByteNotices.includes(notice)
  ) {
    return checkpoint;
  }

  const replaced = checkpoint.pendingByteNotices;
  return {
    ...checkpoint,
    pendingByteNotices: [notice],
    seenByteNotices: replaced.reduce<readonly ByteNoticeId[]>(appendUnique, [
      ...checkpoint.seenByteNotices
    ])
  };
}

export function appendUnique<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value) ? values : [...values, value];
}
