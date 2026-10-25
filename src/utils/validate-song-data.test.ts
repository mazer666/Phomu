/**
 * Tests für die Jahres-Validierung im Song-Katalog.
 *
 * Wichtig: Der Katalog enthält auch klassische Werke (Vivaldi, Bach,
 * Mozart ...), deren Kompositionsjahre vor 1900 liegen. Diese müssen
 * gültig sein – siehe src/config/song-year-range.ts.
 */
import { describe, it, expect } from 'vitest';
import { validateSong } from './validate-song-data';
import { MIN_SONG_YEAR, MAX_SONG_YEAR_OFFSET, isValidSongYear } from '../config/song-year-range';

/** Baut einen minimalen, ansonsten gültigen Song-Eintrag. */
function makeSong(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-song',
    title: 'Testtitel',
    artist: 'Testartist',
    year: 1985,
    country: 'DE',
    genre: 'Pop',
    difficulty: 'medium',
    mood: ['Pop'],
    packs: ['Global Hits 1950-2026'],
    hints: [
      'Erster Hinweis ohne Spoiler-Token.',
      'Zweiter Hinweis ohne Spoiler-Token.',
      'Dritter Hinweis ohne Spoiler-Token.',
      'Vierter Hinweis ohne Spoiler-Token.',
      'Fünfter Hinweis ohne Spoiler-Token.',
    ],
    lyrics: { real: ['Zeile eins', 'Zeile zwei', 'Zeile drei'], fake: 'Erfundene Zeile' },
    isOneHitWonder: false,
    links: { youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    supportedModes: ['timeline'],
    isQRCompatible: true,
    ...overrides,
  };
}

describe('Jahres-Validierung', () => {
  it('akzeptiert ein modernes Release-Jahr', () => {
    const result = validateSong(makeSong({ year: 1985 }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('akzeptiert klassische Kompositionsjahre vor 1900', () => {
    // Vivaldi: "Die Vier Jahreszeiten" (1725), Bach: Toccata und Fuge (1704)
    for (const year of [1725, 1704, 1832, 1867, 1899]) {
      const result = validateSong(makeSong({ year }));
      expect(
        result.errors.filter((e) => e.field === 'year'),
        `Jahr ${year} sollte gültig sein`
      ).toHaveLength(0);
    }
  });

  it('akzeptiert die Untergrenze', () => {
    const result = validateSong(makeSong({ year: MIN_SONG_YEAR }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('lehnt unrealistisch frühe Jahre ab', () => {
    const result = validateSong(makeSong({ year: MIN_SONG_YEAR - 1 }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('lehnt Zukunftsjahre jenseits +1 ab', () => {
    const currentYear = new Date().getFullYear();
    const result = validateSong(makeSong({ year: currentYear + 2 + MAX_SONG_YEAR_OFFSET }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('lehnt angekündigte Releases (+1) nicht ab', () => {
    const currentYear = new Date().getFullYear();
    const result = validateSong(makeSong({ year: currentYear + 1 }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('lehnt Nicht-Ganzzahlen ab', () => {
    const result = validateSong(makeSong({ year: 1985.5 }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('isValidSongYear spiegelt dieselbe Logik', () => {
    const currentYear = new Date().getFullYear();
    expect(isValidSongYear(1725)).toBe(true);
    expect(isValidSongYear(MIN_SONG_YEAR - 1)).toBe(false);
    expect(isValidSongYear(currentYear + 1)).toBe(true);
    expect(isValidSongYear(currentYear + 2)).toBe(false);
  });
});
