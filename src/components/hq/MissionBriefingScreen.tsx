import { OPS001_CONTENT } from '../../missions/ops001/content';
import { HqStation } from './HqStation';
import { Ops001BriefingContent } from './Ops001BriefingContent';
import styles from './HqStation.module.css';

type MissionBriefingScreenProps = Readonly<{
  onBackToDashboard(): void;
  onDeploy(): void;
  onOpenSettings(): void;
}>;

export function MissionBriefingScreen({
  onBackToDashboard,
  onDeploy,
  onOpenSettings
}: MissionBriefingScreenProps) {
  const { metadata } = OPS001_CONTENT;

  return (
    <HqStation
      eyebrow="Assigned operation"
      title={`${metadata.missionId} — ${metadata.title}`}
      actions={
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      }
      footer={
        <>
          <button type="button" onClick={onBackToDashboard}>
            Back to HQ
          </button>
          <button
            className={styles['primaryButton']}
            type="button"
            data-audio-ui="deploy"
            onClick={onDeploy}
          >
            Deploy
          </button>
        </>
      }
    >
      <Ops001BriefingContent />
    </HqStation>
  );
}
