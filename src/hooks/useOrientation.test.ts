/**
 * @vitest-environment jsdom
 *
 * The hook of the orientation.
 *
 * WHAT: the unit test of the hook — the portrait, the landscape and the
 * rotation from one into the other, with a simulated media query.
 *
 * WHY the media query is simulated: the browser answers the query
 * '(orientation: landscape)' and reports the rotation with its 'change'
 * event. jsdom does not evaluate media queries, so the test brings a stub
 * that behaves like the browser: it knows the orientation and it tells the
 * listeners when it changes.
 *
 * WHY the viewport is simulated as well: the hook reads the measurements of
 * the window, because the width against the height is the rule of the
 * product. A stub that changes both is the situation of a real device that
 * is turned.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { useOrientation } from './useOrientation';

/** The media query the hook listens to. */
const LANDSCAPE_QUERY = '(orientation: landscape)';

/** The listener of the media query. */
type MediaQueryListener = (event: MediaQueryListEvent) => void;

/** The measurements of the simulated viewport. */
interface Viewport {
  width: number;
  height: number;
}

/** The stub of the browser: it knows the orientation and reports the change. */
interface BrowserStub {
  /** Turns the simulated device and notifies the listeners. */
  rotate: (orientation: 'portrait' | 'landscape') => void;
}

/**
 * Writes the measurements of the simulated viewport into the window.
 *
 * @param viewport The measurements of the viewport
 */
function setViewport(viewport: Viewport): void {
  Object.defineProperty(window, 'innerWidth', {
    value: viewport.width,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: viewport.height,
    configurable: true,
    writable: true,
  });
}

/**
 * Installs the stub of the media query into the window.
 *
 * @returns The stub of the browser
 */
function installBrowserStub(): BrowserStub {
  const listeners = new Set<MediaQueryListener>();
  let isLandscape = false;

  const landscapeQuery = {
    get matches() {
      return isLandscape;
    },
    media: LANDSCAPE_QUERY,
    onchange: null,
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };

  const otherQuery = {
    matches: false,
    media: '(min-width: 1px)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  };

  window.matchMedia = ((query: string) =>
    query === LANDSCAPE_QUERY
      ? landscapeQuery
      : otherQuery) as unknown as typeof window.matchMedia;

  return {
    rotate(orientation) {
      isLandscape = orientation === 'landscape';
      setViewport(
        orientation === 'landscape'
          ? { width: 800, height: 400 }
          : { width: 400, height: 800 }
      );
      for (const listener of listeners) {
        listener({
          matches: isLandscape,
          media: LANDSCAPE_QUERY,
        } as MediaQueryListEvent);
      }
    },
  };
}

/**
 * The probe: it writes what the hook reports into the DOM.
 *
 * WHY without JSX: the file is a `.ts` file, because the gate of the
 * i18n completeness reads every literal text of a `.tsx` file — and the
 * stub of the media query carries the query of the browser.
 */
function OrientationProbe() {
  const { orientation, isMeasured } = useOrientation();
  return createElement(
    'span',
    {
      'data-orientation': orientation,
      'data-measured': String(isMeasured),
    },
    orientation
  );
}

describe('useOrientation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let browser: BrowserStub;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    setViewport({ width: 400, height: 800 });
    browser = installBrowserStub();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  /**
   * Mounts the probe and reads what it reports.
   *
   * @returns The reported orientation
   */
  function renderProbe(): string {
    act(() => {
      root.render(createElement(OrientationProbe));
    });
    return container.querySelector('span')?.dataset.orientation ?? '';
  }

  it('reports the portrait for a narrow, tall viewport', () => {
    expect(renderProbe()).toBe('portrait');
  });

  it('reports the landscape for a wide, flat viewport', () => {
    setViewport({ width: 800, height: 400 });
    browser.rotate('landscape');

    expect(renderProbe()).toBe('landscape');
  });

  it('follows the rotation into the landscape and back into the portrait', () => {
    expect(renderProbe()).toBe('portrait');

    act(() => {
      browser.rotate('landscape');
    });
    expect(container.querySelector('span')?.dataset.orientation).toBe(
      'landscape'
    );

    act(() => {
      browser.rotate('portrait');
    });
    expect(container.querySelector('span')?.dataset.orientation).toBe(
      'portrait'
    );
  });

  it('measures the viewport after the first render', () => {
    renderProbe();

    expect(container.querySelector('span')?.dataset.measured).toBe('true');
  });

  it('renders on the server without a window', () => {
    // The export of the shell is static: the pages are rendered on the
    // server. The hook may not read the window while it renders.
    const markup = renderToStaticMarkup(createElement(OrientationProbe));

    expect(markup).toContain('portrait');
  });

  it('removes its listeners when it is unmounted', () => {
    renderProbe();

    act(() => {
      root.unmount();
    });

    // A rotation after the unmount may not throw — the listener is gone.
    expect(() => browser.rotate('landscape')).not.toThrow();
  });
});
