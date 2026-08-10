import { OPS001_CONTENT } from '../../missions/ops001/content';
import type { Ops001ActiveCheckpoint } from '../../profile/localProfile';
import { HqStation } from '../hq/HqStation';
import styles from './MissionWorkspace.module.css';

type Props = Readonly<{ checkpoint: Ops001ActiveCheckpoint; onContinue(): void; onBack(): void }>;

export function ResumeSummaryScreen({ checkpoint, onContinue, onBack }: Props) {
  const { metadata, workspace } = OPS001_CONTENT;
  const latestEvidence = checkpoint.activeEvidenceIds.includes('EV-004')
    ? workspace.evidence.entries['EV-004'].title
    : checkpoint.activeEvidenceIds.includes('EV-003')
      ? workspace.evidence.entries['EV-003'].title
      : checkpoint.activeEvidenceIds.includes('EV-002')
        ? workspace.evidence.entries['EV-002'].title
        : checkpoint.activeEvidenceIds.includes('EV-001')
          ? workspace.evidence.entries['EV-001'].title
          : workspace.resume.noEvidence;
  return (
    <HqStation eyebrow="Active operation" title="Resume operation">
      <section
        className={styles['resumeSummary']}
        aria-labelledby="resume-operation-heading"
        data-objective-id={checkpoint.objectiveId}
      >
        <h2 id="resume-operation-heading">
          {metadata.missionId} — {metadata.title}
        </h2>
        <dl>
          <div>
            <dt>Current objective:</dt>
            <dd>{workspace.objectives[checkpoint.objectiveId].wording}</dd>
          </div>
          <div>
            <dt>Last confirmed evidence:</dt>
            <dd>{latestEvidence}</dd>
          </div>
        </dl>
        <div className={styles['resumeActions']}>
          <button type="button" onClick={onBack}>
            Back to title
          </button>
          <button type="button" onClick={onContinue}>
            Continue Operation
          </button>
        </div>
      </section>
    </HqStation>
  );
}
