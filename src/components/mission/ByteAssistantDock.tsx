import { OPS001_CONTENT } from '../../missions/ops001/content';
import type { ByteNoticeId } from '../../profile/localProfile';
import type { Ref } from 'react';
import styles from './MissionWorkspace.module.css';

type Props = Readonly<{
  notice: ByteNoticeId | null;
  hintAvailable: boolean;
  helpOffered: boolean;
  askButtonRef: Ref<HTMLButtonElement>;
  onDismiss(): void;
  onAskByte(): void;
}>;

export function ByteAssistantDock({
  notice,
  hintAvailable,
  helpOffered,
  askButtonRef,
  onDismiss,
  onAskByte
}: Props) {
  return (
    <aside className={styles['byteDock']} aria-label="Byte assistant" data-byte-dock>
      <img
        className={styles['bytePortrait']}
        src="/assets/characters/byte-neutral.png"
        alt="Byte"
        data-byte-portrait
      />
      <div className={styles['byteCopy']}>
        <strong>Byte</strong>
        <p>
          {helpOffered
            ? 'I have a suggestion for this step.'
            : notice === null
              ? 'Standing by.'
              : OPS001_CONTENT.workspace.byte[notice]}
        </p>
      </div>
      {notice === null || helpOffered ? null : (
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      )}
      {hintAvailable ? (
        <button ref={askButtonRef} type="button" data-audio-ui="byte" onClick={onAskByte}>
          Ask Byte
        </button>
      ) : null}
    </aside>
  );
}
