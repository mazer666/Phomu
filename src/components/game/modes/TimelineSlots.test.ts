/**
 * @vitest-environment jsdom
 *
 * The slots of the timeline on their axis.
 *
 * WHAT: the test of the component that draws the slots — on the vertical
 * axis of the portrait and on the horizontal axis of the landscape.
 *
 * WHY the test exists: the landscape draws a timeline that runs from left
 * to right, and the years are the marks on its line. A slot that is missing
 * or a year that is not on the line would make the mode unplayable — and
 * the difference between the two axes is only visible in the browser.
 *
 * WHY the file is a `.ts` file: the gate of the i18n completeness reads
 * every literal text of a `.tsx` file, and the fixtures of this test carry
 * the names of the songs.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TimelineSlots, type TimelineAxis } from './TimelineSlots';
import i18n from '@/i18n/config';

/** The years that are on the timeline of the fixture. */
const YEARS = [1970, 1980, 1990];

describe('TimelineSlots', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
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
   * Mounts the slots on the given axis.
   *
   * @param axis - The axis of the timeline
   * @param isRevealed - Whether the round was revealed
   * @param hasAnswer - Whether an answer of the player reached the base
   */
  function renderSlots(
    axis: TimelineAxis,
    isRevealed = false,
    hasAnswer = true
  ): void {
    act(() => {
      root.render(
        createElement(TimelineSlots, {
          timelineYears: YEARS,
          selectedSlot: 1,
          jokerSlot: null,
          correctSlot: null,
          validSlotSet: new Set([1]),
          isRevealed,
          hasAnswer,
          identity: { title: 'Example Song', artist: 'The Example', year: 2001 },
          axis,
          onSelect: () => undefined,
        })
      );
    });
  }

  it('draws one slot more than the timeline has years', () => {
    renderSlots('vertical');
    // The free slots carry their number — the last one is the fourth.
    expect(container.textContent).toContain('4');
  });

  it('draws the years of the timeline on the vertical axis', () => {
    renderSlots('vertical');
    for (const year of YEARS) {
      expect(container.textContent).toContain(String(year));
    }
  });

  it('draws the years of the timeline on the horizontal axis', () => {
    renderSlots('horizontal');
    for (const year of YEARS) {
      expect(container.textContent).toContain(String(year));
    }
  });

  it('draws the same number of slots on both axes', () => {
    renderSlots('vertical');
    const vertical = container.querySelectorAll('button').length;
    renderSlots('horizontal');
    const horizontal = container.querySelectorAll('button').length;

    expect(horizontal).toBe(vertical);
  });

  it('judges nothing in a round without an answer', () => {
    renderSlots('vertical', true, false);

    // WHY: the base has no identity in a round without an answer — the slot
    // would show the year `0` and a wrong placement.
    expect(container.textContent).not.toContain('2001');
  });

  it('shows the song of the round after a judged answer', () => {
    renderSlots('vertical', true, true);

    expect(container.textContent).toContain('2001');
  });

  it('shows the placement of the player in a round without an answer', () => {
    renderSlots('vertical', true, false);

    // The placement stays visible — only the judgement is missing.
    expect(container.textContent).toContain(i18n.t('modes.timeline.placed'));
  });
});
