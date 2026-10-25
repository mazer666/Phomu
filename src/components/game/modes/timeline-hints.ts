/**
 * The decade hints of the Timeline mode.
 *
 * WHAT: the i18n keys of the hints of every decade, and the rule that picks
 * one of them.
 *
 * WHY a module of its own: the table of the keys is data, and it is the
 * longest part of the logic of the mode. Keeping it apart leaves the logic
 * of the slots short enough to be read at a glance.
 *
 * WHY the keys and not the texts: the texts live in the locale files, and
 * the pure layer must not depend on the language of the session.
 */

/** The i18n key of the hint of a decade that has no pool of its own. */
export const DECADE_HINT_FALLBACK_KEY = 'modes.timeline.decadeHints.fallback';

/**
 * The i18n keys of the hints of every decade.
 *
 * WHY one key per variant: the table gives the players a different hint
 * every time, so a decade with a single variant would repeat itself.
 */
const DECADE_HINT_KEYS = {
  1950: [
    'modes.timeline.decadeHints.1950.first',
    'modes.timeline.decadeHints.1950.second',
    'modes.timeline.decadeHints.1950.third',
    'modes.timeline.decadeHints.1950.fourth',
  ],
  1960: [
    'modes.timeline.decadeHints.1960.first',
    'modes.timeline.decadeHints.1960.second',
    'modes.timeline.decadeHints.1960.third',
    'modes.timeline.decadeHints.1960.fourth',
  ],
  1970: [
    'modes.timeline.decadeHints.1970.first',
    'modes.timeline.decadeHints.1970.second',
    'modes.timeline.decadeHints.1970.third',
    'modes.timeline.decadeHints.1970.fourth',
  ],
  1980: [
    'modes.timeline.decadeHints.1980.first',
    'modes.timeline.decadeHints.1980.second',
    'modes.timeline.decadeHints.1980.third',
    'modes.timeline.decadeHints.1980.fourth',
    'modes.timeline.decadeHints.1980.fifth',
  ],
  1990: [
    'modes.timeline.decadeHints.1990.first',
    'modes.timeline.decadeHints.1990.second',
    'modes.timeline.decadeHints.1990.third',
    'modes.timeline.decadeHints.1990.fourth',
    'modes.timeline.decadeHints.1990.fifth',
  ],
  2000: [
    'modes.timeline.decadeHints.2000.first',
    'modes.timeline.decadeHints.2000.second',
    'modes.timeline.decadeHints.2000.third',
    'modes.timeline.decadeHints.2000.fourth',
    'modes.timeline.decadeHints.2000.fifth',
  ],
  2010: [
    'modes.timeline.decadeHints.2010.first',
    'modes.timeline.decadeHints.2010.second',
    'modes.timeline.decadeHints.2010.third',
    'modes.timeline.decadeHints.2010.fourth',
    'modes.timeline.decadeHints.2010.fifth',
  ],
  2020: [
    'modes.timeline.decadeHints.2020.first',
    'modes.timeline.decadeHints.2020.second',
    'modes.timeline.decadeHints.2020.third',
    'modes.timeline.decadeHints.2020.fourth',
  ],
} as const;

/** Every i18n key of the decade hints. */
export type DecadeHintKey =
  (typeof DECADE_HINT_KEYS)[keyof typeof DECADE_HINT_KEYS][number];

/**
 * The decade a year belongs to.
 *
 * EXAMPLE: 1985 → 1980.
 */
export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

/**
 * The keys of the hints of a decade.
 *
 * WHY an empty list and not an error: a song of a year that the catalogue
 * does not cover has no hint of its own, and the caller falls back to the
 * generic hint.
 */
export function decadeHintPool(decade: number): readonly DecadeHintKey[] {
  switch (decade) {
    case 1950:
      return DECADE_HINT_KEYS[1950];
    case 1960:
      return DECADE_HINT_KEYS[1960];
    case 1970:
      return DECADE_HINT_KEYS[1970];
    case 1980:
      return DECADE_HINT_KEYS[1980];
    case 1990:
      return DECADE_HINT_KEYS[1990];
    case 2000:
      return DECADE_HINT_KEYS[2000];
    case 2010:
      return DECADE_HINT_KEYS[2010];
    case 2020:
      return DECADE_HINT_KEYS[2020];
    default:
      return [];
  }
}

/**
 * The key of the hint of a decade.
 *
 * @param year - The year of the song.
 * @param random - The source of the randomness, for the tests.
 * @returns The key of the hint, or the key of the fallback.
 */
export function pickDecadeHintKey(
  year: number,
  random: () => number = Math.random
): DecadeHintKey | typeof DECADE_HINT_FALLBACK_KEY {
  const pool = decadeHintPool(decadeOf(year));
  if (pool.length === 0) return DECADE_HINT_FALLBACK_KEY;
  return pool[Math.floor(random() * pool.length)]!;
}
