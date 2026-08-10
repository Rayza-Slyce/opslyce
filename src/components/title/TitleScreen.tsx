import type { LocalOperativeProfile } from '../../profile/localProfile';
import { deriveTitleState } from './titleState';
import styles from './TitleScreen.module.css';

type TitleScreenProps = Readonly<{
  profile: LocalOperativeProfile | null;
  resumableOperation?: unknown;
  onContinue?(): void;
  onEnterHq(): void;
  onOpenSettings(): void;
}>;

export function TitleScreen({
  profile,
  resumableOperation = null,
  onContinue,
  onEnterHq,
  onOpenSettings
}: TitleScreenProps) {
  const titleState = deriveTitleState(profile, resumableOperation);

  return (
    <section
      className={styles['title']}
      data-title-state={
        titleState.canContinue ? 'resumable-profile' : titleState.hasProfile ? 'profile' : 'fresh'
      }
      aria-labelledby="title-heading"
    >
      <div className={styles['content']}>
        <img
          className={styles['logo']}
          src="/assets/brand/opslyce-logo-horizontal.png"
          alt="OpSlyce"
        />
        <div className={styles['headingBlock']}>
          <p className={styles['eyebrow']}>Secure HQ access</p>
          <h1 id="title-heading">Welcome to OpSlyce HQ</h1>
          {profile === null ? (
            <p>Your operative workspace begins here.</p>
          ) : (
            <p>
              Local operative: <strong>{profile.codename}</strong>
            </p>
          )}
        </div>

        <div className={styles['actions']} aria-label="Title actions">
          {titleState.canContinue && onContinue !== undefined ? (
            <button className={styles['primaryAction']} type="button" onClick={onContinue}>
              Continue Operation
            </button>
          ) : null}
          <button className={styles['primaryAction']} type="button" onClick={onEnterHq}>
            Enter HQ
          </button>
          <button className={styles['secondaryAction']} type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </div>
    </section>
  );
}
