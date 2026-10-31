/**
 * The hint that the area can be scrolled.
 *
 * WHAT: a small hook that watches an area and reports whether there is more
 * to see in it.
 *
 * WHY the hint: the areas that scroll have no scrollbar — a scrollbar on a
 * phone looks like a bug, and it takes the width of the screen. But an area
 * that can be scrolled and does not say so is worse: the player pulls on the
 * timeline and nothing happens, and the years on the far end stay invisible.
 * The hint is the edge of the area that fades out — the eye reads it as
 * "there is more".
 *
 * WHY the observer: the area changes its size with the viewport, and the
 * content of the timeline grows with every correct answer. Both change the
 * answer, so both have to be watched.
 *
 * EXAMPLE: `const kannScrollen = useScrollHint(ref);`
 */
'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Watches an area and reports whether it has more to show.
 *
 * @param ref - The area to watch
 * @returns Whether the area can be scrolled
 */
export function useScrollHint(ref: RefObject<HTMLElement | null>): boolean {
  const [hinweis, setHinweis] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const pruefe = () => {
      const mehrWaagerecht =
        element.scrollWidth - element.clientWidth > 2;
      const mehrSenkrecht =
        element.scrollHeight - element.clientHeight > 2;
      setHinweis(mehrWaagerecht || mehrSenkrecht);
    };

    pruefe();
    element.addEventListener('scroll', pruefe, { passive: true });
    // WHY the guard: the observer does not exist in every environment — the
    // test of the interface runs without it.
    const beobachter =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(pruefe);
    beobachter?.observe(element);
    if (element.firstElementChild) {
      beobachter?.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener('scroll', pruefe);
      beobachter?.disconnect();
    };
  }, [ref]);

  return hinweis;
}
