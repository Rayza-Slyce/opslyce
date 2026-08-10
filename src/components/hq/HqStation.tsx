import type { PropsWithChildren, ReactNode } from 'react';
import styles from './HqStation.module.css';

type HqStationProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  footer?: ReactNode;
  mode?: 'hq' | 'mission';
}>;

export function HqStation({
  children,
  eyebrow,
  title,
  actions,
  footer,
  mode = 'hq'
}: HqStationProps) {
  return (
    <section className={styles['station']} aria-labelledby="station-heading">
      <div className={styles['monitorSurface']} data-mode={mode}>
        <header className={styles['stationHeader']}>
          <div className={styles['stationIdentity']}>
            <img
              className={styles['emblem']}
              src="/assets/brand/opslyce-emblem.png"
              alt=""
              aria-hidden="true"
            />
            <div>
              <p className={styles['eyebrow']}>{eyebrow}</p>
              <h1 id="station-heading">{title}</h1>
            </div>
          </div>
          {actions === undefined ? null : (
            <nav className={styles['utilityActions']} aria-label={`${title} actions`}>
              {actions}
            </nav>
          )}
        </header>
        <div className={styles['stationBody']}>{children}</div>
        {footer === undefined ? null : (
          <footer className={styles['stationFooter']}>{footer}</footer>
        )}
      </div>
    </section>
  );
}
