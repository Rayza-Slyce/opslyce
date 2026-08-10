import { createContext } from 'react';
import type { CodenameSaveResult } from '../profile/codename';
import type {
  HintLevel,
  OperativeSettings,
  Ops001HintId,
  PreparationSource,
  WorkspaceTool
} from '../profile/localProfile';
import type { TerminalSubmissionProvenance } from '../simulations/terminal/interpreter';
import type { GameEngineState } from '../engine/gameEngine';

export type GameEngineContextValue = Readonly<{
  state: GameEngineState;
  enterHq(): void;
  openResumeSummary(): void;
  continueOperation(): void;
  cancelResume(): void;
  openWelcome(): void;
  acknowledgeWelcome(): void;
  openOperation(): void;
  deployOperation(): void;
  restartCurrentOperation(): void;
  selectWorkspaceTool(tool: WorkspaceTool): void;
  submitTerminalCommand(input: string, provenance: TerminalSubmissionProvenance): void;
  prepareTerminalCommand(value: string, source: PreparationSource): void;
  clearPreparedTerminalCommand(): void;
  dismissByteNotice(): void;
  revealByteHint(hintId: Ops001HintId, level: HintLevel): void;
  useByteAssist(hintId: Ops001HintId): void;
  prepareEvidenceFlagForMissionControl(): void;
  clearPreparedBrowserRoute(): void;
  openBrowserRoute(input: string): void;
  goBrowserHome(): void;
  goBrowserBack(): void;
  updateMissionControlInput(value: string): void;
  submitMissionControlFlag(): void;
  enterDebrief(): void;
  returnToHqFromDebrief(): void;
  recordHqAnomaly(): void;
  settleHqAnomalyReactions(): void;
  completeEv005Review(): void;
  deliverIncidentTeaser(): void;
  readIncidentTeaser(): void;
  presentOperationCompletion(): void;
  returnFromOperationCompletion(): void;
  returnToHq(): void;
  openFieldManual(): void;
  backToDashboard(): void;
  saveNewCodename(value: string): CodenameSaveResult;
  editCodename(value: string): CodenameSaveResult;
  updateSetting(setting: keyof OperativeSettings, value: boolean): void;
  resetProgress(): void;
  returnToTitle(): void;
}>;

export const GameEngineContext = createContext<GameEngineContextValue | null>(null);
