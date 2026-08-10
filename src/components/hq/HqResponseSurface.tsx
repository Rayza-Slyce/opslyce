import type { KeyboardEvent, MouseEvent, Ref } from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import { LiveReaction } from './LiveReaction';
import styles from './HqStation.module.css';

type Props = Readonly<{
  surfaceRef: Ref<HTMLElement>;
  showPatch: boolean;
  complete: boolean;
  reviewButtonRef: Ref<HTMLButtonElement>;
  onReviewEvidence(event: MouseEvent<HTMLButtonElement>): void;
}>;

export function HqResponseSurface({
  surfaceRef,
  showPatch,
  complete,
  reviewButtonRef,
  onReviewEvidence
}: Props) {
  const { postMission } = OPS001_CONTENT;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (controls.length === 0) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
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
      ref={surfaceRef}
      className={styles['hqResponseSurface']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hq-response-heading"
      tabIndex={-1}
      data-hq-response
      data-response-complete={complete || undefined}
      onKeyDown={handleKeyDown}
    >
      <header>
        <p>OpSlyce Communications</p>
        <h2 id="hq-response-heading">HQ RESPONSE</h2>
      </header>
      <div className={styles['hqResponseMessages']} aria-live="polite" aria-relevant="additions">
        <LiveReaction
          speaker={postMission.byte.speaker}
          dialogue={postMission.byte.dialogue}
          portraitSrc="/assets/characters/byte-neutral.png"
          portraitAlt="Byte portrait"
          portraitFacesContent
          animate={!complete}
          reactionId="byte"
        />
        {showPatch ? (
          <LiveReaction
            speaker={postMission.patch.speaker}
            dialogue={postMission.patch.dialogue}
            portraitSrc="/assets/characters/patch-neutral.png"
            portraitAlt="Director Patch portrait"
            animate={!complete}
            reactionId="patch"
          />
        ) : null}
      </div>
      {complete ? (
        <footer>
          <button ref={reviewButtonRef} type="button" onClick={onReviewEvidence}>
            {postMission.completion.reviewAction}
          </button>
        </footer>
      ) : null}
    </section>
  );
}
