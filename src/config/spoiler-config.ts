/**
 * Spoiler-Konfiguration (Katalog für Zensur-Ausnahmen)
 * 
 * Enthält Künstlernamen, die kürzer als 4 Zeichen sind, aber 
 * dennoch zensiert werden sollen, falls sie in einem Hint auftauchen.
 */

export const SPOILER_CONFIG = {
  /** 
   * Mindestlänge für automatische Zensur (Standard: 4).
   * Alles was kürzer ist, wird ignoriert, außer es steht in der EXCEPTIONS-Liste.
   */
  MIN_LENGTH: 4,

  /**
   * Katalog bekannter Artists mit kurzen Namen (< 4 Buchstaben).
   * Diese werden IMMER zensiert, wenn sie der gesuchte Artist sind.
   */
  EXCEPTIONS: [
    'BTS', 'TLC', 'U2', 'REM', 'R.E.M.', 'SIA', 'DMX', 'HIM', 'JLS', 'ELO', 'YES', 'AIR', 'ABC', '112', 'JAY', 'ZAY', 'NWA', 'N.W.A.', 'NAS', 'E17',
    '311', 'LFO', 'KRS', 'GZA', 'RZA', 'MIA', 'M.I.A.', 'GNR', 'G\'N\'R', 'NEO', 'BVB', 'STS', 'DÖF', 'DAF', 'Fettes Brot', 'Die Ärzte', '2Pac', '50 Cent'
  ],

  /** Wörter, die NICHT zensiert werden sollen (White-List) selbst wenn sie Teil des Titels sind */
  IGNORE_WORDS: [
    'THE', 'AND', 'WITH', 'FROM', 'FEAT', 'THAT', 'THIS', 'YOUR', 'MINE', 'SOME',
    'DER', 'DIE', 'DAS', 'UND', 'MIT', 'VON', 'FÜR', 'EINE', 'EINER', 'EINES'
  ]
};
