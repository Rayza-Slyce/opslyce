import { HqStation } from './HqStation';
import { FieldManualEntries } from '../manual/FieldManualEntries';
import type { FieldManualEntryId } from '../../profile/localProfile';
import styles from './HqStation.module.css';

type FieldManualScreenProps = Readonly<{
  onBackToDashboard(): void;
  onOpenSettings(): void;
  entries: readonly FieldManualEntryId[];
}>;

export function FieldManualScreen({
  onBackToDashboard,
  onOpenSettings,
  entries
}: FieldManualScreenProps) {
  return (
    <HqStation
      eyebrow="Reference"
      title="Field Manual"
      actions={
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      }
      footer={
        <button className={styles['primaryButton']} type="button" onClick={onBackToDashboard}>
          Back to HQ
        </button>
      }
    >
      <section className={styles['manualEmpty']} aria-label="Field Manual entries">
        <FieldManualEntries entries={entries} />
      </section>
    </HqStation>
  );
}
