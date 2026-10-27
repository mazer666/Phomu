/**
 * The orientation of the shell.
 *
 * WHAT: the hook that tells a page whether the viewport of the browser is in
 * the portrait or in the landscape.
 *
 * WHY the hook exists: a party is played on a phone in the portrait and on a
 * tablet or a laptop in the landscape. The landscape has twice the width and
 * half the height — a one-column interface leaves half of the screen empty
 * there. The pages ask the hook which layout they have to draw.
 *
 * WHY the media query and not a timer: the media query '(orientation:
 * landscape)' is answered by the browser itself when the device is turned.
 * The hook listens to its 'change' event and to the 'resize' event of the
 * window — a window that is dragged into another shape is a resize, not a
 * rotation. There is no polling.
 *
 * WHY the hook is safe on the server: the export of the shell is static, the
 * pages are rendered on the server before they reach the browser. The hook
 * reads no window while it renders; it measures in the effect, after the
 * page is in the browser. The first render is therefore the portrait — the
 * layout that fits everywhere.
 *
 * WHY the state of the session is not touched: the hook only reports the
 * shape of the viewport. The state of the running game lives in the store
 * and survives a rotation untouched.
 *
 * EXAMPLE: `const { orientation, isLandscape } = useOrientation();`
 */
'use client';

import { useEffect, useState } from 'react';
import {
  resolveOrientation,
  type ScreenOrientation,
} from '@/utils/orientation-layout';

/** The media query that reports the orientation of the viewport. */
const LANDSCAPE_QUERY = '(orientation: landscape)';

/** The state of the orientation. */
export interface OrientationState {
  /** The orientation of the viewport. */
  orientation: ScreenOrientation;
  /** Whether the viewport is in the landscape. */
  isLandscape: boolean;
  /** Whether the viewport is in the portrait. */
  isPortrait: boolean;
  /** Whether the viewport was measured already — false during the server render. */
  isMeasured: boolean;
}

/**
 * Reads the orientation of the browser.
 *
 * WHY the measurements first: the width against the height is the rule of
 * the product ("a narrow, tall window is the portrait, a wide, flat one is
 * the landscape"), and the measurements are available in every browser. The
 * media query is the fallback for the case that the browser does not
 * deliver a viewport.
 *
 * @returns The orientation of the viewport
 */
function readOrientation(): ScreenOrientation {
  if (typeof window === 'undefined') return 'portrait';

  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(LANDSCAPE_QUERY)
      : null;

  return resolveOrientation({
    width: window.innerWidth,
    height: window.innerHeight,
    mediaIsLandscape: media?.matches,
  });
}

/**
 * Reports the orientation of the viewport.
 *
 * @returns The orientation of the viewport and whether it was measured
 */
export function useOrientation(): OrientationState {
  // The first render happens without a browser: the portrait is the layout
  // that fits everywhere, the measurement follows in the effect.
  const [orientation, setOrientation] = useState<ScreenOrientation>('portrait');
  const [isMeasured, setIsMeasured] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setOrientation(readOrientation());
      setIsMeasured(true);
    };

    // The measurement of the first moment: the page may be opened on a
    // device that lies in the landscape.
    update();

    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(LANDSCAPE_QUERY)
        : null;

    // The rotation of the device: the browser answers the media query.
    media?.addEventListener('change', update);
    // A window that is dragged into another shape: a resize.
    window.addEventListener('resize', update);

    return () => {
      media?.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return {
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
    isMeasured,
  };
}
