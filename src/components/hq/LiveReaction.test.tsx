import { render, screen } from '@testing-library/react';
import { LiveReaction } from './LiveReaction';
import { splitReactionPhrases } from './reactionPhrases';

describe('LiveReaction', () => {
  it('derives a brisk sentence-level reveal without changing the authored dialogue', () => {
    const dialogue =
      'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.';
    expect(splitReactionPhrases(dialogue)).toEqual([
      'HQ has logged an unidentified signal event.',
      'We do not yet know its source or purpose.',
      'Keep the evidence; patterns matter.'
    ]);

    render(
      <LiveReaction
        speaker="Director Patch"
        dialogue={dialogue}
        portraitSrc="/assets/characters/patch-neutral.png"
        portraitAlt="Director Patch portrait"
        animate
        reactionId="patch"
      />
    );

    const reaction = document.querySelector('[data-live-reaction="patch"]');
    if (!(reaction instanceof HTMLElement)) throw new Error('Expected live reaction article.');
    expect(reaction.querySelector('[data-reaction-copy]')).toHaveTextContent(dialogue);
    expect(reaction).toHaveAttribute('data-reaction-state', 'revealing');
    expect(reaction.querySelectorAll('[data-reaction-segment]')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Director Patch portrait' })).toHaveAttribute(
      'src',
      '/assets/characters/patch-neutral.png'
    );
  });

  it('renders the complete resting message without the live reveal state', () => {
    render(
      <LiveReaction
        speaker="Byte"
        dialogue="Signal recorded. Standing by."
        portraitSrc="/assets/characters/byte-neutral.png"
        portraitAlt="Byte portrait"
        portraitFacesContent
        animate={false}
        reactionId="byte"
      />
    );

    const reaction = document.querySelector('[data-live-reaction="byte"]');
    expect(reaction?.querySelector('[data-reaction-copy]')).toHaveTextContent(
      'Signal recorded. Standing by.'
    );
    expect(reaction).toHaveAttribute('data-reaction-state', 'complete');
    expect(screen.getByRole('img', { name: 'Byte portrait' })).toBeVisible();
  });
});
