import {
  classifyViewport,
  PROVISIONAL_VIEWPORT_THRESHOLDS,
  resolveViewportEligibility
} from './viewportState';

describe('provisional viewport policy', () => {
  it.each([
    [{ width: 1280, height: 720 }, 'supported-landscape'],
    [{ width: 1024, height: 700 }, 'supported-landscape'],
    [{ width: 700, height: 1024 }, 'portrait-rotate-required'],
    [{ width: 844, height: 390 }, 'small-screen-required'],
    [{ width: 390, height: 844 }, 'small-screen-required']
  ] as const)('classifies %o as %s', (dimensions, expectedState) => {
    expect(classifyViewport(dimensions)).toBe(expectedState);
  });

  it('keeps the supported landscape boundary explicit', () => {
    expect(
      classifyViewport({
        width: PROVISIONAL_VIEWPORT_THRESHOLDS.supportedLandscapeMinWidth,
        height: PROVISIONAL_VIEWPORT_THRESHOLDS.supportedLandscapeMinHeight
      })
    ).toBe('supported-landscape');
  });

  it('sends a landscape viewport below either supported dimension to the small-screen gate', () => {
    expect(classifyViewport({ width: 899, height: 600 })).toBe('small-screen-required');
    expect(classifyViewport({ width: 900, height: 599 })).toBe('small-screen-required');
  });
});

describe('viewport eligibility', () => {
  it('retains an eligible tablet landscape during keyboard height contraction', () => {
    const eligible = resolveViewportEligibility({ width: 1024, height: 700 });
    expect(
      resolveViewportEligibility({ width: 1024, height: 420 }, eligible.tabletLandscapeEligible)
        .state
    ).toBe('supported-landscape');
  });

  it('does not use keyboard retention to admit phones or portrait tablets', () => {
    expect(resolveViewportEligibility({ width: 844, height: 390 }, true).state).toBe(
      'small-screen-required'
    );
    expect(resolveViewportEligibility({ width: 700, height: 1024 }, true).state).toBe(
      'portrait-rotate-required'
    );
  });
});
