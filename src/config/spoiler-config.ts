/**
 * Spoiler configuration (catalog of censor exceptions)
 *
 * Contains artist names that are shorter than 4 characters but should
 * still be censored when they appear in a hint.
 */

export const SPOILER_CONFIG = {
  /**
   * Minimum length for automatic censoring (default: 4).
   * Anything shorter is ignored unless it is listed in EXCEPTIONS.
   */
  MIN_LENGTH: 4,

  /**
   * Catalog of well-known artists with short names (< 4 letters).
   * These are ALWAYS censored when they are the artist being guessed.
   */
  EXCEPTIONS: [
    'BTS', 'TLC', 'U2', 'REM', 'R.E.M.', 'SIA', 'DMX', 'HIM', 'JLS', 'ELO', 'YES', 'AIR', 'ABC', '112', 'JAY', 'ZAY', 'NWA', 'N.W.A.', 'NAS', 'E17',
    '311', 'LFO', 'KRS', 'GZA', 'RZA', 'MIA', 'M.I.A.', 'GNR', 'G\'N\'R', 'NEO', 'BVB', 'STS', 'DÖF', 'DAF', 'Fettes Brot', 'Die Ärzte', '2Pac', '50 Cent'
  ],

  /** Words that should NOT be censored (allow list), even if they are part of the title */
  IGNORE_WORDS: [
    'THE', 'AND', 'WITH', 'FROM', 'FEAT', 'THAT', 'THIS', 'YOUR', 'MINE', 'SOME',
    'DER', 'DIE', 'DAS', 'UND', 'MIT', 'VON', 'FÜR', 'EINE', 'EINER', 'EINES'
  ]
};
