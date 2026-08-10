import { OPS001_CONTENT } from '../../missions/ops001/content';
import styles from './HqStation.module.css';

export function Ops001BriefingContent() {
  const { briefing, metadata } = OPS001_CONTENT;
  return (
    <div className={styles['briefingScroll']}>
      <article className={styles['briefingTransmission']}>
        <img
          className={styles['briefingPortrait']}
          src="/assets/characters/patch-neutral.png"
          alt="Director Patch"
        />
        <div className={styles['dialogue']}>
          <p className={styles['speaker']}>{briefing.speaker}</p>
          <p>{briefing.transmission}</p>
        </div>
      </article>
      <section className={styles['operationalSummary']} aria-labelledby="summary-heading">
        <h2 id="summary-heading">Operational summary</h2>
        <dl>
          <div>
            <dt>Operation</dt>
            <dd>
              {metadata.missionId} — {metadata.title}
            </dd>
          </div>
          <div>
            <dt>Objective</dt>
            <dd>{metadata.mainObjective}</dd>
          </div>
          <div>
            <dt>Available systems</dt>
            <dd>
              {briefing.availableSystems.map((system) => (
                <span key={system}>{system}</span>
              ))}
            </dd>
          </div>
          <div>
            <dt>Success condition</dt>
            <dd>{briefing.successCondition}</dd>
          </div>
        </dl>
      </section>
      <section className={styles['missionBoundary']} aria-labelledby="boundary-heading">
        <h2 id="boundary-heading">{briefing.boundaryHeading}</h2>
        <p>{briefing.boundary}</p>
      </section>
    </div>
  );
}
