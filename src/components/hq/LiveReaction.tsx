import styles from './HqStation.module.css';
import { splitReactionPhrases } from './reactionPhrases';

type LiveReactionProps = Readonly<{
  speaker: string;
  dialogue: string;
  portraitSrc: string;
  portraitAlt: string;
  portraitFacesContent?: boolean;
  animate: boolean;
  reactionId: 'byte' | 'patch';
}>;

export function LiveReaction({
  speaker,
  dialogue,
  portraitSrc,
  portraitAlt,
  portraitFacesContent = false,
  animate,
  reactionId
}: LiveReactionProps) {
  const phrases = splitReactionPhrases(dialogue);
  const reactionClassName = [styles['liveReaction'], animate ? styles['liveReactionActive'] : null]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const portraitClassName = [
    styles['reactionPortrait'],
    portraitFacesContent ? styles['reactionPortraitFacing'] : null
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return (
    <article
      className={reactionClassName}
      data-live-reaction={reactionId}
      data-reaction-state={animate ? 'revealing' : 'complete'}
    >
      <img className={portraitClassName} src={portraitSrc} alt={portraitAlt} />
      <div className={styles['reactionBody']}>
        <p className={styles['speaker']}>{speaker}</p>
        <p className={styles['reactionText']} data-reaction-copy>
          {phrases.map((phrase, index) => (
            <span key={phrase} data-reaction-segment={index + 1}>
              {phrase}
              {index === phrases.length - 1 ? '' : ' '}
            </span>
          ))}
        </p>
      </div>
    </article>
  );
}
