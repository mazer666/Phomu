/**
 * Censor hints — the spoiler safety net (QA-SPO-003)
 *
 * WHY: `censorHint` is the last layer that stands between a catalogue hint and
 * the answer. It is a pure function without dependencies, so every rule it
 * applies can be pinned here: which tokens are censored, which are
 * deliberately kept, and in which order overlapping tokens are replaced.
 *
 * The catalogue-wide guard at the bottom of this file runs the invariant over
 * every hint in `src/data/songs/**` and fails as soon as a *new* leak appears.
 * The three known leaks are listed explicitly — they are a measured property
 * of the current implementation, not an accepted risk.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { censorHint } from './censor-utils';
import { SPOILER_CONFIG } from '@/config/spoiler-config';

interface SongLike {
  id: string;
  title: string;
  artist: string;
  hints?: string[];
}

/** Escapes a token for use inside a regular expression. */
function escapeForRegExp(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A token is "censorable" when the implementation claims to censor it: at
 * least `MIN_LENGTH` characters long, or explicitly listed in `EXCEPTIONS`.
 * Stopwords are never censorable — they are kept on purpose.
 */
function isCensorableToken(token: string): boolean {
  const clean = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length === 0) return false;
  if (SPOILER_CONFIG.IGNORE_WORDS.includes(clean)) return false;
  return (
    clean.length >= SPOILER_CONFIG.MIN_LENGTH ||
    SPOILER_CONFIG.EXCEPTIONS.includes(clean)
  );
}

describe('censorHint', () => {
  it('replaces the artist name inside a hint', () => {
    const result = censorHint(
      'Britney Spears liebt den Song.',
      'Britney Spears',
      'Toxic'
    );

    expect(result).toContain('[XXX]');
    expect(result).toBe('[XXX] [XXX] liebt den Song.');
    expect(result).not.toMatch(/Britney/i);
    expect(result).not.toMatch(/Spears/i);
  });

  it('replaces the title inside a hint', () => {
    const result = censorHint(
      'Der Song heisst Toxic und nicht mehr.',
      'Britney Spears',
      'Toxic'
    );

    expect(result).toContain('[XXX]');
    expect(result).toBe('Der Song heisst [XXX] und nicht mehr.');
    expect(result).not.toMatch(/Toxic/i);
  });

  it('censors a short artist from the exception list', () => {
    const result = censorHint('BTS spielt hier', 'BTS', 'Dynamite');

    expect(result).toContain('[XXX]');
    expect(result).toBe('[XXX] spielt hier');
    expect(result).not.toMatch(/BTS/);
  });

  it('leaves a short artist that is not on the exception list untouched', () => {
    const result = censorHint('AB war auch dabei', 'AB', 'Sonnenkind');

    expect(result).not.toContain('[XXX]');
    expect(result).toBe('AB war auch dabei');
  });

  it('keeps stopwords in the title', () => {
    const result = censorHint(
      'The Dark Side of the Moon',
      'Pink Floyd',
      'The Dark Side of the Moon'
    );

    // "The", "of" and "the" are allow-listed — only the distinctive words go.
    expect(result).toContain('The');
    expect(result).toContain('of');
    expect(result).toContain('the');
    expect(result).toBe('The [XXX] [XXX] of the [XXX]');
  });

  it('does not censor a stopword of the title even when it is the hint subject', () => {
    const result = censorHint(
      'The beat is sampled from Lou Reed',
      'X',
      'The Dark Side'
    );

    expect(result).toContain('The');
    expect(result).toBe('The beat is sampled from Lou Reed');
  });

  it('is case-insensitive', () => {
    const result = censorHint(
      'britney spears singt toxic',
      'Britney Spears',
      'Toxic'
    );

    expect(result).toBe('[XXX] [XXX] singt [XXX]');
  });

  it('censors every occurrence of a token', () => {
    const result = censorHint(
      'Toxic von Britney Spears, nochmal Toxic von Britney Spears',
      'Britney Spears',
      'Toxic'
    );

    expect(result).not.toMatch(/Toxic/i);
    expect(result).not.toMatch(/Britney/i);
    expect(result.match(/\[XXX\]/g)?.length).toBe(6);
  });

  it('censors a multi-word artist before its fragments', () => {
    // "Glassworks" (10 characters) contains the artist fragment "Glass"
    // (5 characters). Only because the longer token is replaced first does the
    // result contain "[XXX]" and not "[XXX]works".
    const result = censorHint(
      'Glassworks (Opening) von Philip Glass',
      'Philip Glass',
      'Glassworks (Opening)'
    );

    expect(result).toBe('[XXX] [XXX] von [XXX] [XXX]');
    expect(result).not.toMatch(/Glass/i);
  });

  it('does not censor a short exception token inside a longer word', () => {
    // "BTS" is shorter than four characters, so it is matched with word
    // boundaries — "BTSSomething" is a different word and stays untouched.
    const result = censorHint('BTSSomething bleibt unangetastet', 'BTS', 'Dynamite');

    expect(result).toBe('BTSSomething bleibt unangetastet');
  });

  it('returns an empty string for an empty hint', () => {
    expect(censorHint('', 'Britney Spears', 'Toxic')).toBe('');
  });

  it('leaves a hint without any spoiler token untouched', () => {
    const hint = 'Der Song entstand 2003 in Los Angeles.';

    expect(censorHint(hint, 'Britney Spears', 'Toxic')).toBe(hint);
  });

  it('never leaves an artist or title token in the hint', () => {
    const hint = 'Philip Glass schrieb Glassworks (Opening) für die Sammlung.';
    const artist = 'Philip Glass';
    const title = 'Glassworks (Opening)';

    const result = censorHint(hint, artist, title);

    for (const token of [artist, title].flatMap((t) => t.split(/\s+/))) {
      expect(result).not.toMatch(
        new RegExp(escapeForRegExp(token), 'i')
      );
    }
  });

  it('never leaves an artist or title token in the hint for every known pair', () => {
    const cases: { hint: string; artist: string; title: string }[] = [
      {
        hint: 'Britney Spears liebt den Song.',
        artist: 'Britney Spears',
        title: 'Toxic',
      },
      {
        hint: 'BTS spielt hier',
        artist: 'BTS',
        title: 'Dynamite',
      },
      {
        hint: 'Glassworks (Opening) von Philip Glass',
        artist: 'Philip Glass',
        title: 'Glassworks (Opening)',
      },
      {
        hint: 'Paranoid von Black Sabbath',
        artist: 'Black Sabbath',
        title: 'Paranoid',
      },
      {
        hint: 'Ironic von Alanis Morissette',
        artist: 'Alanis Morissette',
        title: 'Ironic',
      },
      {
        hint: 'Respect von Aretha Franklin',
        artist: 'Aretha Franklin',
        title: 'Respect',
      },
    ];
    for (const { hint, artist, title } of cases) {
      const result = censorHint(hint, artist, title);
      for (const token of [artist, title].flatMap((t) => t.split(/\s+/))) {
        expect(
          result,
          `"${token}" survived in "${result}" (artist "${artist}", title "${title}")`
        ).not.toMatch(new RegExp(escapeForRegExp(token), 'i'));
      }
    }
  });

  it('known limitation: a hyphenated name whose parts are all shorter than four characters is not censored', () => {
    // The tokeniser splits on hyphens, so "Ken-Y" becomes "Ken" + "Y" and
    // neither part reaches the minimum length. Measured on the catalogue:
    // three hints of 8,075 leak because of this (see the guard below).
    const result = censorHint(
      'Das Duett entstand mit Ken-Y und Ba-Ba.',
      'R.K.M, Ken-Y',
      'Down'
    );

    expect(result).toContain('Ken-Y');
    expect(result).toContain('Ba-Ba');
  });
});

/**
 * Catalogue-wide guard.
 *
 * The invariant "no artist or title token survives in the censored hint" is
 * checked against every hint of every song in `src/data/songs/**`. The three
 * known leaks are listed explicitly: they are a measured property of the
 * current implementation (hyphenated names, see the test above). A leak that
 * is not on the list fails the suite.
 */
const KNOWN_LEAKS = new Set([
  'yt-c7BIT7UKEwQ|Ba-Ba',
  'yt-iFnwmTeSlAQ|Ken-Y',
  'yt-e8w6cLVxAjA|Ken-Y',
]);

describe('censorHint over the whole catalogue', () => {
  it('never lets a new artist or title token survive', () => {
    const songsDir = join(process.cwd(), 'src/data/songs');
    const files = readdirSync(songsDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    const leaks: string[] = [];
    let pairs = 0;

    for (const file of files) {
      const raw = readFileSync(join(songsDir, file), 'utf-8');
      const data = JSON.parse(raw) as { songs?: SongLike[] };
      for (const song of data.songs ?? []) {
        for (const hint of song.hints ?? []) {
          pairs++;
          const result = censorHint(hint, song.artist, song.title);
          for (const token of [song.artist, song.title].flatMap((t) =>
            t.split(/\s+/)
          )) {
            if (!isCensorableToken(token)) continue;
            if (new RegExp(escapeForRegExp(token), 'i').test(result)) {
              leaks.push(`${song.id}|${token}`);
            }
          }
        }
      }
    }

    expect(pairs).toBeGreaterThan(1000);
    expect(
      leaks.filter((leak) => !KNOWN_LEAKS.has(leak)),
      'new spoiler leaks found in the catalogue'
    ).toEqual([]);
    expect(leaks.length).toBeLessThanOrEqual(KNOWN_LEAKS.size);
  });
});
