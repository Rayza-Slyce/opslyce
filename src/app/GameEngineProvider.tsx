import { useCallback, useMemo, useReducer, type PropsWithChildren } from 'react';
import {
  createInitialEngineState,
  selectLocalSaveData,
  transitionEngine,
  type PersistentProgressionCommand,
  type PersistentProgressionEvent
} from '../engine/gameEngine';
import { validateCodename, type CodenameSaveResult } from '../profile/codename';
import {
  createApplicantProfile,
  updateProfileCodename,
  type LocalSaveData,
  type OperativeSettings,
  type WorkspaceTool
} from '../profile/localProfile';
import { createBrowserLocalSaveStorage, type LocalSaveStorage } from '../storage/localSaveStorage';
import { GameEngineContext, type GameEngineContextValue } from './gameEngineContext';

type GameEngineProviderProps = PropsWithChildren<{
  storage?: LocalSaveStorage;
}>;

export function GameEngineProvider({ children, storage }: GameEngineProviderProps) {
  const localSaveStorage = useMemo(() => storage ?? createBrowserLocalSaveStorage(), [storage]);
  const loadedSave = useMemo(() => localSaveStorage.load(), [localSaveStorage]);
  const [state, dispatch] = useReducer(transitionEngine, loadedSave, ({ data, notice }) =>
    createInitialEngineState(data, notice)
  );

  const persist = useCallback(
    (data: LocalSaveData, eventType: 'profile/updated' | 'settings/updated') => {
      const writeResult = localSaveStorage.save(data);
      dispatch({
        type: eventType,
        data,
        notice: writeResult.saved ? null : writeResult.notice
      });
      return writeResult;
    },
    [localSaveStorage]
  );

  const saveNewCodename = useCallback(
    (value: string): CodenameSaveResult => {
      const validation = validateCodename(value);

      if (!validation.valid) {
        return validation;
      }

      const writeResult = persist(
        {
          profile: createApplicantProfile(validation.value),
          settings: state.settings
        },
        'profile/updated'
      );
      return { ...validation, persisted: writeResult.saved };
    },
    [persist, state.settings]
  );

  const editCodename = useCallback(
    (value: string): CodenameSaveResult => {
      const validation = validateCodename(value);

      if (!validation.valid || state.profile === null) {
        return validation.valid
          ? { valid: false, error: 'Create a local profile before editing its codename.' }
          : validation;
      }

      const writeResult = persist(
        {
          profile: updateProfileCodename(state.profile, validation.value),
          settings: state.settings
        },
        'settings/updated'
      );
      return { ...validation, persisted: writeResult.saved };
    },
    [persist, state.profile, state.settings]
  );

  const updateSetting = useCallback(
    (setting: keyof OperativeSettings, value: boolean) => {
      persist(
        {
          profile: state.profile,
          settings: { ...state.settings, [setting]: value }
        },
        'settings/updated'
      );
    },
    [persist, state.profile, state.settings]
  );

  const advanceProgression = useCallback(
    (event: PersistentProgressionCommand) => {
      const previewEvent = { ...event, storageNotice: null } as PersistentProgressionEvent;
      const previewState = transitionEngine(state, previewEvent);
      if (previewState === state) return;
      if (previewState.profile === state.profile) {
        dispatch({ ...event, storageNotice: state.storageNotice });
        return;
      }
      const writeResult = localSaveStorage.save(selectLocalSaveData(previewState));

      dispatch({
        ...event,
        storageNotice: writeResult.saved ? null : writeResult.notice
      });
    },
    [localSaveStorage, state]
  );

  const resetProgress = useCallback(() => {
    const data: LocalSaveData = {
      profile: null,
      settings: state.settings
    };
    const writeResult = localSaveStorage.save(data);

    dispatch({
      type: 'progress/reset',
      data,
      notice: writeResult.saved ? null : writeResult.notice
    });
  }, [localSaveStorage, state.settings]);

  const contextValue = useMemo<GameEngineContextValue>(
    () => ({
      state,
      enterHq: () => dispatch({ type: 'title/enter-hq' }),
      openResumeSummary: () => dispatch({ type: 'title/open-resume-summary' }),
      continueOperation: () => dispatch({ type: 'title/continue-operation' }),
      cancelResume: () => dispatch({ type: 'title/cancel-resume' }),
      openWelcome: () => advanceProgression({ type: 'communications/open-welcome' }),
      acknowledgeWelcome: () => advanceProgression({ type: 'communications/return-dashboard' }),
      openOperation: () => advanceProgression({ type: 'operation/open' }),
      deployOperation: () => advanceProgression({ type: 'operation/deploy' }),
      restartCurrentOperation: () => advanceProgression({ type: 'operation/restart-current' }),
      selectWorkspaceTool: (tool: WorkspaceTool) =>
        advanceProgression({ type: 'workspace/select-tool', tool }),
      submitTerminalCommand: (input, provenance) =>
        advanceProgression({ type: 'terminal/submit-command', input, provenance }),
      prepareTerminalCommand: (value, source) =>
        advanceProgression({ type: 'terminal/prepare-command', value, source }),
      clearPreparedTerminalCommand: () =>
        advanceProgression({ type: 'terminal/clear-prepared-command' }),
      dismissByteNotice: () => advanceProgression({ type: 'byte/dismiss-notice' }),
      revealByteHint: (hintId, level) =>
        advanceProgression({ type: 'byte/reveal-hint', hintId, level }),
      useByteAssist: (hintId) => advanceProgression({ type: 'byte/use-assist', hintId }),
      prepareEvidenceFlagForMissionControl: () =>
        advanceProgression({ type: 'evidence/prepare-mission-control' }),
      clearPreparedBrowserRoute: () => advanceProgression({ type: 'browser/clear-prepared-route' }),
      openBrowserRoute: (input) => advanceProgression({ type: 'browser/open-route', input }),
      goBrowserHome: () => advanceProgression({ type: 'browser/home' }),
      goBrowserBack: () => advanceProgression({ type: 'browser/back' }),
      updateMissionControlInput: (value) =>
        advanceProgression({ type: 'mission-control/update-input', value }),
      submitMissionControlFlag: () => advanceProgression({ type: 'mission-control/submit' }),
      enterDebrief: () => advanceProgression({ type: 'operation/enter-debrief' }),
      returnToHqFromDebrief: () => advanceProgression({ type: 'debrief/return-hq' }),
      recordHqAnomaly: () => advanceProgression({ type: 'hq/record-anomaly' }),
      settleHqAnomalyReactions: () => advanceProgression({ type: 'hq/settle-anomaly-reactions' }),
      completeEv005Review: () => advanceProgression({ type: 'hq/complete-evidence-review' }),
      deliverIncidentTeaser: () => advanceProgression({ type: 'hq/deliver-incident-teaser' }),
      readIncidentTeaser: () => advanceProgression({ type: 'hq/read-incident-teaser' }),
      presentOperationCompletion: () =>
        advanceProgression({ type: 'hq/present-operation-completion' }),
      returnFromOperationCompletion: () =>
        advanceProgression({ type: 'hq/return-from-operation-completion' }),
      returnToHq: () => dispatch({ type: 'workspace/return-hq' }),
      openFieldManual: () => dispatch({ type: 'dashboard/open-field-manual' }),
      backToDashboard: () => dispatch({ type: 'navigation/back-dashboard' }),
      saveNewCodename,
      editCodename,
      updateSetting,
      resetProgress,
      returnToTitle: () => dispatch({ type: 'navigation/return-title' })
    }),
    [advanceProgression, editCodename, resetProgress, saveNewCodename, state, updateSetting]
  );

  return <GameEngineContext.Provider value={contextValue}>{children}</GameEngineContext.Provider>;
}
