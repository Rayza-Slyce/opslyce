import { useEffect, useRef, useState } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import type { LocalOperativeProfile } from '../../profile/localProfile';
import type { TerminalCommandId } from '../../simulations/terminal/commandReference';
import { HqStation } from '../hq/HqStation';
import styles from './MissionDebriefScreen.module.css';

export function VerificationTransitionScreen({ onComplete }: Readonly<{ onComplete(): void }>) {
  const [phase, setPhase] = useState<'verifying' | 'accepted'>('verifying');
  const completed = useRef(false);

  useEffect(() => {
    const matchMedia = (window as Partial<Pick<Window, 'matchMedia'>>).matchMedia;
    const reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const acceptedTimer = window.setTimeout(() => setPhase('accepted'), reducedMotion ? 80 : 350);
    const completeTimer = window.setTimeout(
      () => {
        if (completed.current) return;
        completed.current = true;
        onComplete();
      },
      reducedMotion ? 220 : 850
    );
    return () => {
      window.clearTimeout(acceptedTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <HqStation mode="mission" eyebrow="OPS-001 · Mission Control" title="Verification">
      <section className={styles['verification']} aria-live="polite">
        {phase === 'verifying' ? (
          <p>{OPS001_CONTENT.workspace.missionControl.verifying}</p>
        ) : (
          <div>
            {OPS001_CONTENT.workspace.missionControl.accepted.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </section>
    </HqStation>
  );
}

export function MissionDebriefScreen({
  profile,
  onReturnToHq
}: Readonly<{ profile: LocalOperativeProfile; onReturnToHq(): void }>) {
  const checkpoint = profile.activeCheckpoint;
  if (checkpoint === null) return null;
  const { debrief } = OPS001_CONTENT;
  const usedCommands = debrief.fieldRecord.order.filter((command) =>
    checkpoint.terminal.commandsUsed.includes(command)
  ) as readonly TerminalCommandId[];

  return (
    <HqStation
      eyebrow="OPS-001 · Mission complete"
      title="Recruitment Day debrief"
      footer={
        <button type="button" onClick={onReturnToHq}>
          {debrief.returnAction}
        </button>
      }
    >
      <div className={styles['debrief']} data-mission-debrief>
        <section className={styles['dialogue']} aria-labelledby="patch-debrief-heading">
          <img src="/assets/characters/patch-neutral.png" alt="Director Patch" />
          <div>
            <h2 id="patch-debrief-heading">{debrief.patch.speaker}</h2>
            <p>{debrief.patch.dialogue}</p>
          </div>
        </section>

        <section className={styles['dialogue']} aria-labelledby="byte-debrief-heading">
          <img className={styles['byte']} src="/assets/characters/byte-neutral.png" alt="Byte" />
          <div>
            <h2 id="byte-debrief-heading">{debrief.byte.speaker}</h2>
            <p>{debrief.byte.dialogue}</p>
          </div>
        </section>

        <section className={styles['fieldRecord']} aria-labelledby="field-record-heading">
          <h2 id="field-record-heading">{debrief.fieldRecord.heading}</h2>
          <p>Commands successfully used during this operation:</p>
          <dl>
            {usedCommands.map((command) => (
              <div key={command}>
                <dt>
                  <code>{command}</code>
                </dt>
                <dd>{debrief.fieldRecord.entries[command]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles['reward']} aria-labelledby="operation-reward-heading">
          <div>
            <h2 id="operation-reward-heading">{debrief.reward.heading}</h2>
            <p>
              {debrief.reward.rankLabel}: <strong>{debrief.reward.rank}</strong>
            </p>
            <p>
              {debrief.reward.badgeLabel}: <strong>{debrief.reward.badge}</strong>
            </p>
          </div>
          <img src="/assets/badges/ghost-file.png" alt="Ghost File badge" />
        </section>
      </div>
    </HqStation>
  );
}
