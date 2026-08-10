import { getOps001Welcome, OPS001_CONTENT } from '../../missions/ops001/content';
import type { LocalOperativeProfile } from '../../profile/localProfile';
import { HqStation } from './HqStation';
import styles from './HqStation.module.css';

type WelcomeTransmissionScreenProps = Readonly<{
  profile: LocalOperativeProfile;
  onReturnToDashboard(): void;
  onOpenSettings(): void;
}>;

export function WelcomeTransmissionScreen({
  profile,
  onReturnToDashboard,
  onOpenSettings
}: WelcomeTransmissionScreenProps) {
  return (
    <HqStation
      eyebrow="Communications"
      title="Director Patch — Welcome"
      actions={
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      }
      footer={
        <button className={styles['primaryButton']} type="button" onClick={onReturnToDashboard}>
          Return to HQ
        </button>
      }
    >
      <article className={styles['transmission']} aria-label="Welcome transmission">
        <img
          className={styles['patchPortrait']}
          src="/assets/characters/patch-neutral.png"
          alt="Director Patch"
        />
        <div className={styles['dialogue']}>
          <p className={styles['speaker']}>{OPS001_CONTENT.welcome.speaker}</p>
          <p>{getOps001Welcome(profile.codename)}</p>
        </div>
      </article>
    </HqStation>
  );
}
