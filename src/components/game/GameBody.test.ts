/**
 * @vitest-environment jsdom
 *
 * The columns of the game screen.
 *
 * WHAT: the test of the body of the game — the number of columns in the
 * portrait and in the landscape, and the survival of the phase of the round
 * during a rotation.
 *
 * WHY the test mounts the body and not the page: the page holds the state of
 * the session and needs the whole store; the body holds the decision of the
 * layout and can be mounted with two props.
 *
 * WHY the file is a `.ts` file: the gate of the i18n completeness reads
 * every literal text of a `.tsx` file, and the fixtures of this test carry
 * names and ids.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GameBody } from './GameBody';
import { resolveGameLayout } from '@/utils/orientation-layout';
import type { Player } from '@/types/player';

// The router of the shell is not mounted in a test — the settings of the
// side column navigate with it.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
}));

// The translation of the shell is needed by the side column.
import '@/i18n/config';

/** How often the phase of the round was mounted. */
let phaseMountCount = 0;

/**
 * The phase of the round: it counts how often it was mounted.
 */
function PhaseProbe() {
  useEffect(() => {
    phaseMountCount += 1;
  }, []);
  return createElement('main', { id: 'phase' });
}

/**
 * Builds a player for the fixture.
 *
 * @param id The id of the player
 * @param name The name of the player
 * @param score The points of the player
 * @returns The player of the fixture
 */
function makePlayer(id: string, name: string, score: number): Player {
  return {
    id,
    name,
    score,
    isEliminated: false,
    isSpectator: false,
    isPilot: false,
  };
}

describe('GameBody', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    phaseMountCount = 0;
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
   * Mounts the body with the layout of the given orientation.
   *
   * @param orientation The orientation the body draws
   */
  function renderBody(orientation: 'portrait' | 'landscape') {
    act(() => {
      root.render(
        createElement(
          GameBody,
          {
            layout: resolveGameLayout(orientation),
            players: [
              makePlayer('p1', 'Ada', 30),
              makePlayer('p2', 'Bo', 10),
            ],
            teams: [],
            teamMode: 'individual',
            winCondition: 100,
            onLeaveParty: () => undefined,
            onOpenFullSettings: () => undefined,
          },
          createElement(PhaseProbe)
        )
      );
    });
  }

  /**
   * The frame that holds the columns.
   *
   * @returns The frame of the body
   */
  function frame(): HTMLElement {
    return container.querySelector('[data-columns]') as HTMLElement;
  }

  it('draws one column in the portrait', () => {
    renderBody('portrait');

    expect(frame().dataset.columns).toBe('1');
    expect(frame().children).toHaveLength(1);
    expect(container.querySelector('[data-testid="game-side-panel"]')).toBeNull();
  });

  it('draws two columns in the landscape', () => {
    renderBody('landscape');

    expect(frame().dataset.columns).toBe('2');
    expect(frame().children).toHaveLength(2);
    expect(
      container.querySelector('[data-testid="game-side-panel"]')
    ).not.toBeNull();
  });

  it('keeps the phase of the round mounted during the rotation', () => {
    renderBody('portrait');
    const phaseBefore = container.querySelector('#phase');

    renderBody('landscape');
    const phaseAfter = container.querySelector('#phase');

    // The phase was not remounted — the player of the music does not
    // restart when the device is turned.
    expect(phaseMountCount).toBe(1);
    expect(phaseAfter).toBe(phaseBefore);
  });
});
