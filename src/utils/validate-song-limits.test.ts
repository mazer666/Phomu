/**
 * Tests for the hard field limits of the song validator
 * (src/utils/validate-song-limits.ts).
 *
 * A limit violation must be an *error*, not a warning - the validator must
 * not fail open. The second part of the test proves that the current
 * catalog stays valid with the limits in place.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { validateSong } from './validate-song-data';
import {
  KNOWN_SUPPORTED_MODES,
  SONG_FIELD_LIMITS,
  collectSongLimitViolations,
} from './validate-song-limits';

/**
 * Reads a file and waits until it is parsable. Other agents work on the
 * catalog in parallel; a file that is written at this moment must not make
 * this test flaky.
 */
async function readStable(filePath: string, attempts = 5): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      JSON.parse(raw);
      return raw;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error(`${filePath} ist nicht lesbar: ${String(lastError)}`);
}

/** Minimal valid song, used as base for the limit tests. */
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
    lyrics: {
      real: ['Zeile eins', 'Zeile zwei', 'Zeile drei'],
      fake: 'Erfundene Zeile',
    },
    isOneHitWonder: false,
    links: { youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    supportedModes: ['timeline'],
    isQRCompatible: true,
    ...overrides,
  };
}

describe('collectSongLimitViolations', () => {
  it('meldet fuer einen normalen Song keine Verletzung', () => {
    expect(collectSongLimitViolations(makeSong())).toEqual([]);
  });

  it('meldet ein zu langes Feld', () => {
    const violations = collectSongLimitViolations(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title + 1) })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].field).toBe('title');
  });

  it('meldet eine zu lange id', () => {
    const violations = collectSongLimitViolations(
      makeSong({ id: 'x'.repeat(SONG_FIELD_LIMITS.id + 1) })
    );

    expect(violations.map((violation) => violation.field)).toContain('id');
  });

  it('meldet zu viele Eintraege in einem Array', () => {
    const violations = collectSongLimitViolations(
      makeSong({
        mood: Array.from(
          { length: SONG_FIELD_LIMITS.moodEntries + 1 },
          () => 'Pop'
        ),
      })
    );

    expect(violations.map((violation) => violation.field)).toContain('mood');
  });

  it('meldet einen zu langen Array-Eintrag', () => {
    const violations = collectSongLimitViolations(
      makeSong({ mood: ['x'.repeat(SONG_FIELD_LIMITS.moodEntry + 1)] })
    );

    expect(violations.map((violation) => violation.field)).toContain('mood[0]');
  });

  it('meldet einen zu langen Hinweis', () => {
    const hints = [
      'x'.repeat(SONG_FIELD_LIMITS.hint + 1),
      'Zweiter Hinweis.',
      'Dritter Hinweis.',
      'Vierter Hinweis.',
      'Fünfter Hinweis.',
    ];
    const violations = collectSongLimitViolations(makeSong({ hints }));

    expect(violations.map((violation) => violation.field)).toContain(
      'hints[0]'
    );
  });

  it('meldet einen unbekannten Spielmodus', () => {
    const violations = collectSongLimitViolations(
      makeSong({ supportedModes: ['timeline', 'geld-automat'] })
    );

    expect(violations.map((violation) => violation.field)).toContain(
      'supportedModes[1]'
    );
  });

  it('kennt jeden Modus, den der Katalog verwendet', () => {
    expect(KNOWN_SUPPORTED_MODES).toContain('timeline');
    expect(KNOWN_SUPPORTED_MODES).toContain('hint-master');
    expect(KNOWN_SUPPORTED_MODES).toContain('lyrics');
    expect(KNOWN_SUPPORTED_MODES).toContain('vibe-check');
    expect(KNOWN_SUPPORTED_MODES).toContain('cover-confusion');
    expect(KNOWN_SUPPORTED_MODES).toContain('survivor');
  });

  it('meldet einen zu langen Link', () => {
    const violations = collectSongLimitViolations(
      makeSong({
        links: {
          youtube: `https://www.youtube.com/watch?v=${'x'.repeat(SONG_FIELD_LIMITS.link)}`,
        },
      })
    );

    expect(violations.map((violation) => violation.field)).toContain(
      'links.youtube'
    );
  });

  it('meldet eine zu lange Liedzeile', () => {
    const violations = collectSongLimitViolations(
      makeSong({
        lyrics: {
          real: [
            'x'.repeat(SONG_FIELD_LIMITS.lyricLine + 1),
            'Zeile zwei',
            'Zeile drei',
          ],
          fake: 'Erfundene Zeile',
        },
      })
    );

    expect(violations.map((violation) => violation.field)).toContain(
      'lyrics.real[0]'
    );
  });
});

describe('validateSong mit harten Grenzwerten', () => {
  it('meldet eine Verletzung als Fehler, nicht als Warnung', () => {
    const result = validateSong(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title + 1) })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain('title');
    expect(result.warnings.map((warning) => warning.field)).not.toContain(
      'title'
    );
  });

  it('akzeptiert einen Song, der genau an der Grenze liegt', () => {
    const result = validateSong(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title) })
    );

    expect(result.errors.map((error) => error.field)).not.toContain('title');
  });

  it('laesst den aktuellen Katalog gueltig', async () => {
    const packsDir = path.join(process.cwd(), 'src/data/songs');
    const files = readdirSync(packsDir).filter((file) =>
      file.endsWith('.json')
    );

    let checked = 0;
    for (const file of files) {
      const raw = JSON.parse(await readStable(path.join(packsDir, file))) as {
        songs?: unknown[];
      };
      for (const song of raw.songs ?? []) {
        const violations = collectSongLimitViolations(
          song as Record<string, unknown>
        );
        expect(
          violations,
          `${file}: ${violations.map((violation) => `${violation.field} (${violation.message})`).join(', ')}`
        ).toEqual([]);
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(1000);
  });
});
