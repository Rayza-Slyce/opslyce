import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import type {
  LocalOperativeProfile,
  HintLevel,
  Ops001HintId,
  PreparationSource,
  WorkspaceTool
} from '../../profile/localProfile';
import { MISSION_CONTROL_INPUT_LIMIT } from '../../profile/localProfile';
import type { TerminalSubmissionProvenance } from '../../simulations/terminal/interpreter';
import { HqStation } from '../hq/HqStation';
import { Ops001BriefingContent } from '../hq/Ops001BriefingContent';
import { FieldManualEntries } from '../manual/FieldManualEntries';
import { ByteAssistantDock } from './ByteAssistantDock';
import { FieldBrowser } from './FieldBrowser';
import { FieldTerminal } from './FieldTerminal';
import {
  getOps001Hint,
  getRevealedHintLevel,
  resolveOps001HintContext
} from '../../engine/stage9Guidance';
import styles from './MissionWorkspace.module.css';

type AuxiliaryPanel = 'mission-control' | 'byte-guidance' | 'briefing' | 'field-manual';
type Props = Readonly<{
  profile: LocalOperativeProfile;
  commandAssistance: boolean;
  onSelectTool(tool: WorkspaceTool): void;
  onSubmitCommand(input: string, provenance: TerminalSubmissionProvenance): void;
  onPrepareCommand(value: string, source: PreparationSource): void;
  onClearPreparedCommand(): void;
  onDismissByteNotice(): void;
  onRevealByteHint(hintId: Ops001HintId, level: HintLevel): void;
  onUseByteAssist(hintId: Ops001HintId): void;
  onPrepareMissionControlFlag(): void;
  onClearPreparedBrowserRoute(): void;
  onOpenBrowserRoute(input: string): void;
  onBrowserHome(): void;
  onBrowserBack(): void;
  onUpdateMissionControlInput(value: string): void;
  onSubmitMissionControlFlag(): void;
  onOpenSettings(): void;
  onReturnHq(): void;
}>;

export function MissionWorkspace({
  profile,
  commandAssistance,
  onSelectTool,
  onSubmitCommand,
  onPrepareCommand,
  onClearPreparedCommand,
  onDismissByteNotice,
  onRevealByteHint,
  onUseByteAssist,
  onPrepareMissionControlFlag,
  onClearPreparedBrowserRoute,
  onOpenBrowserRoute,
  onBrowserHome,
  onBrowserBack,
  onUpdateMissionControlInput,
  onSubmitMissionControlFlag,
  onOpenSettings,
  onReturnHq
}: Props) {
  const checkpoint = profile.activeCheckpoint;
  const [panel, setPanel] = useState<AuxiliaryPanel | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const terminalRef = useRef<HTMLButtonElement>(null);
  const evidenceRef = useRef<HTMLButtonElement>(null);
  const browserOpenerRef = useRef<HTMLButtonElement>(null);
  const browserCloseRef = useRef<HTMLButtonElement>(null);
  const askByteRef = useRef<HTMLButtonElement>(null);
  const focusBrowserOnOpen = useRef(false);
  const restoreBrowserFocus = useRef(false);
  const missionControlCloseRef = useRef<HTMLButtonElement>(null);
  const focusMissionControlOnOpen = useRef(false);
  const returnFocusTarget = useRef<'opener' | 'evidence-tab'>('opener');
  const restorePanelFocus = useRef(false);
  useEffect(() => {
    if (browserOpen && focusBrowserOnOpen.current) {
      focusBrowserOnOpen.current = false;
      browserCloseRef.current?.focus();
    } else if (!browserOpen && restoreBrowserFocus.current) {
      restoreBrowserFocus.current = false;
      browserOpenerRef.current?.focus();
    }
    if (
      (panel === 'mission-control' || panel === 'byte-guidance') &&
      focusMissionControlOnOpen.current
    ) {
      focusMissionControlOnOpen.current = false;
      missionControlCloseRef.current?.focus();
    }
    if (panel === null && restorePanelFocus.current) {
      restorePanelFocus.current = false;
      if (returnFocusTarget.current === 'evidence-tab') {
        evidenceRef.current?.focus();
      } else {
        openerRef.current?.focus();
      }
    }
  }, [browserOpen, panel]);
  if (checkpoint === null) return null;
  const { metadata, workspace } = OPS001_CONTENT;
  const activeTool = checkpoint.activeTool;
  const objective = workspace.objectives[checkpoint.objectiveId];
  const hintId = resolveOps001HintContext(checkpoint);

  function openPanel(next: AuxiliaryPanel, button: HTMLButtonElement) {
    openerRef.current = button;
    returnFocusTarget.current = 'opener';
    setPanel(next);
  }
  function prepareMissionControlFlag() {
    onPrepareMissionControlFlag();
    returnFocusTarget.current = 'evidence-tab';
    focusMissionControlOnOpen.current = true;
    setPanel('mission-control');
  }
  function openByteGuidance() {
    openerRef.current = askByteRef.current;
    returnFocusTarget.current = 'opener';
    focusMissionControlOnOpen.current = true;
    setBrowserOpen(false);
    setPanel('byte-guidance');
  }
  function useByteAssist(hint: Ops001HintId) {
    onUseByteAssist(hint);
    if (hint === 'H-004') {
      setPanel(null);
      focusBrowserOnOpen.current = true;
      setBrowserOpen(true);
    } else if (hint === 'H-005') {
      focusMissionControlOnOpen.current = true;
      setPanel('mission-control');
    } else {
      setPanel(null);
    }
  }
  function closePanel() {
    restorePanelFocus.current = true;
    setPanel(null);
  }
  function openBrowser() {
    focusBrowserOnOpen.current = true;
    setBrowserOpen(true);
  }
  function closeBrowser() {
    restoreBrowserFocus.current = true;
    setBrowserOpen(false);
  }
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabledTools: readonly WorkspaceTool[] = ['terminal', 'evidence'];
    const currentIndex = enabledTools.indexOf(activeTool);
    const next: WorkspaceTool =
      event.key === 'Home'
        ? 'terminal'
        : event.key === 'End'
          ? 'evidence'
          : (enabledTools[
              (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + enabledTools.length) %
                enabledTools.length
            ] ?? 'terminal');
    onSelectTool(next);
    (next === 'terminal' ? terminalRef : evidenceRef).current?.focus();
  }

  return (
    <HqStation
      mode="mission"
      eyebrow={`${metadata.missionId} · ${profile.codename}`}
      title={metadata.title}
      actions={
        <>
          <button type="button" onClick={onReturnHq}>
            HQ
          </button>
          <button type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </>
      }
    >
      <div className={styles['workspace']} data-mission-workspace>
        <div className={styles['leftColumn']} data-workspace-left-column>
          <section className={styles['objective']} aria-labelledby="current-objective-heading">
            <p>{checkpoint.objectiveId}</p>
            <h2 id="current-objective-heading">Current objective</h2>
            <p>{objective.wording}</p>
            {checkpoint.completedMilestones.length === 0 ? null : (
              <div className={styles['milestones']} aria-label="Completed milestones">
                {checkpoint.completedMilestones.map((id) => (
                  <p key={id}>Completed: {workspace.objectives[id].milestone}</p>
                ))}
              </div>
            )}
          </section>
          <ByteAssistantDock
            notice={checkpoint.pendingByteNotices[0] ?? null}
            hintAvailable={hintId !== null}
            helpOffered={checkpoint.relatedErrorStreak?.count === 2}
            askButtonRef={askByteRef}
            onDismiss={onDismissByteNotice}
            onAskByte={openByteGuidance}
          />
        </div>
        <nav
          className={styles['auxiliary']}
          aria-label="Operation support"
          inert={browserOpen}
          aria-hidden={browserOpen || undefined}
        >
          {(
            [
              ['mission-control', 'Mission Control'],
              ['briefing', 'Briefing'],
              ['field-manual', 'Field Manual']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-audio-ui={id === 'mission-control' ? 'confirm' : undefined}
              onClick={(event) => openPanel(id, event.currentTarget)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div
          className={styles['toolArea']}
          inert={browserOpen}
          aria-hidden={browserOpen || undefined}
          data-browser-covered={browserOpen ? 'true' : undefined}
        >
          {panel === null ? (
            <>
              <div className={styles['toolNavigation']}>
                <div className={styles['tabs']} role="tablist" aria-label="Operation tools">
                  <button
                    id="terminal-tab"
                    ref={terminalRef}
                    role="tab"
                    type="button"
                    aria-selected={checkpoint.activeTool === 'terminal'}
                    aria-controls="terminal-panel"
                    tabIndex={checkpoint.activeTool === 'terminal' ? 0 : -1}
                    data-audio-ui="confirm"
                    onKeyDown={handleTabKey}
                    onClick={() => onSelectTool('terminal')}
                  >
                    Terminal
                  </button>
                  <button
                    id="evidence-tab"
                    ref={evidenceRef}
                    role="tab"
                    type="button"
                    aria-selected={checkpoint.activeTool === 'evidence'}
                    aria-controls="evidence-panel"
                    tabIndex={checkpoint.activeTool === 'evidence' ? 0 : -1}
                    data-audio-ui="confirm"
                    onKeyDown={handleTabKey}
                    onClick={() => onSelectTool('evidence')}
                  >
                    Evidence
                  </button>
                </div>
                <button
                  ref={browserOpenerRef}
                  className={styles['browserOpener']}
                  type="button"
                  aria-haspopup="dialog"
                  data-audio-ui="confirm"
                  onClick={openBrowser}
                >
                  Browser
                </button>
              </div>
              {checkpoint.activeTool === 'terminal' ? (
                <section
                  id="terminal-panel"
                  role="tabpanel"
                  aria-labelledby="terminal-tab"
                  className={styles['toolPanel']}
                >
                  <FieldTerminal
                    terminal={checkpoint.terminal}
                    preparedCommand={checkpoint.preparedCommand}
                    commandAssistance={commandAssistance}
                    onSubmit={onSubmitCommand}
                    onPrepare={onPrepareCommand}
                    onClearPrepared={onClearPreparedCommand}
                  />
                </section>
              ) : (
                <section
                  id="evidence-panel"
                  role="tabpanel"
                  aria-labelledby="evidence-tab"
                  className={styles['toolPanel']}
                >
                  <EvidencePanel
                    evidenceIds={checkpoint.activeEvidenceIds}
                    verifiedEvidenceIds={checkpoint.verifiedEvidenceIds}
                    onPrepareMissionControlFlag={prepareMissionControlFlag}
                  />
                </section>
              )}
            </>
          ) : (
            <AuxiliaryContent
              panel={panel}
              manualEntries={profile.fieldManualEntries}
              checkpoint={checkpoint}
              hintId={hintId}
              closeButtonRef={missionControlCloseRef}
              onRevealHint={onRevealByteHint}
              onUseAssist={useByteAssist}
              onUpdateMissionControlInput={onUpdateMissionControlInput}
              onSubmitMissionControlFlag={onSubmitMissionControlFlag}
              onClose={closePanel}
            />
          )}
        </div>
        {browserOpen ? (
          <div className={styles['focusedBrowser']}>
            <FieldBrowser
              browser={checkpoint.browser}
              preparedRoute={checkpoint.preparedBrowserRoute}
              closeButtonRef={browserCloseRef}
              onClose={closeBrowser}
              onOpenRoute={onOpenBrowserRoute}
              onHome={onBrowserHome}
              onBack={onBrowserBack}
              onClearPreparedRoute={onClearPreparedBrowserRoute}
            />
          </div>
        ) : null}
      </div>
    </HqStation>
  );
}

function AuxiliaryContent({
  panel,
  manualEntries,
  checkpoint,
  hintId,
  closeButtonRef,
  onRevealHint,
  onUseAssist,
  onUpdateMissionControlInput,
  onSubmitMissionControlFlag,
  onClose
}: Readonly<{
  panel: AuxiliaryPanel;
  manualEntries: LocalOperativeProfile['fieldManualEntries'];
  checkpoint: NonNullable<LocalOperativeProfile['activeCheckpoint']>;
  hintId: Ops001HintId | null;
  closeButtonRef: Ref<HTMLButtonElement>;
  onRevealHint(hintId: Ops001HintId, level: HintLevel): void;
  onUseAssist(hintId: Ops001HintId): void;
  onUpdateMissionControlInput(value: string): void;
  onSubmitMissionControlFlag(): void;
  onClose(): void;
}>) {
  const { workspace } = OPS001_CONTENT;
  return (
    <section className={styles['panel']} aria-labelledby="auxiliary-heading">
      <div className={styles['panelHeading']}>
        <h2 id="auxiliary-heading">
          {panel === 'mission-control'
            ? workspace.missionControl.heading
            : panel === 'byte-guidance'
              ? workspace.hints.heading
              : panel === 'briefing'
                ? 'Operation briefing'
                : 'Field Manual'}
        </h2>
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {panel === 'briefing' ? (
        <Ops001BriefingContent />
      ) : panel === 'byte-guidance' && hintId !== null ? (
        <ByteGuidancePanel
          checkpoint={checkpoint}
          hintId={hintId}
          onReveal={onRevealHint}
          onUseAssist={onUseAssist}
        />
      ) : panel === 'mission-control' ? (
        <MissionControlPanel
          checkpoint={checkpoint}
          onUpdateInput={onUpdateMissionControlInput}
          onSubmit={onSubmitMissionControlFlag}
        />
      ) : (
        <FieldManualEntries entries={manualEntries} />
      )}
    </section>
  );
}

function ByteGuidancePanel({
  checkpoint,
  hintId,
  onReveal,
  onUseAssist
}: Readonly<{
  checkpoint: NonNullable<LocalOperativeProfile['activeCheckpoint']>;
  hintId: Ops001HintId;
  onReveal(hintId: Ops001HintId, level: HintLevel): void;
  onUseAssist(hintId: Ops001HintId): void;
}>) {
  const hint = getOps001Hint(hintId);
  const level = getRevealedHintLevel(checkpoint, hintId);
  return (
    <div className={styles['guidance']} aria-live="polite">
      {level === null ? (
        <button type="button" onClick={() => onReveal(hintId, 'nudge')}>
          Show Nudge
        </button>
      ) : (
        <section>
          <h3>Nudge</h3>
          <p>{hint.nudge}</p>
        </section>
      )}
      {level === 'nudge' ? (
        <button type="button" onClick={() => onReveal(hintId, 'instruction')}>
          Show Instruction
        </button>
      ) : level === 'instruction' || level === 'assist' ? (
        <section>
          <h3>Instruction</h3>
          <p>{hint.instruction}</p>
        </section>
      ) : null}
      {level === 'instruction' ? (
        <button
          type="button"
          aria-label={`Use Byte Assist for ${hintId}`}
          onClick={() => onUseAssist(hintId)}
        >
          Use Assist
        </button>
      ) : level === 'assist' ? (
        <section>
          <h3>Assist</h3>
          <p>{hint.assist}</p>
          <button
            type="button"
            aria-label={`Prepare Byte Assist again for ${hintId}`}
            onClick={() => onUseAssist(hintId)}
          >
            Prepare again
          </button>
        </section>
      ) : null}
    </div>
  );
}

function MissionControlPanel({
  checkpoint,
  onUpdateInput,
  onSubmit
}: Readonly<{
  checkpoint: NonNullable<LocalOperativeProfile['activeCheckpoint']>;
  onUpdateInput(value: string): void;
  onSubmit(): void;
}>) {
  const copy = OPS001_CONTENT.workspace.missionControl;
  const accepted = checkpoint.missionControl.validation === 'accepted';
  const [acceptancePhase, setAcceptancePhase] = useState<'verifying' | 'accepted' | null>(
    accepted ? 'accepted' : null
  );
  const previouslyAccepted = useRef(accepted);

  useEffect(() => {
    if (!accepted || previouslyAccepted.current) {
      previouslyAccepted.current = accepted;
      return;
    }
    previouslyAccepted.current = true;
    setAcceptancePhase('verifying');
    const matchMedia = Reflect.get(window, 'matchMedia') as
      ((query: string) => MediaQueryList) | undefined;
    const reducedMotion =
      matchMedia?.call(window, '(prefers-reduced-motion: reduce)').matches ?? false;
    const timer = window.setTimeout(() => setAcceptancePhase('accepted'), reducedMotion ? 0 : 350);
    return () => window.clearTimeout(timer);
  }, [accepted]);

  const feedback =
    checkpoint.missionControl.validation === 'idle' || accepted
      ? null
      : copy.feedback[checkpoint.missionControl.validation];

  return (
    <form
      className={styles['missionControl']}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="verification-flag">{copy.fieldLabel}</label>
      <input
        id="verification-flag"
        value={checkpoint.missionControl.input}
        maxLength={MISSION_CONTROL_INPUT_LIMIT}
        disabled={accepted}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onUpdateInput(event.currentTarget.value)}
      />
      <button type="submit" disabled={accepted}>
        Submit
      </button>
      {feedback === null ? (
        accepted ? null : (
          <p>{checkpoint.activeEvidenceIds.includes('EV-003') ? copy.ready : copy.unavailable}</p>
        )
      ) : (
        <div role="status" aria-live="polite">
          {feedback.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {acceptancePhase === 'verifying' ? (
        <p className={styles['verificationStatus']} role="status">
          {copy.verifying}
        </p>
      ) : acceptancePhase === 'accepted' ? (
        <div className={styles['verificationStatus']} role="status">
          {copy.accepted.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function EvidencePanel({
  evidenceIds,
  verifiedEvidenceIds,
  onPrepareMissionControlFlag
}: Readonly<{
  evidenceIds: NonNullable<LocalOperativeProfile['activeCheckpoint']>['activeEvidenceIds'];
  verifiedEvidenceIds: NonNullable<
    LocalOperativeProfile['activeCheckpoint']
  >['verifiedEvidenceIds'];
  onPrepareMissionControlFlag(): void;
}>) {
  const evidence = OPS001_CONTENT.workspace.evidence;
  const routeInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'unavailable' | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  async function copyVerificationRoute(route: string) {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    try {
      const clipboard = Reflect.get(navigator, 'clipboard') as Clipboard | undefined;
      if (clipboard === undefined) throw new Error('Clipboard unavailable');
      await clipboard.writeText(route);
      setCopyStatus('copied');
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      routeInputRef.current?.focus();
      routeInputRef.current?.select();
      setCopyStatus('unavailable');
    }
  }

  return (
    <>
      {evidenceIds.length === 0 ? (
        <p>{evidence.empty}</p>
      ) : (
        <div className={styles['evidenceList']}>
          {evidenceIds.map((id) => {
            const entry = evidence.entries[id];
            const isVerifiedFlag = id === 'EV-003' && verifiedEvidenceIds.includes('EV-003');
            return (
              <article className={styles['evidenceCard']} key={id} data-evidence-id={id}>
                <h3>{entry.title}</h3>
                {'value' in entry ? (
                  id === 'EV-002' ? (
                    <div className={styles['routeCopy']}>
                      <input
                        ref={routeInputRef}
                        aria-label="Verification route"
                        readOnly
                        value={entry.value}
                      />
                      <button
                        type="button"
                        aria-label="Copy verification route"
                        onClick={() => void copyVerificationRoute(entry.value)}
                      >
                        {entry.action}
                      </button>
                    </div>
                  ) : (
                    <p className={styles['evidenceValue']}>{entry.value}</p>
                  )
                ) : null}
                {id !== 'EV-002' || copyStatus === null ? null : (
                  <p className={styles['copyStatus']} role="status" aria-live="polite">
                    {copyStatus === 'copied'
                      ? 'Copied'
                      : 'Copy unavailable. Select the route and copy it manually.'}
                  </p>
                )}
                <p>{isVerifiedFlag ? 'Accepted by Mission Control.' : entry.detail}</p>
                <p>Status: {isVerifiedFlag ? 'Verified' : entry.status}</p>
                {'action' in entry && id === 'EV-003' && !isVerifiedFlag ? (
                  <button type="button" onClick={onPrepareMissionControlFlag}>
                    {entry.action}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
