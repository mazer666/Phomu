/**
 * The pure logic of the Timeline mode.
 *
 * WHAT: the slot arithmetic, the correctness of a placement, the outcome of
 * a revealed answer, the answer time and the keyboard navigation — as
 * functions without a component, without a store and without a side effect.
 *
 * WHY: the Timeline mode carries the hardest state of the shell. The years
 * grow with every correct answer, the joker may take a slot away, a
 * duplicate year has to disappear again and the player may offer the removal
 * of a year. All of that was inline in the component, where it could only be
 * reached through a DOM. Here it is a function, and the component draws what
 * these functions decide.
 *
 * EXAMPLE: `describeTimelineSlot` decides whether a slot is drawn as the
 * placement of the player, as the joker slot or as the hint of the correct
 * slot. The component maps the answer to a class name.
 */

import type { AnswerDetail } from '@/core/types';
import {
  CHEAT_PENALTY_TIMELINE_DECADE,
  CHEAT_PENALTY_TIMELINE_JOKER,
} from '@/utils/mode-rules';

/**
 * The years the timeline starts with.
 *
 * WHY they live in `@/core/timeline`: the shell hands the years to the core
 * before the card is drawn — the core builds the slots and the possible
 * points of the round from the timeline it knows. The mode and the hook
 * therefore need the same rule.
 */
export { TIMELINE_INITIAL_YEAR_COUNT, randomInitialYears } from '@/core/timeline';

/** The penalty of every cheat the Timeline mode offers. */
export const TIMELINE_CHEAT_PENALTIES = {
  'timeline-decade-hint': CHEAT_PENALTY_TIMELINE_DECADE,
  'timeline-joker': CHEAT_PENALTY_TIMELINE_JOKER,
} as const;

/**
 * The number of slots the timeline has: one more than the number of years.
 *
 * EXAMPLE: three years on the timeline → four slots.
 */
export function timelineSlotCount(yearCount: number): number {
  return yearCount + 1;
}

/**
 * Whether the placement of the player was correct.
 *
 * @param selectedSlot - The slot the player placed the song in.
 * @param validSlots - The slots the base accepts.
 */
export function isTimelineSlotCorrect(
  selectedSlot: number | null,
  validSlots: ReadonlySet<number>
): boolean {
  return selectedSlot !== null && validSlots.has(selectedSlot);
}

/**
 * The kind of a slot — how the timeline draws it.
 *
 * - `joker`:   the joker took the slot away, it is crossed out
 * - `open`:    a free slot before the reveal
 * - `placed`:  the player placed the song here
 * - `correct`: the placement was right
 * - `wrong`:   the placement was wrong
 * - `hint`:    the canonical slot of a wrong answer
 * - `dimmed`:  every other slot after the reveal
 */
export type TimelineSlotKind =
  | 'joker'
  | 'open'
  | 'placed'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'dimmed';

/** The state of one slot of the timeline. */
export interface TimelineSlot {
  /** How the slot is drawn. */
  readonly kind: TimelineSlotKind;
  /** The index of the slot. */
  readonly index: number;
  /** The year that follows the slot, if the slot has one. */
  readonly yearAfter?: number;
}

/** Everything the state of a slot depends on. */
export interface TimelineSlotParams {
  /** The index of the slot. */
  readonly index: number;
  /** The slot the player placed the song in. */
  readonly selectedSlot: number | null;
  /** The slot the joker took away. */
  readonly jokerSlot: number | null;
  /** The slot the base named as the correct one. */
  readonly correctSlot: number | null;
  /** Whether the placement of the player was correct. */
  readonly isAnswerCorrect: boolean;
  /** Whether the round was revealed. */
  readonly isRevealed: boolean;
  /** The year that follows the slot, if the slot has one. */
  readonly yearAfter?: number;
}

/**
 * The state of one slot of the timeline.
 *
 * WHY the order of the cases: the joker wins over everything — a slot the
 * joker took away is crossed out even after the reveal. Before the reveal
 * there is only the placement of the player. After the reveal the placement
 * is green or red, and the canonical slot of a wrong answer gets the hint.
 */
export function describeTimelineSlot(
  params: TimelineSlotParams
): TimelineSlot {
  const {
    index,
    selectedSlot,
    jokerSlot,
    correctSlot,
    isAnswerCorrect,
    isRevealed,
    yearAfter,
  } = params;

  if (jokerSlot === index && !isRevealed) {
    return { kind: 'joker', index, yearAfter };
  }

  const isTarget = selectedSlot === index;

  if (!isRevealed) {
    return { kind: isTarget ? 'placed' : 'open', index, yearAfter };
  }

  if (isTarget) {
    return { kind: isAnswerCorrect ? 'correct' : 'wrong', index, yearAfter };
  }

  if (index === correctSlot && !isAnswerCorrect) {
    return { kind: 'hint', index, yearAfter };
  }

  return { kind: 'dimmed', index, yearAfter };
}

/**
 * What the shell does with the timeline after a revealed answer.
 *
 * - `wrong`:            the answer was wrong, the timeline stays as it is
 * - `no-year`:          the base named no year, the timeline stays as it is
 * - `add-year`:         the year is new, it joins the timeline
 * - `duplicate`:        the year is already there, it is added and removed
 * - `removal-offered`:  the year is new and the player may remove one
 */
export type TimelineOutcome =
  | { readonly kind: 'wrong' }
  | { readonly kind: 'no-year' }
  | { readonly kind: 'add-year'; readonly year: number }
  | { readonly kind: 'duplicate'; readonly year: number }
  | { readonly kind: 'removal-offered'; readonly year: number };

/**
 * What the shell does with the timeline after a revealed answer.
 *
 * WHY the base decides: the base knows whether the year is already on the
 * timeline and whether the player may remove one. The shell only carries
 * the decision out.
 *
 * @param isCorrect - Whether the answer of the player was right.
 * @param detail - The detail of the feedback of the base.
 */
export function resolveTimelineOutcome(
  isCorrect: boolean,
  detail: AnswerDetail
): TimelineOutcome {
  if (!isCorrect) return { kind: 'wrong' };

  const year = detail.year;
  if (year === undefined) return { kind: 'no-year' };

  if (detail.isDuplicate) return { kind: 'duplicate', year };
  if (detail.removalOffered) return { kind: 'removal-offered', year };

  return { kind: 'add-year', year };
}

/**
 * The seconds the answer took, as the base counts them.
 *
 * WHY at least one second: an answer that takes no time is an answer of the
 * last millisecond, and the base would treat it as no answer at all.
 *
 * @param elapsedMs - The milliseconds since the question was asked.
 */
export function timelineAnswerSeconds(elapsedMs: number): number {
  return Math.max(1, Math.round(elapsedMs / 1000));
}

/**
 * The slot a number key selects.
 *
 * @param key - The key of the keyboard event.
 * @param slotCount - The number of slots of the timeline.
 * @returns The index of the slot, or `null` when the key selects none.
 */
export function slotFromNumberKey(
  key: string,
  slotCount: number
): number | null {
  const number = Number.parseInt(key, 10);
  if (Number.isNaN(number)) return null;
  if (number < 1 || number > slotCount) return null;
  return number - 1;
}

/**
 * The slot the arrow keys move to.
 *
 * WHY the round trip: the timeline is a list, and moving up from the first
 * slot leads to the last one — the player never leaves the timeline.
 *
 * @param current - The slot that is selected, or `null` when there is none.
 * @param slotCount - The number of slots of the timeline.
 * @param direction - The direction of the movement.
 */
export function nextTimelineSlot(
  current: number | null,
  slotCount: number,
  direction: 'up' | 'down'
): number | null {
  if (slotCount <= 0) return current;
  if (direction === 'up') {
    return current === null || current === 0 ? slotCount - 1 : current - 1;
  }
  return current === null || current === slotCount - 1 ? 0 : current + 1;
}

/**
 * The points the round is worth, after the cheats the player paid for.
 *
 * WHY the penalties are negative: the constants of `mode-rules` are the
 * delta that goes onto the score of the player. The budget adds them up.
 *
 * EXAMPLE: five points and a decade hint (-2) → three points.
 *
 * @param pointsPossible - The points the base named for the round.
 * @param paidPenalties - The penalties the player already paid for.
 */
export function timelinePointBudget(
  pointsPossible: number,
  paidPenalties: readonly number[] = []
): number {
  const paid = paidPenalties.reduce((sum, penalty) => sum + penalty, 0);
  return Math.max(0, pointsPossible + paid);
}
