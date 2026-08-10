export const PROVISIONAL_VIEWPORT_THRESHOLDS = Object.freeze({
  supportedLandscapeMinWidth: 900,
  supportedLandscapeMinHeight: 600,
  portraitGateMinWidth: 600
});

export type ViewportState =
  'supported-landscape' | 'portrait-rotate-required' | 'small-screen-required';

export type ViewportDimensions = Readonly<{
  width: number;
  height: number;
}>;

export type ViewportEligibility = Readonly<{
  state: ViewportState;
  tabletLandscapeEligible: boolean;
  availableHeight: number;
}>;

/**
 * Stage 2 provisional viewport policy. These thresholds must be reviewed after
 * measuring the Galaxy Tab A9+ CSS viewport and its on-screen-keyboard behaviour.
 */
export function classifyViewport({ width, height }: ViewportDimensions): ViewportState {
  const isPortrait = height >= width;

  if (isPortrait) {
    return width < PROVISIONAL_VIEWPORT_THRESHOLDS.portraitGateMinWidth
      ? 'small-screen-required'
      : 'portrait-rotate-required';
  }

  if (
    width < PROVISIONAL_VIEWPORT_THRESHOLDS.supportedLandscapeMinWidth ||
    height < PROVISIONAL_VIEWPORT_THRESHOLDS.supportedLandscapeMinHeight
  ) {
    return 'small-screen-required';
  }

  return 'supported-landscape';
}

/**
 * Keeps an already eligible tablet landscape active while the on-screen
 * keyboard contracts only its visual height. Width and real orientation still
 * govern device eligibility, so phones and portrait tablets remain gated.
 */
export function resolveViewportEligibility(
  dimensions: ViewportDimensions,
  previouslyEligible = false
): ViewportEligibility {
  const normalState = classifyViewport(dimensions);
  const remainsEligible =
    previouslyEligible &&
    dimensions.width >= PROVISIONAL_VIEWPORT_THRESHOLDS.supportedLandscapeMinWidth &&
    dimensions.width > dimensions.height;
  return {
    state: remainsEligible ? 'supported-landscape' : normalState,
    tabletLandscapeEligible: normalState === 'supported-landscape' || remainsEligible,
    availableHeight: dimensions.height
  };
}
