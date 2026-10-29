/**
 * The failure of the game is visible.
 *
 * WHAT: the test of the banner of the failure — it appears when the state
 * carries a failure, it names the failure in the language of the player,
 * and it disappears when the failure is cleared.
 *
 * WHY the test exists: a failure of the core used to end in the console.
 * The player was left with a button that did nothing. The banner is the
 * part of the shell that turns the state into something the player can see
 * and act on.
 *
 * WHY the file is a `.ts` file: the gate of the i18n completeness reads
 * every literal text of a `.tsx` file, and the fixtures of this test carry
 * texts of the translation.
 */
// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useGameStore } from '@/stores/game-store';
import { GameErrorBanner } from './GameErrorBanner';

// The translation of the shell is needed by the banner.
import i18n from '@/i18n/config';

/**
 * The banner of the failure, as the screen draws it.
 *
 * @param container - The container of the test
 * @returns The region of the failure
 */
function banner(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-testid="game-error-banner"]');
}

/**
 * Clicks a button of the banner.
 *
 * @param container - The container of the test
 * @param testId - The id of the button
 */
function click(container: HTMLElement, testId: string): void {
  const button = container.querySelector(`[data-testid="${testId}"]`);
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('the banner of the failure', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    // The surface of the shell is German first — the test reads the German
    // sentence, so the language is set explicitly.
    await i18n.changeLanguage('de');

    useGameStore.getState().initSession();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    // WHY: a mounted banner would hear every change of the store — the
    // next test would change it outside of `act`.
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  /**
   * Draws the banner.
   */
  function renderBanner(onReload?: () => void): void {
    act(() => {
      root.render(createElement(GameErrorBanner, { onReload }));
    });
  }

  it('shows nothing while the game works', () => {
    renderBanner();

    expect(banner(container)).toBeNull();
  });

  it('shows the failure of the game', () => {
    useGameStore.getState().setError('game.error.drawFailed');

    renderBanner();

    const region = banner(container);
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain(
      'Die nächste Karte konnte nicht gezogen werden.'
    );
  });

  it('tells the player what to do', () => {
    useGameStore.getState().setError('game.error.coreUnavailable');

    renderBanner();

    // WHY: the message names the failure and offers the two ways out — a
    // reload of the game and the administrator.
    const region = banner(container);
    expect(region?.textContent).toContain(
      'Lade das Spiel neu. Bleibt das Problem bestehen, wende dich an den Administrator.'
    );
  });

  it('announces the failure to a screen reader', () => {
    useGameStore.getState().setError('game.error.drawFailed');

    renderBanner();

    // WHY: the region is read out as soon as it appears — the player hears
    // the failure without looking for it.
    expect(banner(container)?.getAttribute('role')).toBe('alert');
  });

  it('gives the close button a name', () => {
    useGameStore.getState().setError('game.error.drawFailed');

    renderBanner();

    const dismiss = container.querySelector(
      '[data-testid="game-error-dismiss"]'
    ) as HTMLButtonElement | null;
    expect(dismiss).not.toBeNull();
    expect(dismiss?.tagName).toBe('BUTTON');
    expect(dismiss?.getAttribute('aria-label')).toBe('Meldung schließen');
  });

  it('disappears when the failure is cleared', () => {
    useGameStore.getState().setError('game.error.drawFailed');

    renderBanner();
    expect(banner(container)).not.toBeNull();

    click(container, 'game-error-dismiss');

    // The failure is gone from the state and from the screen.
    expect(useGameStore.getState().error).toBeNull();
    expect(banner(container)).toBeNull();
  });

  it('offers a reload of the game', () => {
    const onReload = vi.fn();
    useGameStore.getState().setError('game.error.coreUnavailable');

    renderBanner(onReload);
    click(container, 'game-error-reload');

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('shows the generic message for a failure without a key of its own', () => {
    useGameStore.getState().setError('game.error.somethingElse');

    renderBanner();

    // WHY: a key that names no known failure must not be shown as it is —
    // the player would read the key instead of a sentence.
    const region = banner(container);
    expect(region?.textContent).toContain('Etwas ist schiefgelaufen.');
    expect(region?.textContent).not.toContain('game.error.somethingElse');
  });
});
