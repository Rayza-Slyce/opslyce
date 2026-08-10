import type { LocalOperativeProfile, Ops001ActiveCheckpoint } from '../../profile/localProfile';

export type TitleState = Readonly<{
  hasProfile: boolean;
  canContinue: boolean;
}>;

export function deriveTitleState(
  profile: LocalOperativeProfile | null,
  resumableOperation: unknown
): TitleState {
  return {
    hasProfile: profile !== null,
    canContinue: profile !== null && isValidResumableOperation(resumableOperation)
  };
}

export function isValidResumableOperation(value: unknown): value is Ops001ActiveCheckpoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const terminal = candidate['terminal'];
  const browser = candidate['browser'];
  const activeTool = candidate['activeTool'];
  const progression = candidate['progression'];
  const objectiveId = candidate['objectiveId'];
  return (
    candidate['missionId'] === 'OPS-001' &&
    candidate['checkpointVersion'] === 10 &&
    (progression === 'operation-active-locate-message' ||
      progression === 'welcome-read-in-terminal' ||
      progression === 'verification-route-recovered' ||
      progression === 'verification-flag-recovered' ||
      progression === 'operation-verified' ||
      progression === 'debrief') &&
    (objectiveId === 'OBJ-001' ||
      objectiveId === 'OBJ-002' ||
      objectiveId === 'OBJ-003' ||
      objectiveId === 'OBJ-004' ||
      objectiveId === 'OBJ-005') &&
    (activeTool === 'terminal' || activeTool === 'evidence') &&
    ((objectiveId === 'OBJ-001' && progression === 'operation-active-locate-message') ||
      (objectiveId === 'OBJ-002' && progression === 'welcome-read-in-terminal') ||
      (objectiveId === 'OBJ-003' && progression === 'verification-route-recovered') ||
      (objectiveId === 'OBJ-004' && progression === 'verification-flag-recovered') ||
      (objectiveId === 'OBJ-005' &&
        (progression === 'operation-verified' || progression === 'debrief'))) &&
    Array.isArray(candidate['completedMilestones']) &&
    Array.isArray(candidate['activeEvidenceIds']) &&
    (candidate['preparedCommand'] === null || typeof candidate['preparedCommand'] === 'object') &&
    (candidate['preparedBrowserRoute'] === null ||
      typeof candidate['preparedBrowserRoute'] === 'object') &&
    typeof candidate['missionControl'] === 'object' &&
    candidate['missionControl'] !== null &&
    Array.isArray(candidate['hintProgress']) &&
    (candidate['relatedErrorStreak'] === null ||
      typeof candidate['relatedErrorStreak'] === 'object') &&
    Array.isArray(candidate['verifiedEvidenceIds']) &&
    Array.isArray(candidate['pendingByteNotices']) &&
    Array.isArray(candidate['seenByteNotices']) &&
    typeof browser === 'object' &&
    browser !== null &&
    'history' in browser &&
    Array.isArray(browser.history) &&
    browser.history.length > 0 &&
    'historyIndex' in browser &&
    typeof browser.historyIndex === 'number' &&
    typeof terminal === 'object' &&
    terminal !== null &&
    'currentDirectory' in terminal &&
    (terminal.currentDirectory === '/home/recruit' ||
      terminal.currentDirectory === '/home/recruit/training') &&
    'commandHistory' in terminal &&
    Array.isArray(terminal.commandHistory) &&
    'visibleInteractions' in terminal &&
    Array.isArray(terminal.visibleInteractions) &&
    'commandsUsed' in terminal &&
    Array.isArray(terminal.commandsUsed) &&
    'qualifyingCommandsUsed' in terminal &&
    Array.isArray(terminal.qualifyingCommandsUsed) &&
    'openedFiles' in terminal &&
    Array.isArray(terminal.openedFiles) &&
    'revealedPaths' in terminal &&
    Array.isArray(terminal.revealedPaths)
  );
}
