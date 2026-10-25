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

  throw new Error(`${filePath} is not readable: ${String(lastError)}`);
}

/** Minimal valid song, used as base for the limit tests. */
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
    lyrics: {
      real: ['Line one', 'Line two', 'Line three'],
      fake: 'Invented line',
    },
    isOneHitWonder: false,
    links: { youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    supportedModes: ['timeline'],
    isQRCompatible: true,
    ...overrides,
  };
}

describe('collectSongLimitViolations', () => {
  it('reports no violation for a normal song', () => {
    expect(collectSongLimitViolations(makeSong())).toEqual([]);
  });

  it('reports a field that is too long', () => {
    const violations = collectSongLimitViolations(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title + 1) })
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].field).toBe('title');
  });

  it('reports an id that is too long', () => {
    const violations = collectSongLimitViolations(
      makeSong({ id: 'x'.repeat(SONG_FIELD_LIMITS.id + 1) })
    );

    expect(violations.map((violation) => violation.field)).toContain('id');
  });

  it('reports too many entries in an array', () => {
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

  it('reports an array entry that is too long', () => {
    const violations = collectSongLimitViolations(
      makeSong({ mood: ['x'.repeat(SONG_FIELD_LIMITS.moodEntry + 1)] })
    );

    expect(violations.map((violation) => violation.field)).toContain('mood[0]');
  });

  it('reports a hint that is too long', () => {
    const hints = [
      'x'.repeat(SONG_FIELD_LIMITS.hint + 1),
      'Second hint.',
      'Third hint.',
      'Fourth hint.',
      'Fifth hint.',
    ];
    const violations = collectSongLimitViolations(makeSong({ hints }));

    expect(violations.map((violation) => violation.field)).toContain(
      'hints[0]'
    );
  });

  it('reports an unknown game mode', () => {
    const violations = collectSongLimitViolations(
      makeSong({ supportedModes: ['timeline', 'money-machine'] })
    );

    expect(violations.map((violation) => violation.field)).toContain(
      'supportedModes[1]'
    );
  });

  it('knows every mode the catalog uses', () => {
    expect(KNOWN_SUPPORTED_MODES).toContain('timeline');
    expect(KNOWN_SUPPORTED_MODES).toContain('hint-master');
    expect(KNOWN_SUPPORTED_MODES).toContain('lyrics');
    expect(KNOWN_SUPPORTED_MODES).toContain('vibe-check');
    expect(KNOWN_SUPPORTED_MODES).toContain('cover-confusion');
    expect(KNOWN_SUPPORTED_MODES).toContain('survivor');
  });

  it('reports a link that is too long', () => {
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

  it('reports a lyric line that is too long', () => {
    const violations = collectSongLimitViolations(
      makeSong({
        lyrics: {
          real: [
            'x'.repeat(SONG_FIELD_LIMITS.lyricLine + 1),
            'Zeile zwei',
            'Zeile drei',
          ],
          fake: 'Invented line',
        },
      })
    );

    expect(violations.map((violation) => violation.field)).toContain(
      'lyrics.real[0]'
    );
  });
});

describe('validateSong with hard limits', () => {
  it('reports a violation as an error, not as a warning', () => {
    const result = validateSong(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title + 1) })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.map((error) => error.field)).toContain('title');
    expect(result.warnings.map((warning) => warning.field)).not.toContain(
      'title'
    );
  });

  it('accepts a song that is exactly at the limit', () => {
    const result = validateSong(
      makeSong({ title: 'x'.repeat(SONG_FIELD_LIMITS.title) })
    );

    expect(result.errors.map((error) => error.field)).not.toContain('title');
  });

  it('keeps the current catalog valid', async () => {
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
