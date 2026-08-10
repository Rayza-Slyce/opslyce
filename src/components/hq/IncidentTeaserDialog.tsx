import type { KeyboardEvent, Ref } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import styles from './HqStation.module.css';

type Props = Readonly<{
  closeButtonRef: Ref<HTMLButtonElement>;
  onClose(): void;
}>;

export function IncidentTeaserDialog({ closeButtonRef, onClose }: Props) {
  const teaser = OPS001_CONTENT.postMission.teaser;

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
      className={styles['incidentDialog']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-teaser-heading"
      data-incident-teaser-dialog
      onKeyDown={handleKeyDown}
    >
      <header>
        <h2 id="incident-teaser-heading">{teaser.heading}</h2>
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          {teaser.closeAction}
        </button>
      </header>
      <div className={styles['incidentDialogCopy']}>
        {teaser.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
