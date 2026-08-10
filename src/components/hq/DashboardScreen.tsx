import { useEffect, useRef, useState } from 'react';
import { Ev005EvidenceDialog } from '../evidence/Ev005EvidenceDialog';
import { IncidentTeaserDialog } from './IncidentTeaserDialog';
import { isOperationAvailable } from '../../engine/gameEngine';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import type { LocalOperativeProfile } from '../../profile/localProfile';
import { HqStation } from './HqStation';
import { HqResponseSurface } from './HqResponseSurface';
import { Ops001CompletionSurface } from './Ops001CompletionSurface';
import {
  anomalyPresentationDelay,
  incidentArrivalDelay,
  nextAnomalyPresentationPhase,
  promotionPresentationDelay,
  type AnomalyPresentationPhase
} from './postMissionChoreography';
import styles from './HqStation.module.css';
import { LiveReaction } from './LiveReaction';

type DashboardScreenProps = Readonly<{
  profile: LocalOperativeProfile;
  onOpenWelcome(): void;
  onOpenOperation(): void;
  onOpenFieldManual(): void;
  onOpenSettings(): void;
  onPromotionSettled(): void;
  onAnomalyReactionsSettled(): void;
  onEvidenceReviewed(): void;
  onIncidentReady(): void;
  onReadIncident(): void;
  onIncidentClosed(): void;
  onReturnFromCompletion(): void;
}>;

export function DashboardScreen({
  profile,
  onOpenWelcome,
  onOpenOperation,
  onOpenFieldManual,
  onOpenSettings,
  onPromotionSettled,
  onAnomalyReactionsSettled,
  onEvidenceReviewed,
  onIncidentReady,
  onReadIncident,
  onIncidentClosed,
  onReturnFromCompletion
}: DashboardScreenProps) {
  const operationAvailable = isOperationAvailable(profile.progression);
  const welcomeRead = profile.progression !== 'applicant-at-hq';
  const checkpoint = profile.activeCheckpoint;
  const operationActive = checkpoint !== null;
  const [anomalyPhase, setAnomalyPhase] = useState<AnomalyPresentationPhase>('detecting');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const evidenceOpenerRef = useRef<HTMLButtonElement | null>(null);
  const evidenceCloseRef = useRef<HTMLButtonElement>(null);
  const restoreEvidenceFocus = useRef(false);
  const incidentOpenerRef = useRef<HTMLButtonElement | null>(null);
  const incidentCloseRef = useRef<HTMLButtonElement>(null);
  const restoreIncidentFocus = useRef(false);
  const responseSurfaceRef = useRef<HTMLElement>(null);
  const responseReviewRef = useRef<HTMLButtonElement>(null);
  const finalCompletionRef = useRef<HTMLElement>(null);
  const completedOperationHeadingRef = useRef<HTMLHeadingElement>(null);
  const completionReviewRef = useRef<HTMLButtonElement>(null);
  const focusCompletionReviewAfterEvidence = useRef(false);
  const communicationsUpdatesRef = useRef<HTMLDivElement>(null);
  const activeEvidence = checkpoint?.activeEvidenceIds ?? [];
  const metadata = OPS001_CONTENT.metadata;
  const postReturn =
    profile.progression === 'recruit-operative' ||
    profile.progression === 'anomaly-recorded' ||
    profile.progression === 'anomaly-review-pending' ||
    profile.progression === 'incident-teaser-pending' ||
    profile.progression === 'incident-teaser-received' ||
    profile.progression === 'incident-teaser-read' ||
    profile.progression === 'operation-completion' ||
    profile.progression === 'operation-complete';
  const signalDetected =
    profile.progression === 'anomaly-recorded' ||
    profile.progression === 'anomaly-review-pending' ||
    profile.progression === 'incident-teaser-pending' ||
    profile.progression === 'incident-teaser-received' ||
    profile.progression === 'incident-teaser-read' ||
    profile.progression === 'operation-completion' ||
    profile.progression === 'operation-complete';
  const reactionsSettled = signalDetected && profile.progression !== 'anomaly-recorded';
  const evidenceReviewReady =
    profile.progression === 'anomaly-review-pending' ||
    profile.progression === 'incident-teaser-pending' ||
    profile.progression === 'incident-teaser-received' ||
    profile.progression === 'incident-teaser-read' ||
    profile.progression === 'operation-completion' ||
    profile.progression === 'operation-complete';
  const teaserArrived =
    profile.progression === 'incident-teaser-received' ||
    profile.progression === 'incident-teaser-read' ||
    profile.progression === 'operation-completion' ||
    profile.progression === 'operation-complete';
  const teaserRead =
    profile.progression === 'incident-teaser-read' ||
    profile.progression === 'operation-completion' ||
    profile.progression === 'operation-complete';
  const liveSignal = profile.progression === 'anomaly-recorded';
  const byteReactionVisible =
    reactionsSettled || anomalyPhase === 'byte-reaction' || anomalyPhase === 'patch-reaction';
  const patchReactionVisible = reactionsSettled || anomalyPhase === 'patch-reaction';
  const responseSurfaceOpen =
    (liveSignal && (anomalyPhase === 'byte-reaction' || anomalyPhase === 'patch-reaction')) ||
    profile.progression === 'anomaly-review-pending';
  const responseComplete = profile.progression === 'anomaly-review-pending';
  const finalCompletionOpen = profile.progression === 'operation-completion';
  const signalPhase = reactionsSettled ? 'settled' : anomalyPhase;
  const signalFocused =
    signalPhase === 'detecting' || signalPhase === 'captured' || signalPhase === 'trace-failed';
  const markVisible = signalPhase !== 'detecting';
  const sourceVisible = signalPhase !== 'detecting';
  const traceVisible =
    signalPhase === 'trace-failed' ||
    signalPhase === 'byte-reaction' ||
    signalPhase === 'patch-reaction' ||
    signalPhase === 'settled';
  const { postMission } = OPS001_CONTENT;
  const anomalyEvidence = OPS001_CONTENT.workspace.evidence.entries['EV-005'];
  const evidenceInspectable = evidenceReviewReady && activeEvidence.includes('EV-005');
  const operationComplete = evidenceReviewReady;
  const focusedSurfaceOpen =
    responseSurfaceOpen || evidenceOpen || incidentOpen || finalCompletionOpen;
  const objective =
    checkpoint === null
      ? { label: 'Main objective', wording: metadata.mainObjective }
      : {
          label: 'Current objective',
          wording: OPS001_CONTENT.workspace.objectives[checkpoint.objectiveId].wording
        };
  const latestEvidenceLabel = activeEvidence.includes('EV-005')
    ? 'Unidentified Intrusion Mark'
    : activeEvidence.includes('EV-004')
      ? 'Operation Verified'
      : activeEvidence.includes('EV-003')
        ? 'Verification Flag'
        : activeEvidence.includes('EV-002')
          ? 'HQ Training Route'
          : 'Note Recovered';
  const reactionHistoryContentClassName = [
    styles['communicationsUpdates'],
    styles['reactionHistoryContent']
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  useEffect(() => {
    const matchMedia = (window as Partial<Pick<Window, 'matchMedia'>>).matchMedia;
    const reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (profile.progression === 'recruit-operative') {
      const timer = window.setTimeout(
        onPromotionSettled,
        promotionPresentationDelay(reducedMotion)
      );
      return () => window.clearTimeout(timer);
    }
    if (profile.progression === 'anomaly-recorded') {
      const next = nextAnomalyPresentationPhase(anomalyPhase);
      const timer = window.setTimeout(
        () => (next === null ? onAnomalyReactionsSettled() : setAnomalyPhase(next)),
        anomalyPresentationDelay(anomalyPhase, reducedMotion)
      );
      return () => window.clearTimeout(timer);
    }
    if (profile.progression === 'incident-teaser-pending') {
      const timer = window.setTimeout(onIncidentReady, incidentArrivalDelay(reducedMotion));
      return () => window.clearTimeout(timer);
    }
  }, [
    anomalyPhase,
    onAnomalyReactionsSettled,
    onIncidentReady,
    onPromotionSettled,
    profile.progression
  ]);

  useEffect(() => {
    if (evidenceOpen) {
      evidenceCloseRef.current?.focus();
    } else if (restoreEvidenceFocus.current) {
      restoreEvidenceFocus.current = false;
      evidenceOpenerRef.current?.focus();
    }
  }, [evidenceOpen]);

  useEffect(() => {
    if (incidentOpen) {
      incidentCloseRef.current?.focus();
    } else if (restoreIncidentFocus.current) {
      restoreIncidentFocus.current = false;
      incidentOpenerRef.current?.focus();
    }
  }, [incidentOpen]);

  useEffect(() => {
    if (responseSurfaceOpen && !evidenceOpen) responseSurfaceRef.current?.focus();
  }, [evidenceOpen, responseSurfaceOpen]);

  useEffect(() => {
    if (finalCompletionOpen && !incidentOpen) finalCompletionRef.current?.focus();
  }, [finalCompletionOpen, incidentOpen]);

  useEffect(() => {
    if (
      focusCompletionReviewAfterEvidence.current &&
      profile.progression === 'incident-teaser-pending'
    ) {
      focusCompletionReviewAfterEvidence.current = false;
      completionReviewRef.current?.focus();
    }
  }, [profile.progression]);

  useEffect(() => {
    const updates = communicationsUpdatesRef.current;
    if (updates === null) return;
    updates.scrollTop = teaserArrived ? 0 : updates.scrollHeight;
  }, [byteReactionVisible, patchReactionVisible, teaserArrived]);

  function openEvidence(opener: HTMLButtonElement, fromResponse = false) {
    evidenceOpenerRef.current = opener;
    focusCompletionReviewAfterEvidence.current = fromResponse;
    setEvidenceOpen(true);
  }

  function closeEvidence() {
    restoreEvidenceFocus.current = !focusCompletionReviewAfterEvidence.current;
    setEvidenceOpen(false);
    if (profile.progression === 'anomaly-review-pending') onEvidenceReviewed();
  }

  function openIncident(opener: HTMLButtonElement) {
    incidentOpenerRef.current = opener;
    if (!teaserRead) onReadIncident();
    setIncidentOpen(true);
  }

  function closeIncident() {
    const shouldPresentCompletion = profile.progression === 'incident-teaser-read';
    restoreIncidentFocus.current = !shouldPresentCompletion;
    setIncidentOpen(false);
    if (shouldPresentCompletion) onIncidentClosed();
  }

  return (
    <HqStation
      eyebrow="Applicant workspace"
      title="HQ Dashboard"
      actions={
        <div
          className={styles['dashboardActions']}
          inert={focusedSurfaceOpen}
          aria-hidden={focusedSurfaceOpen || undefined}
        >
          <button type="button" onClick={onOpenFieldManual}>
            Field Manual
          </button>
          <button type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      }
    >
      <div className={styles['dashboardStage']}>
        <div
          className={styles['dashboardGrid']}
          data-hq-dashboard
          data-dashboard-priority={liveSignal && signalFocused ? 'signal' : undefined}
          inert={focusedSurfaceOpen}
          aria-hidden={focusedSurfaceOpen || undefined}
        >
          <section className={styles['communications']} aria-labelledby="communications-heading">
            <div className={styles['panelHeading']}>
              <h2 id="communications-heading">Communications</h2>
              <span
                className={
                  teaserArrived && !teaserRead
                    ? styles['incomingState']
                    : responseSurfaceOpen
                      ? styles['currentState']
                      : welcomeRead
                        ? styles['readState']
                        : styles['incomingState']
                }
              >
                {teaserArrived && !teaserRead
                  ? 'Incoming'
                  : teaserRead
                    ? 'Received'
                    : responseSurfaceOpen
                      ? 'Current'
                      : welcomeRead
                        ? 'Read'
                        : 'Incoming'}
              </span>
            </div>
            {teaserArrived ? (
              <div
                ref={communicationsUpdatesRef}
                className={styles['communicationsUpdates']}
                aria-live="polite"
                aria-relevant="additions"
              >
                <article className={styles['incidentUpdate']} data-incident-teaser>
                  <h3>{postMission.teaser.heading}</h3>
                  <button
                    className={styles['panelAction']}
                    type="button"
                    onClick={(event) => openIncident(event.currentTarget)}
                  >
                    {teaserRead ? postMission.teaser.reviewAction : postMission.teaser.openAction}
                  </button>
                </article>
              </div>
            ) : null}
            {reactionsSettled ? (
              <details className={styles['reactionHistory']}>
                <summary>Review anomaly responses</summary>
                <div className={reactionHistoryContentClassName}>
                  <LiveReaction
                    speaker={postMission.byte.speaker}
                    dialogue={postMission.byte.dialogue}
                    portraitSrc="/assets/characters/byte-neutral.png"
                    portraitAlt="Byte portrait"
                    portraitFacesContent
                    animate={false}
                    reactionId="byte"
                  />
                  <LiveReaction
                    speaker={postMission.patch.speaker}
                    dialogue={postMission.patch.dialogue}
                    portraitSrc="/assets/characters/patch-neutral.png"
                    portraitAlt="Director Patch portrait"
                    animate={false}
                    reactionId="patch"
                  />
                </div>
              </details>
            ) : null}
            {postReturn ? (
              <div className={styles['communicationsHistory']}>
                <span>Earlier communication</span>
                <button className={styles['panelAction']} type="button" onClick={onOpenWelcome}>
                  Review welcome
                </button>
              </div>
            ) : (
              <>
                <p>
                  {welcomeRead
                    ? 'Director Patch’s welcome remains available for review.'
                    : 'Incoming transmission from Director Patch.'}
                </p>
                <button className={styles['panelAction']} type="button" onClick={onOpenWelcome}>
                  {welcomeRead ? 'Review welcome' : 'Open transmission'}
                </button>
              </>
            )}
          </section>

          <section className={styles['activeOperation']} aria-labelledby="operation-heading">
            <div className={styles['panelHeading']}>
              <h2 id="operation-heading" ref={completedOperationHeadingRef} tabIndex={-1}>
                {operationComplete ? 'Completed Operation' : 'Active Operation'}
              </h2>
              <span
                className={operationAvailable ? styles['availableState'] : styles['lockedState']}
              >
                {operationAvailable
                  ? postReturn
                    ? 'Verified'
                    : operationActive
                      ? 'Active'
                      : 'Available'
                  : 'Awaiting review'}
              </span>
            </div>
            {postReturn ? (
              <div
                className={styles['completedOperation']}
                data-signal-active={signalFocused || undefined}
                data-operation-complete={operationComplete || undefined}
              >
                <p className={styles['operationTitle']}>
                  <strong>{metadata.missionId}</strong>
                  <strong>{metadata.title}</strong>
                </p>
                {operationComplete ? null : <p>Operation verified.</p>}
                {operationComplete ? (
                  <section className={styles['missionClosure']} data-ops001-complete>
                    <div>
                      <h3>{postMission.completion.heading}</h3>
                      <p>{postMission.completion.status}</p>
                    </div>
                    <button
                      ref={completionReviewRef}
                      type="button"
                      onClick={(event) => openEvidence(event.currentTarget)}
                    >
                      {postMission.completion.reviewAction}
                    </button>
                  </section>
                ) : null}
                {liveSignal ? (
                  <section
                    className={styles['signalMonitor']}
                    aria-labelledby="signal-monitor-heading"
                    data-contained-signal
                    data-signal-phase={signalPhase}
                    data-signal-focused={signalFocused || undefined}
                    data-signal-presentation={signalFocused ? 'transient' : 'resting'}
                  >
                    <div>
                      <p className={styles['signalLabel']}>{postMission.signal.capturedLabel}</p>
                      <h3 id="signal-monitor-heading">{postMission.signal.heading}</h3>
                      {sourceVisible ? <p>{postMission.signal.source}</p> : null}
                      {traceVisible ? <p>{postMission.signal.trace}</p> : null}
                    </div>
                    {markVisible ? <SignalMark focused={signalFocused} /> : null}
                  </section>
                ) : null}
              </div>
            ) : operationAvailable ? (
              <button
                className={styles['operationCard']}
                type="button"
                onClick={onOpenOperation}
                aria-label={`${operationActive ? 'Resume' : 'Open'} ${metadata.missionId} — ${metadata.title}`}
              >
                <span className={styles['operationTitle']}>
                  <strong>{metadata.missionId}</strong>
                  <strong>{metadata.title}</strong>
                </span>
                <span>Operation codename: {metadata.operationCodename}</span>
                <span className={styles['operationFacts']}>
                  <span>Difficulty: {metadata.difficulty}</span>
                  <span>Target: {metadata.targetDuration}</span>
                </span>
                <span>
                  {objective.label}: <strong>{objective.wording}</strong>
                </span>
              </button>
            ) : (
              <p className={styles['unavailableOperation']}>
                Review the incoming HQ transmission to receive your assigned operation.
              </p>
            )}
          </section>

          <div className={styles['compactPanels']}>
            <section aria-labelledby="agent-status-heading">
              <h2 id="agent-status-heading">Agent Status</h2>
              <p className={styles['primaryValue']}>{profile.codename}</p>
              <p>
                Current status: <strong>{profile.rank}</strong>
              </p>
              {postReturn ? (
                <div className={styles['promotion']} role="status">
                  <p>{postMission.promotion.heading}</p>
                  <strong>{postMission.promotion.rank}</strong>
                  <img src="/assets/badges/ghost-file.png" alt="Ghost File badge" />
                </div>
              ) : null}
            </section>
            <section aria-labelledby="evidence-summary-heading">
              <h2 id="evidence-summary-heading">Evidence Summary</h2>
              {activeEvidence.length === 0 ? (
                <>
                  <p className={styles['emptyState']}>No evidence recorded.</p>
                  <p>Evidence will appear here when it is genuinely recovered.</p>
                </>
              ) : (
                <>
                  <div className={styles['evidenceSummaryMeta']}>
                    <p className={styles['primaryValue']}>
                      {activeEvidence.length} recorded{' '}
                      {activeEvidence.length === 1 ? 'item' : 'items'}
                    </p>
                    <p>Latest: {latestEvidenceLabel}</p>
                  </div>
                  {activeEvidence.includes('EV-005') ? (
                    <article className={styles['hqEvidenceCard']}>
                      <h3>{anomalyEvidence.title}</h3>
                      <p>
                        Status: <strong>{anomalyEvidence.status}</strong>
                      </p>
                      {evidenceInspectable ? (
                        <button
                          type="button"
                          onClick={(event) => openEvidence(event.currentTarget)}
                        >
                          Inspect mark
                        </button>
                      ) : null}
                    </article>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
        {responseSurfaceOpen && !evidenceOpen ? (
          <div className={styles['focusedHqOverlay']}>
            <HqResponseSurface
              surfaceRef={responseSurfaceRef}
              showPatch={patchReactionVisible}
              complete={responseComplete}
              reviewButtonRef={responseReviewRef}
              onReviewEvidence={(event) => openEvidence(event.currentTarget, true)}
            />
          </div>
        ) : null}
        {evidenceOpen ? (
          <div className={styles['evidenceOverlay']}>
            <Ev005EvidenceDialog closeButtonRef={evidenceCloseRef} onClose={closeEvidence} />
          </div>
        ) : null}
        {incidentOpen ? (
          <div className={styles['evidenceOverlay']}>
            <IncidentTeaserDialog closeButtonRef={incidentCloseRef} onClose={closeIncident} />
          </div>
        ) : null}
        {finalCompletionOpen ? (
          <div className={styles['focusedHqOverlay']}>
            <Ops001CompletionSurface
              surfaceRef={finalCompletionRef}
              onReturnToHq={() => {
                onReturnFromCompletion();
                window.requestAnimationFrame(() => completedOperationHeadingRef.current?.focus());
              }}
            />
          </div>
        ) : null}
      </div>
    </HqStation>
  );
}

function SignalMark({ focused }: Readonly<{ focused: boolean }>) {
  const content = (
    <>
      <img src="/assets/symbols/intrusion-mark.png" alt="Captured unidentified signal mark" />
      {focused ? (
        <img
          className={styles['signalEcho']}
          src="/assets/symbols/intrusion-mark.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return (
    <div className={styles['signalMark']} data-signal-effect="contained">
      {content}
    </div>
  );
}
