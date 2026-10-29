/**
 * The timeline of the round.
 *
 * WHAT: the years the timeline starts with and the two places that hold
 * them — the shell draws the timeline, the core evaluates the answer
 * against it.
 *
 * WHY there are two timelines: the shell owns the picture, the core owns
 * the rule. The slots of the Timeline mode are the slots of the core — the
 * shell only shows them. If the two timelines differ, the core refuses the
 * answer (`errors.invalidAnswer`), the answer never arrives, and the
 * solution cannot be released afterwards (`errors.answersNotLocked`).
 *
 * WHY the shell picks the years: the years come from the catalogue, and
 * the catalogue lives in the core. The shell asks for the scale and hands
 * the three years to the core, which owns the rule of the timeline.
 *
 * WHY the years are handed over before the card is drawn: the core builds
 * the question of the round — including the slots and the possible points —
 * from the timeline it knows. A timeline that is handed over afterwards
 * would leave the round with the points of an empty timeline.
 *
 * EXAMPLE: three years on the timeline → four slots.
 */

/** The number of years the timeline starts with (GAME-017). */
export const TIMELINE_INITIAL_YEAR_COUNT = 3;

/**
 * The years the timeline starts with.
 *
 * WHY the shell picks them: the years come from the catalogue, and the
 * catalogue lives in the core. The shell asks for the scale and hands the
 * three years to the core, which owns the rule of the timeline.
 *
 * @param scale - The years of the catalogue.
 * @param count - The number of years the timeline starts with.
 * @param random - The source of the randomness, for the tests.
 * @returns The chosen years, in ascending order.
 */
export function randomInitialYears(
  scale: readonly number[],
  count: number,
  random: () => number = Math.random
): number[] {
  const shuffled = [...scale].sort(() => random() - 0.5);
  return shuffled.slice(0, count).sort((a, b) => a - b);
}

/**
 * The years the timeline of a round starts with.
 *
 * WHY this is the only place that knows the number: the core demands
 * exactly three distinct years (`init_timeline`), the shell draws them from
 * the scale of the catalogue.
 *
 * @param scale - The years of the catalogue.
 * @param random - The source of the randomness, for the tests.
 * @returns The three years, in ascending order.
 */
export function initialTimelineYears(
  scale: readonly number[],
  random: () => number = Math.random
): number[] {
  return randomInitialYears(scale, TIMELINE_INITIAL_YEAR_COUNT, random);
}
