/**
 * Gültiger Jahresbereich für Song-Einträge im Phomu-Katalog.
 *
 * Hintergrund: Phomu enthält neben Pop-/Rock-Songs auch klassische
 * Werke (Vivaldi, Bach, Mozart, Chopin ...). Deren Kompositions- bzw.
 * Veröffentlichungsjahre liegen teils weit vor 1900. Eine Untergrenze
 * von 1900 würde factual korrekte Jahresangaben als Validator-Fehler
 * markieren – oder man müsste die Daten verfälschen (z. B. das Jahr
 * einer Neuaufnahme statt das des Werks eintragen).
 *
 * Deshalb beginnt der Bereich bei 1500: das deckt den kompletten
 * Zeitraum ab, in dem westliche Musiknoten-Publikationen entstanden
 * sind, und hält weiterhin Unsinn (z. B. year: 1200 oder year: 300)
 * zuverlässig aus.
 *
 * Obergrenze: laufendes Jahr + 1 (damit angekündigte Releases
 * erlaubt sind).
 */

/** Frühestes zulässiges Jahr (klassische Werke vor 1900) */
export const MIN_SONG_YEAR = 1500;

/** Zusätzliche Jahre über dem laufenden Jahr, die erlaubt sind (angekündigte Releases) */
export const MAX_SONG_YEAR_OFFSET = 1;

/** Berechnet die aktuell gültige Obergrenze */
export function getMaxSongYear(currentYear: number = new Date().getFullYear()): number {
  return currentYear + MAX_SONG_YEAR_OFFSET;
}

/** Prüft, ob ein Jahr im gültigen Bereich liegt */
export function isValidSongYear(year: number, currentYear: number = new Date().getFullYear()): boolean {
  return Number.isInteger(year) && year >= MIN_SONG_YEAR && year <= getMaxSongYear(currentYear);
}
