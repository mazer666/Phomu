/**
 * Valid year range for song entries in the Phomu catalog.
 *
 * Background: besides pop/rock songs, Phomu also contains classical
 * works (Vivaldi, Bach, Mozart, Chopin ...). Their composition and
 * release years lie partly far before 1900. A lower bound of 1900 would
 * mark factually correct year values as validator errors – or one would
 * have to falsify the data (e.g. enter the year of a new recording
 * instead of the year of the work).
 *
 * Therefore the range starts at 1500: that covers the entire period in
 * which Western sheet music publications emerged, and still reliably
 * rejects nonsense (e.g. year: 1200 or year: 300).
 *
 * Upper bound: current year + 1 (so announced releases are allowed).
 */

/** Earliest permissible year (classical works before 1900) */
export const MIN_SONG_YEAR = 1500;

/** Additional years above the current year that are allowed (announced releases) */
export const MAX_SONG_YEAR_OFFSET = 1;

/** Computes the currently valid upper bound */
export function getMaxSongYear(currentYear: number = new Date().getFullYear()): number {
  return currentYear + MAX_SONG_YEAR_OFFSET;
}

/** Checks whether a year lies in the valid range */
export function isValidSongYear(year: number, currentYear: number = new Date().getFullYear()): boolean {
  return Number.isInteger(year) && year >= MIN_SONG_YEAR && year <= getMaxSongYear(currentYear);
}
