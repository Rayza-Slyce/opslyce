import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import type { CodenameSaveResult } from '../../profile/codename';
import type { LocalOperativeProfile, OperativeSettings } from '../../profile/localProfile';
import styles from './SettingsPanel.module.css';

type ConfirmationMode = 'restart' | 'reset' | null;

type SettingsPanelProps = Readonly<{
  profile: LocalOperativeProfile | null;
  settings: OperativeSettings;
  canRestartOperation: boolean;
  onUpdateSetting(setting: keyof OperativeSettings, value: boolean): void;
  onEditCodename(value: string): CodenameSaveResult;
  onRestartOperation(): void;
  onResetProgress(): void;
  onClose(): void;
}>;

export function SettingsPanel({
  profile,
  settings,
  canRestartOperation,
  onUpdateSetting,
  onEditCodename,
  onRestartOperation,
  onResetProgress,
  onClose
}: SettingsPanelProps) {
  const [codename, setCodename] = useState(profile?.codename ?? '');
  const [codenameError, setCodenameError] = useState<string | null>(null);
  const [codenameSaved, setCodenameSaved] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode>(null);
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null);
  const restartOperationRef = useRef<HTMLButtonElement>(null);
  const resetProgressRef = useRef<HTMLButtonElement>(null);
  const restoreConfirmationFocus = useRef<Exclude<ConfirmationMode, null> | null>(null);

  useEffect(() => {
    if (confirmationMode !== null) {
      cancelConfirmationRef.current?.focus();
      return;
    }

    if (restoreConfirmationFocus.current === 'restart') {
      restoreConfirmationFocus.current = null;
      restartOperationRef.current?.focus();
    } else if (restoreConfirmationFocus.current === 'reset') {
      restoreConfirmationFocus.current = null;
      resetProgressRef.current?.focus();
    }
  }, [confirmationMode]);

  function handleCodenameSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const result = onEditCodename(codename);

    if (!result.valid) {
      setCodenameError(result.error);
      setCodenameSaved(false);
      return;
    }

    setCodename(result.value);
    setCodenameError(null);
    setCodenameSaved(result.persisted);
  }

  function cancelConfirmation() {
    if (confirmationMode !== null) {
      restoreConfirmationFocus.current = confirmationMode;
    }
    setConfirmationMode(null);
  }

  function handleConfirmationKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelConfirmation();
    }
  }

  if (confirmationMode !== null) {
    const restarting = confirmationMode === 'restart';
    const heading = restarting ? 'Restart current operation?' : 'Reset all progress?';
    const warning = restarting
      ? 'OPS-001 will restart from the beginning. Current mission progress, evidence, command history and mission Field Manual unlocks will be cleared. Your codename and Settings will be kept.'
      : 'Your codename, messages, mission progress and active operation will be removed. This cannot be undone.';

    return (
      <section className={styles['screen']} aria-labelledby="progress-confirmation-heading">
        <div
          className={styles['panel']}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="progress-confirmation-heading"
          aria-describedby="progress-confirmation-warning"
          onKeyDown={handleConfirmationKeyDown}
        >
          <div>
            <p className={styles['eyebrow']}>Progress</p>
            <h1 id="progress-confirmation-heading">{heading}</h1>
          </div>
          <p id="progress-confirmation-warning">{warning}</p>
          <div className={styles['confirmationActions']}>
            <button
              ref={cancelConfirmationRef}
              className={styles['cancelButton']}
              type="button"
              onClick={cancelConfirmation}
            >
              Cancel
            </button>
            <button
              className={styles['confirmButton']}
              type="button"
              onClick={restarting ? onRestartOperation : onResetProgress}
            >
              {restarting ? 'Restart operation' : 'Reset progress'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles['screen']} aria-labelledby="settings-heading">
      <div className={styles['panel']}>
        <div className={styles['heading']}>
          <div>
            <p className={styles['eyebrow']}>Local preferences</p>
            <h1 id="settings-heading">Settings</h1>
          </div>
          <button className={styles['close']} type="button" onClick={onClose}>
            Close Settings
          </button>
        </div>

        <fieldset className={styles['preferences']}>
          <legend>Audio preferences</legend>
          <label>
            <span>
              <strong>Sound effects</strong>
              <small>Mission and communication cues.</small>
            </span>
            <span className={styles['toggle']}>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(event) => onUpdateSetting('soundEffects', event.currentTarget.checked)}
              />
              {settings.soundEffects ? 'On' : 'Off'}
            </span>
          </label>
          <label>
            <span>
              <strong>HQ ambience</strong>
              <small>Subtle background atmosphere while at HQ.</small>
            </span>
            <span className={styles['toggle']}>
              <input
                type="checkbox"
                checked={settings.hqAmbience}
                onChange={(event) => onUpdateSetting('hqAmbience', event.currentTarget.checked)}
              />
              {settings.hqAmbience ? 'On' : 'Off'}
            </span>
          </label>
        </fieldset>

        <fieldset className={styles['preferences']}>
          <legend>Command preferences</legend>
          <label>
            <span>
              <strong>Command assistance</strong>
              <small>Make visible files and folders tappable for preparing commands.</small>
            </span>
            <span className={styles['toggle']}>
              <input
                type="checkbox"
                checked={settings.commandAssistance}
                onChange={(event) =>
                  onUpdateSetting('commandAssistance', event.currentTarget.checked)
                }
              />
              {settings.commandAssistance ? 'On' : 'Off'}
            </span>
          </label>
        </fieldset>

        {profile === null ? null : (
          <>
            <form className={styles['codenameForm']} onSubmit={handleCodenameSubmit} noValidate>
              <h2>Edit codename</h2>
              <label htmlFor="settings-codename">Codename</label>
              <input
                id="settings-codename"
                type="text"
                value={codename}
                onChange={(event) => {
                  setCodename(event.currentTarget.value);
                  setCodenameError(null);
                  setCodenameSaved(false);
                }}
                aria-invalid={codenameError === null ? undefined : true}
                aria-describedby={codenameError === null ? undefined : 'settings-codename-error'}
                autoComplete="off"
                spellCheck={false}
              />
              {codenameError === null ? null : (
                <p id="settings-codename-error" className={styles['error']} role="alert">
                  {codenameError}
                </p>
              )}
              {codenameSaved ? <p className={styles['saved']}>Codename saved.</p> : null}
              <button className={styles['save']} type="submit">
                Save codename
              </button>
            </form>

            <section className={styles['progress']} aria-labelledby="progress-heading">
              <h2 id="progress-heading">Progress</h2>
              {canRestartOperation ? (
                <div className={styles['progressAction']}>
                  <p>
                    Restart OPS-001 from the beginning without removing your codename or Settings.
                  </p>
                  <button
                    ref={restartOperationRef}
                    className={styles['restartButton']}
                    type="button"
                    onClick={() => setConfirmationMode('restart')}
                  >
                    Restart current operation
                  </button>
                </div>
              ) : null}
              <div className={styles['progressAction']}>
                <p>
                  Remove this operative profile and all mission progress from this device. Sound and
                  ambience settings will be kept.
                </p>
                <button
                  ref={resetProgressRef}
                  className={styles['resetButton']}
                  type="button"
                  onClick={() => setConfirmationMode('reset')}
                >
                  Reset progress
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
