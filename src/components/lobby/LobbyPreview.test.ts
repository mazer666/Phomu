/**
 * @vitest-environment jsdom
 *
 * The preview of the session in the lobby.
 *
 * WHAT: the test of the preview — the players, the modes, the packs and the
 * condition that ends the game.
 *
 * WHY the file is a `.ts` file: the gate of the i18n completeness reads
 * every literal text of a `.tsx` file, and the fixtures of this test carry
 * names and ids.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LobbyPreview } from './LobbyPreview';
import i18n from '@/i18n/config';

describe('LobbyPreview', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    // The language of the session is fixed — the detector of the browser
    // would answer the language of the machine of the test.
    await i18n.changeLanguage('de');

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
   * Mounts the preview with the given choices.
   *
   * @param playerCount The number of the players
   * @param selectedModes The chosen modes
   * @param selectedPacks The chosen packs
   */
  function renderPreview(
    playerCount: number,
    selectedModes: ('timeline' | 'lyrics')[],
    selectedPacks: string[]
  ) {
    act(() => {
      root.render(
        createElement(LobbyPreview, {
          playerCount,
          selectedModes,
          selectedPacks,
          endingCondition: 'points',
          targetPoints: 100,
          targetRounds: 10,
          targetTimeMinutes: 60,
        })
      );
    });
  }

  it('shows the players, the modes, the packs and the ending condition', () => {
    renderPreview(2, ['timeline', 'lyrics'], ['Global Hits 1950-2026']);

    const text = container.textContent ?? '';

    expect(text).toContain('2 Spieler');
    expect(text).toContain('Timeline');
    expect(text).toContain('Lyrics Labyrinth');
    expect(text).toContain('Global Hits');
    expect(text).toContain('100 Pkt.');
  });

  it('names the modes that are not chosen yet', () => {
    renderPreview(1, [], []);

    const text = container.textContent ?? '';

    expect(text).toContain('1 Spieler');
    expect(text).toContain('Noch nichts gewählt');
  });
});
