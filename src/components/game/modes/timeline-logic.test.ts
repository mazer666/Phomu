/**
 * The pure logic of the Timeline mode.
 *
 * WHY: these tests pin the rules that were extracted from
 * `src/components/game/modes/TimelineMode.tsx` into
 * `src/components/game/modes/timeline-logic.ts`. The component only draws
 * what these functions decide, so a change of the logic shows up here and
 * not in the DOM.
 */
import { describe, it, expect } from 'vitest';
import {
  TIMELINE_CHEAT_PENALTIES,
  TIMELINE_INITIAL_YEAR_COUNT,
  describeTimelineSlot,
  isTimelineSlotCorrect,
  nextTimelineSlot,
  randomInitialYears,
  resolveTimelineOutcome,
  slotFromNumberKey,
  timelineAnswerSeconds,
  timelinePointBudget,
  timelineSlotCount,
} from '@/components/game/modes/timeline-logic';
import {
  CHEAT_PENALTY_TIMELINE_DECADE,
  CHEAT_PENALTY_TIMELINE_JOKER,
} from '@/utils/mode-rules';

describe('the years the timeline starts with', () => {
  it('takes three years out of the scale', () => {
    const scale = [1960, 1970, 1980, 1990, 2000];
    const years = randomInitialYears(scale, TIMELINE_INITIAL_YEAR_COUNT);
    expect(years).toHaveLength(TIMELINE_INITIAL_YEAR_COUNT);
    for (const year of years) expect(scale).toContain(year);
  });

  it('sorts the years in ascending order', () => {
    const scale = [2000, 1960, 1990, 1970, 1980];
    const years = randomInitialYears(scale, TIMELINE_INITIAL_YEAR_COUNT);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it('takes fewer years than the scale holds', () => {
    const scale = [1980, 1990];
    expect(randomInitialYears(scale, TIMELINE_INITIAL_YEAR_COUNT)).toHaveLength(
      2
    );
  });

  it('takes no year out of an empty scale', () => {
    expect(randomInitialYears([], TIMELINE_INITIAL_YEAR_COUNT)).toEqual([]);
  });
});

describe('the slots of the timeline', () => {
  it('has one slot more than the timeline has years', () => {
    expect(timelineSlotCount(0)).toBe(1);
    expect(timelineSlotCount(3)).toBe(4);
    expect(timelineSlotCount(10)).toBe(11);
  });

  it('counts a placement in an accepted slot as correct', () => {
    const valid = new Set([1, 2]);
    expect(isTimelineSlotCorrect(1, valid)).toBe(true);
    expect(isTimelineSlotCorrect(3, valid)).toBe(false);
  });

  it('counts a placement without a slot as wrong', () => {
    expect(isTimelineSlotCorrect(null, new Set([1]))).toBe(false);
  });
});

describe('the state of a slot', () => {
  const base = {
    index: 1,
    selectedSlot: null,
    jokerSlot: null,
    correctSlot: null,
    isAnswerCorrect: false,
    isRevealed: false,
    hasAnswer: true,
  };

  it('draws a free slot before the reveal', () => {
    expect(describeTimelineSlot({ ...base, index: 0 }).kind).toBe('open');
  });

  it('draws the placement of the player before the reveal', () => {
    expect(describeTimelineSlot({ ...base, selectedSlot: 1 }).kind).toBe(
      'placed'
    );
  });

  it('crosses the slot of the joker out before the reveal', () => {
    expect(describeTimelineSlot({ ...base, jokerSlot: 1 }).kind).toBe('joker');
  });

  it('draws the joker slot again after the reveal', () => {
    expect(
      describeTimelineSlot({ ...base, jokerSlot: 1, isRevealed: true }).kind
    ).toBe('dimmed');
  });

  it('judges nothing in a round without an answer', () => {
    // WHY: a round can be revealed without an answer — the round timed
    // out, or the table skipped it. Then the placement of the player stays
    // visible, but the round carries no judgement: the base has no answer
    // and no identity, so the slot would show the year `0`.
    expect(
      describeTimelineSlot({
        ...base,
        selectedSlot: 1,
        correctSlot: 2,
        isRevealed: true,
        hasAnswer: false,
      }).kind
    ).toBe('placed');
  });

  it('draws no hint in a round without an answer', () => {
    expect(
      describeTimelineSlot({
        ...base,
        correctSlot: 2,
        isRevealed: true,
        hasAnswer: false,
      }).kind
    ).toBe('dimmed');
  });

  it('draws the placement green after a correct answer', () => {
    expect(
      describeTimelineSlot({
        ...base,
        selectedSlot: 1,
        correctSlot: 1,
        isAnswerCorrect: true,
        isRevealed: true,
      }).kind
    ).toBe('correct');
  });

  it('draws the placement red after a wrong answer', () => {
    expect(
      describeTimelineSlot({
        ...base,
        selectedSlot: 1,
        correctSlot: 2,
        isRevealed: true,
      }).kind
    ).toBe('wrong');
  });

  it('marks the canonical slot of a wrong answer as the hint', () => {
    expect(
      describeTimelineSlot({
        ...base,
        index: 2,
        selectedSlot: 1,
        correctSlot: 2,
        isRevealed: true,
      }).kind
    ).toBe('hint');
  });

  it('dims every other slot after the reveal', () => {
    expect(
      describeTimelineSlot({ ...base, index: 3, isRevealed: true }).kind
    ).toBe('dimmed');
  });

  it('carries the year that follows the slot', () => {
    const slot = describeTimelineSlot({ ...base, yearAfter: 1985 });
    expect(slot.yearAfter).toBe(1985);
    expect(slot.index).toBe(1);
  });
});

describe('the outcome of a revealed answer', () => {
  it('leaves the timeline alone when the answer was wrong', () => {
    expect(resolveTimelineOutcome(false, { year: 1985 })).toEqual({
      kind: 'wrong',
    });
  });

  it('leaves the timeline alone when the base named no year', () => {
    expect(resolveTimelineOutcome(true, {})).toEqual({ kind: 'no-year' });
  });

  it('adds a new year to the timeline', () => {
    expect(resolveTimelineOutcome(true, { year: 1985 })).toEqual({
      kind: 'add-year',
      year: 1985,
    });
  });

  it('adds and removes a duplicate year', () => {
    expect(
      resolveTimelineOutcome(true, { year: 1985, isDuplicate: true })
    ).toEqual({ kind: 'duplicate', year: 1985 });
  });

  it('offers the removal of a year when the base allows it', () => {
    expect(
      resolveTimelineOutcome(true, { year: 1985, removalOffered: true })
    ).toEqual({ kind: 'removal-offered', year: 1985 });
  });

  it('prefers the duplicate over the removal', () => {
    expect(
      resolveTimelineOutcome(true, {
        year: 1985,
        isDuplicate: true,
        removalOffered: true,
      })
    ).toEqual({ kind: 'duplicate', year: 1985 });
  });
});

describe('the time the answer took', () => {
  it('counts the seconds of the answer', () => {
    expect(timelineAnswerSeconds(4_200)).toBe(4);
    expect(timelineAnswerSeconds(4_600)).toBe(5);
  });

  it('counts at least one second', () => {
    expect(timelineAnswerSeconds(0)).toBe(1);
    expect(timelineAnswerSeconds(-100)).toBe(1);
  });
});

describe('the keyboard of the timeline', () => {
  it('selects the slot of a number key', () => {
    expect(slotFromNumberKey('1', 4)).toBe(0);
    expect(slotFromNumberKey('4', 4)).toBe(3);
  });

  it('ignores a number key outside of the timeline', () => {
    expect(slotFromNumberKey('0', 4)).toBeNull();
    expect(slotFromNumberKey('5', 4)).toBeNull();
    expect(slotFromNumberKey('a', 4)).toBeNull();
  });

  it('moves up and down through the timeline', () => {
    expect(nextTimelineSlot(1, 4, 'up')).toBe(0);
    expect(nextTimelineSlot(1, 4, 'down')).toBe(2);
  });

  it('wraps around at the ends of the timeline', () => {
    expect(nextTimelineSlot(0, 4, 'up')).toBe(3);
    expect(nextTimelineSlot(3, 4, 'down')).toBe(0);
  });

  it('starts at the first slot when nothing is selected', () => {
    expect(nextTimelineSlot(null, 4, 'down')).toBe(0);
    expect(nextTimelineSlot(null, 4, 'up')).toBe(3);
  });
});

describe('the points of the timeline', () => {
  it('names the penalty of every cheat of the mode', () => {
    expect(TIMELINE_CHEAT_PENALTIES['timeline-decade-hint']).toBe(
      CHEAT_PENALTY_TIMELINE_DECADE
    );
    expect(TIMELINE_CHEAT_PENALTIES['timeline-joker']).toBe(
      CHEAT_PENALTY_TIMELINE_JOKER
    );
  });

  it('shows the whole budget when no cheat was paid for', () => {
    expect(timelinePointBudget(5)).toBe(5);
  });

  it('takes the paid cheats off the budget', () => {
    expect(
      timelinePointBudget(5, [CHEAT_PENALTY_TIMELINE_DECADE])
    ).toBe(3);
    expect(
      timelinePointBudget(5, [
        CHEAT_PENALTY_TIMELINE_DECADE,
        CHEAT_PENALTY_TIMELINE_JOKER,
      ])
    ).toBe(2);
  });

  it('never goes below zero', () => {
    expect(timelinePointBudget(1, [CHEAT_PENALTY_TIMELINE_DECADE])).toBe(0);
    expect(
      timelinePointBudget(1, [
        CHEAT_PENALTY_TIMELINE_DECADE,
        CHEAT_PENALTY_TIMELINE_JOKER,
      ])
    ).toBe(0);
  });
});
