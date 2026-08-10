import { useEffect, useState } from 'react';
import { isRestartableOps001Progression } from '../profile/localProfile';
import { ApplicationFrame } from '../components/app-frame/ApplicationFrame';
import { CodenameRegistration } from '../components/codename/CodenameRegistration';
import { DashboardScreen } from '../components/hq/DashboardScreen';
import { FieldManualScreen } from '../components/hq/FieldManualScreen';
import { MissionBriefingScreen } from '../components/hq/MissionBriefingScreen';
import { WelcomeTransmissionScreen } from '../components/hq/WelcomeTransmissionScreen';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { TitleScreen } from '../components/title/TitleScreen';
import { MissionWorkspace } from '../components/mission/MissionWorkspace';
import {
  MissionDebriefScreen,
  VerificationTransitionScreen
} from '../components/mission/MissionDebriefScreen';
import { ResumeSummaryScreen } from '../components/mission/ResumeSummaryScreen';
import { ViewportGate } from '../components/viewport-gate/ViewportGate';
import { useViewportState } from './viewport/useViewportState';
import { useGameEngine } from './useGameEngine';
import { useOpSlyceAudio } from '../audio/useOpSlyceAudio';
import {
  applyPwaUpdate,
  dismissPwaUpdateReady,
  isPwaUpdateReady,
  PWA_UPDATE_READY_EVENT
} from './pwa/pwaUpdate';
import styles from './App.module.css';

export function App() {
  const {
    state,
    enterHq,
    openResumeSummary,
    continueOperation,
    cancelResume,
    openWelcome,
    acknowledgeWelcome,
    openOperation,
    deployOperation,
    restartCurrentOperation,
    selectWorkspaceTool,
    submitTerminalCommand,
    prepareTerminalCommand,
    clearPreparedTerminalCommand,
    dismissByteNotice,
    revealByteHint,
    useByteAssist,
    prepareEvidenceFlagForMissionControl,
    clearPreparedBrowserRoute,
    openBrowserRoute,
    goBrowserHome,
    goBrowserBack,
    updateMissionControlInput,
    submitMissionControlFlag,
    enterDebrief,
    returnToHqFromDebrief,
    recordHqAnomaly,
    settleHqAnomalyReactions,
    completeEv005Review,
    deliverIncidentTeaser,
    readIncidentTeaser,
    presentOperationCompletion,
    returnFromOperationCompletion,
    returnToHq,
    openFieldManual,
    backToDashboard,
    saveNewCodename,
    editCodename,
    updateSetting,
    resetProgress,
    returnToTitle
  } = useGameEngine();
  const viewportState = useViewportState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pwaUpdateReady, setPwaUpdateReady] = useState(isPwaUpdateReady);
  const [codenameDraft, setCodenameDraft] = useState('');
  useOpSlyceAudio(state, settingsOpen);

  useEffect(() => {
    const handleUpdateReady = () => setPwaUpdateReady(true);
    window.addEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);

    return () => {
      window.removeEventListener(PWA_UPDATE_READY_EVENT, handleUpdateReady);
    };
  }, []);

  const showPwaUpdateNotice = pwaUpdateReady && !settingsOpen && state.screen === 'title';

  if (viewportState.state !== 'supported-landscape') {
    return <ViewportGate state={viewportState.state} />;
  }

  let content;

  if (settingsOpen) {
    content = (
      <SettingsPanel
        profile={state.profile}
        settings={state.settings}
        canRestartOperation={
          state.profile?.activeCheckpoint == null
            ? false
            : isRestartableOps001Progression(state.profile.activeCheckpoint.progression)
        }
        onUpdateSetting={updateSetting}
        onEditCodename={editCodename}
        onRestartOperation={() => {
          restartCurrentOperation();
          setSettingsOpen(false);
        }}
        onResetProgress={() => {
          resetProgress();
          setCodenameDraft('');
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    );
  } else if (state.screen === 'codename-registration') {
    content = (
      <CodenameRegistration
        value={codenameDraft}
        onValueChange={setCodenameDraft}
        onSubmit={saveNewCodename}
        onOpenSettings={() => setSettingsOpen(true)}
        onReturnToTitle={returnToTitle}
      />
    );
  } else if (state.screen === 'dashboard' && state.profile !== null) {
    content = (
      <DashboardScreen
        profile={state.profile}
        onOpenWelcome={openWelcome}
        onOpenOperation={openOperation}
        onOpenFieldManual={openFieldManual}
        onOpenSettings={() => setSettingsOpen(true)}
        onPromotionSettled={recordHqAnomaly}
        onAnomalyReactionsSettled={settleHqAnomalyReactions}
        onEvidenceReviewed={completeEv005Review}
        onIncidentReady={deliverIncidentTeaser}
        onReadIncident={readIncidentTeaser}
        onIncidentClosed={presentOperationCompletion}
        onReturnFromCompletion={returnFromOperationCompletion}
      />
    );
  } else if (state.screen === 'welcome-transmission' && state.profile !== null) {
    content = (
      <WelcomeTransmissionScreen
        profile={state.profile}
        onReturnToDashboard={acknowledgeWelcome}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  } else if (state.screen === 'mission-briefing') {
    content = (
      <MissionBriefingScreen
        onBackToDashboard={backToDashboard}
        onDeploy={deployOperation}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  } else if (state.screen === 'mission-workspace' && state.profile !== null) {
    content =
      state.profile.activeCheckpoint?.progression === 'operation-verified' ? (
        <VerificationTransitionScreen onComplete={enterDebrief} />
      ) : (
        <MissionWorkspace
          profile={state.profile}
          commandAssistance={state.settings.commandAssistance}
          onSelectTool={selectWorkspaceTool}
          onSubmitCommand={submitTerminalCommand}
          onPrepareCommand={prepareTerminalCommand}
          onClearPreparedCommand={clearPreparedTerminalCommand}
          onDismissByteNotice={dismissByteNotice}
          onRevealByteHint={revealByteHint}
          onUseByteAssist={useByteAssist}
          onPrepareMissionControlFlag={prepareEvidenceFlagForMissionControl}
          onClearPreparedBrowserRoute={clearPreparedBrowserRoute}
          onOpenBrowserRoute={openBrowserRoute}
          onBrowserHome={goBrowserHome}
          onBrowserBack={goBrowserBack}
          onUpdateMissionControlInput={updateMissionControlInput}
          onSubmitMissionControlFlag={submitMissionControlFlag}
          onReturnHq={returnToHq}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      );
  } else if (state.screen === 'mission-debrief' && state.profile !== null) {
    content = <MissionDebriefScreen profile={state.profile} onReturnToHq={returnToHqFromDebrief} />;
  } else if (
    state.screen === 'resume-summary' &&
    state.profile?.activeCheckpoint !== null &&
    state.profile !== null
  ) {
    content = (
      <ResumeSummaryScreen
        checkpoint={state.profile.activeCheckpoint}
        onContinue={continueOperation}
        onBack={cancelResume}
      />
    );
  } else if (state.screen === 'field-manual') {
    content = (
      <FieldManualScreen
        entries={state.profile?.fieldManualEntries ?? []}
        onBackToDashboard={backToDashboard}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  } else {
    content = (
      <TitleScreen
        profile={state.profile}
        resumableOperation={state.profile?.activeCheckpoint ?? null}
        onContinue={openResumeSummary}
        onEnterHq={enterHq}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  }

  return (
    <ApplicationFrame engineStatus={state.status}>
      <div className={styles['stage']}>
        {showPwaUpdateNotice ? (
          <aside className={styles['updateNotice']} aria-label="OpSlyce update ready">
            <p role="status">
              <strong>OpSlyce update ready</strong>
              <span>A newer version is available. Your saved progress is safe.</span>
            </p>
            <div className={styles['updateNoticeActions']}>
              <button
                type="button"
                onClick={() => {
                  void applyPwaUpdate().catch(() => undefined);
                }}
              >
                Update now
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissPwaUpdateReady();
                  setPwaUpdateReady(false);
                }}
              >
                Later
              </button>
            </div>
          </aside>
        ) : null}
        {state.storageNotice === null ? null : (
          <p className={styles['storageNotice']} role="status">
            {state.storageNotice}
          </p>
        )}
        {content}
      </div>
    </ApplicationFrame>
  );
}
