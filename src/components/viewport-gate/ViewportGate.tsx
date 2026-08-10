import type { ViewportState } from '../../app/viewport/viewportState';
import styles from './ViewportGate.module.css';

type ViewportGateProps = Readonly<{
  state: Exclude<ViewportState, 'supported-landscape'>;
}>;

const gateContent = {
  'portrait-rotate-required': {
    eyebrow: 'Landscape required',
    title: 'Rotate your device',
    description: 'OpSlyce is designed for a clear landscape workspace.'
  },
  'small-screen-required': {
    eyebrow: 'Larger screen required',
    title: 'Use a larger screen',
    description: 'OpSlyce needs more room to keep its controls readable and dependable.'
  }
} as const;

export function ViewportGate({ state }: ViewportGateProps) {
  const content = gateContent[state];

  return (
    <main className={styles['gate']} data-viewport-state={state}>
      <section className={styles['message']} aria-labelledby="viewport-gate-title">
        <p className={styles['eyebrow']}>{content.eyebrow}</p>
        <h1 id="viewport-gate-title">{content.title}</h1>
        <p>{content.description}</p>
      </section>
    </main>
  );
}
