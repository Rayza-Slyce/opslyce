import { OPS001_CONTENT } from '../../missions/ops001/content';
import type { FieldManualEntryId } from '../../profile/localProfile';
import styles from './FieldManualEntries.module.css';

type Props = Readonly<{ entries: readonly FieldManualEntryId[] }>;

export function FieldManualEntries({ entries }: Props) {
  const content = OPS001_CONTENT.workspace.fieldManual;
  if (entries.length === 0) {
    return (
      <div className={styles['empty']}>
        <h3>{content.heading}</h3>
        <p>{content.empty}</p>
      </div>
    );
  }
  const commands = entries.filter((entry) => entry.startsWith('command-'));
  const notes = entries.filter((entry) => entry.startsWith('note-'));
  return (
    <div className={styles['manual']}>
      {commands.length === 0 ? null : (
        <ManualSection heading={content.commandHeading} entries={commands} />
      )}
      {notes.length === 0 ? null : <ManualSection heading={content.notesHeading} entries={notes} />}
    </div>
  );
}

function ManualSection({
  heading,
  entries
}: Readonly<{ heading: string; entries: readonly FieldManualEntryId[] }>) {
  const definitions = OPS001_CONTENT.workspace.fieldManual.entries;
  return (
    <section className={styles['section']}>
      <h3>{heading}</h3>
      <dl className={styles['entries']}>
        {entries.map((id) => {
          const entry = definitions[id];
          return (
            <div className={styles['entry']} key={id} data-manual-entry={id}>
              <dt>{entry.label}</dt>
              <dd>{entry.detail}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
