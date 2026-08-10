import { useEffect, useState } from 'react';
import { resolveViewportEligibility, type ViewportEligibility } from './viewportState';

function readViewport(previouslyEligible = false): ViewportEligibility {
  return resolveViewportEligibility(
    { width: window.innerWidth, height: window.innerHeight },
    previouslyEligible
  );
}

export function useViewportState(): ViewportEligibility {
  const [viewport, setViewport] = useState(() => readViewport());
  useEffect(() => {
    const update = () => setViewport((current) => readViewport(current.tabletLandscapeEligible));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return viewport;
}
