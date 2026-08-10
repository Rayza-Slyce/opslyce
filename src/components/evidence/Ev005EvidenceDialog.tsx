import type { KeyboardEvent, Ref } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import styles from './Ev005EvidenceDialog.module.css';

type Props = Readonly<{
  closeButtonRef: Ref<HTMLButtonElement>;
  onClose(): void;
}>;

export function Ev005EvidenceDialog({ closeButtonRef, onClose }: Props) {
  const entry = OPS001_CONTENT.workspace.evidence.entries['EV-005'];
  const review = OPS001_CONTENT.postMission.evidenceReview;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (controls.length === 0) return;
    const activeIndex = controls.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      controls.at(-1)?.focus();
    } else if (!event.shiftKey && activeIndex === controls.length - 1) {
      event.preventDefault();
      controls[0]?.focus();
    }
  }

  return (
    <section
      className={styles['dialog']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ev005-evidence-heading"
      data-ev005-evidence-dialog
      onKeyDown={handleKeyDown}
    >
      <header className={styles['header']}>
        <div>
          <p>{review.evidenceId}</p>
          <h2 id="ev005-evidence-heading">{entry.title}</h2>
        </div>
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          {review.closeAction}
        </button>
      </header>
      <div className={styles['body']}>
        <div className={styles['mark']} data-recorded-signal-effect>
          <img src="/assets/symbols/intrusion-mark.png" alt="Saved unidentified intrusion mark" />
          <img
            className={styles['echo']}
            src="/assets/symbols/intrusion-mark.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className={styles['details']}>
          <p>{entry.detail}</p>
          <p>{entry.secondaryDetail}</p>
          <p>
            Status: <strong>{entry.status}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
