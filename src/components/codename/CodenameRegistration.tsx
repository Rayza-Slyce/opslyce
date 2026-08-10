import { useState, type SyntheticEvent } from 'react';
import type { CodenameValidationResult } from '../../profile/codename';
import styles from './CodenameRegistration.module.css';

type CodenameRegistrationProps = Readonly<{
  value: string;
  onValueChange(value: string): void;
  onSubmit(value: string): CodenameValidationResult;
  onOpenSettings(): void;
  onReturnToTitle(): void;
}>;

export function CodenameRegistration({
  value,
  onValueChange,
  onSubmit,
  onOpenSettings,
  onReturnToTitle
}: CodenameRegistrationProps) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const result = onSubmit(value);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    setError(null);
    onValueChange(result.value);
  }

  return (
    <section className={styles['screen']} aria-labelledby="codename-heading">
      <div className={styles['panel']}>
        <div className={styles['utilityActions']}>
          <button type="button" onClick={onReturnToTitle}>
            Back to title
          </button>
          <button type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>

        <div>
          <p className={styles['eyebrow']}>Operative registration</p>
          <h1 id="codename-heading">Choose your operative codename.</h1>
          <p id="codename-guidance" className={styles['guidance']}>
            Use your first name or invent an agent name. Do not enter your full name.
          </p>
        </div>

        <form className={styles['form']} onSubmit={handleSubmit} noValidate>
          <label htmlFor="codename">Codename</label>
          <input
            id="codename"
            name="codename"
            type="text"
            value={value}
            onChange={(event) => {
              onValueChange(event.currentTarget.value);
              setError(null);
            }}
            aria-describedby={
              error === null ? 'codename-guidance' : 'codename-guidance codename-error'
            }
            aria-invalid={error === null ? undefined : true}
            autoComplete="off"
            spellCheck={false}
          />
          {error === null ? null : (
            <p id="codename-error" className={styles['error']} role="alert">
              {error}
            </p>
          )}
          <button className={styles['submit']} type="submit">
            Register codename
          </button>
        </form>
      </div>
    </section>
  );
}
