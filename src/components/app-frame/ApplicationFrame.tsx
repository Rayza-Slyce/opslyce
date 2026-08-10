import type { PropsWithChildren } from 'react';
import styles from './ApplicationFrame.module.css';

type ApplicationFrameProps = PropsWithChildren<{
  engineStatus: string;
}>;

export function ApplicationFrame({ children, engineStatus }: ApplicationFrameProps) {
  return (
    <main
      className={styles['viewport']}
      data-engine-status={engineStatus}
      data-viewport-state="supported-landscape"
    >
      <div className={styles['safeArea']}>
        <div className={styles['frame']}>{children}</div>
      </div>
    </main>
  );
}
