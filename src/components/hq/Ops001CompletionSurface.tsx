import type { KeyboardEvent, Ref } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import styles from './HqStation.module.css';

type Props = Readonly<{
  surfaceRef: Ref<HTMLElement>;
  onReturnToHq(): void;
}>;

export function Ops001CompletionSurface({ surfaceRef, onReturnToHq }: Props) {
  const completion = OPS001_CONTENT.postMission.finalCompletion;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const button = event.currentTarget.querySelector<HTMLButtonElement>('button');
    if (button === null) return;
    event.preventDefault();
    button.focus();
  }

  return (
    <section
      ref={surfaceRef}
      className={styles['finalCompletionSurface']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-completion-heading"
      tabIndex={-1}
      data-final-completion
      onKeyDown={handleKeyDown}
    >
      <div className={styles['finalCompletionIdentity']}>
        <p>Operation record closed</p>
        <h2 id="final-completion-heading">{completion.heading}</h2>
        <strong>{completion.title}</strong>
      </div>
      <div className={styles['finalCompletionSummary']}>
        <img src="/assets/badges/ghost-file.png" alt="Ghost File badge" />
        <dl>
          <div>
            <dt>Rank</dt>
            <dd>{completion.rank}</dd>
          </div>
          <div>
            <dt>Badge</dt>
            <dd>{completion.badge}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>
              {completion.evidence}
              <span>{completion.evidenceStatus}</span>
            </dd>
          </div>
        </dl>
      </div>
      <div className={styles['finalCompletionClosing']}>
        <p>{completion.assignmentStatus}</p>
        <p>{completion.availability}</p>
      </div>
      <button type="button" onClick={onReturnToHq}>
        {completion.returnAction}
      </button>
    </section>
  );
}
