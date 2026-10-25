/**
 * Tests for the year validation in the song catalog.
 *
 * Important: the catalog also contains classical works (Vivaldi, Bach,
 * Mozart ...) whose composition years lie before 1900. These must be
 * valid – see src/config/song-year-range.ts.
 */
import { describe, it, expect } from 'vitest';
import { validateSong } from './validate-song-data';
import { MIN_SONG_YEAR, MAX_SONG_YEAR_OFFSET, isValidSongYear } from '../config/song-year-range';

/** Builds a minimal but otherwise valid song entry. */
function makeSong(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-song',
    title: 'Test Title',
    artist: 'Test Artist',
    year: 1985,
    country: 'DE',
    genre: 'Pop',
    difficulty: 'medium',
    mood: ['Pop'],
    packs: ['Global Hits 1950-2026'],
    hints: [
      'First hint without a spoiler token.',
      'Second hint without a spoiler token.',
      'Third hint without a spoiler token.',
      'Fourth hint without a spoiler token.',
      'Fifth hint without a spoiler token.',
    ],
    lyrics: { real: ['Line one', 'Line two', 'Line three'], fake: 'Invented line' },
    isOneHitWonder: false,
    links: { youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    supportedModes: ['timeline'],
    isQRCompatible: true,
    ...overrides,
  };
}

describe('Year validation', () => {
  it('accepts a modern release year', () => {
    const result = validateSong(makeSong({ year: 1985 }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('accepts classical composition years before 1900', () => {
    // Vivaldi: "The Four Seasons" ("Die Vier Jahreszeiten", 1725), Bach: Toccata and Fugue in D minor (1704)
    for (const year of [1725, 1704, 1832, 1867, 1899]) {
      const result = validateSong(makeSong({ year }));
      expect(
        result.errors.filter((e) => e.field === 'year'),
        `Year ${year} should be valid`
      ).toHaveLength(0);
    }
  });

  it('accepts the lower bound', () => {
    const result = validateSong(makeSong({ year: MIN_SONG_YEAR }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('rejects unrealistically early years', () => {
    const result = validateSong(makeSong({ year: MIN_SONG_YEAR - 1 }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('rejects future years beyond +1', () => {
    const currentYear = new Date().getFullYear();
    const result = validateSong(makeSong({ year: currentYear + 2 + MAX_SONG_YEAR_OFFSET }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('does not reject announced releases (+1)', () => {
    const currentYear = new Date().getFullYear();
    const result = validateSong(makeSong({ year: currentYear + 1 }));
    expect(result.errors.filter((e) => e.field === 'year')).toHaveLength(0);
  });

  it('rejects non-integers', () => {
    const result = validateSong(makeSong({ year: 1985.5 }));
    expect(result.errors.filter((e) => e.field === 'year').length).toBeGreaterThan(0);
  });

  it('isValidSongYear mirrors the same logic', () => {
    const currentYear = new Date().getFullYear();
    expect(isValidSongYear(1725)).toBe(true);
    expect(isValidSongYear(MIN_SONG_YEAR - 1)).toBe(false);
    expect(isValidSongYear(currentYear + 1)).toBe(true);
    expect(isValidSongYear(currentYear + 2)).toBe(false);
  });
});
