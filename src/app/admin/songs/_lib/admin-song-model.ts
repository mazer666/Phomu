/**
 * The model of the admin song tool.
 *
 * WHAT: the type of a song in the admin tool, the template of a new song and
 * the pure rules of the tool — completeness, duplicates, hint spoilers and
 * verifiable hints.
 *
 * WHY the rules live apart from the page: they are decisions, not drawings.
 * Whether a song counts as finished, whether it is a duplicate of another one
 * and whether a hint spoils the answer are answers that the song list asks,
 * that the editor asks and that the save path asks. Here they are functions
 * without React, without the DOM and without a store, and the page only
 * orchestrates them.
 *
 * EXAMPLE: `isSongComplete` answers whether a song may count as finished. The
 * list draws the answer as a badge, the statistics of the page count it and
 * the export carries it.
 */
import type { PhomuSong } from '@/types/song';

/**
 * A song in the admin tool.
 *
 * In the admin tool we use PhomuSong, but lyrics may be null. This version is
 * stored locally and exported.
 */
export type AdminSong = PhomuSong;

/** The completeness filter of the song list. */
export type FilterCompleteness = 'all' | 'complete' | 'incomplete';

/** The pack filter of the song list — 'all' or the name of a pack. */
export type FilterPack = 'all' | string;

/** Empty song template for a new form */
export const EMPTY_SONG: AdminSong = {
  id: '',
  title: '',
  artist: '',
  year: new Date().getFullYear(),
  country: '',
  genre: '',
  difficulty: 'medium',
  mood: [],
  packs: ['Global Hits 1950-2026'],
  hints: ['', '', '', '', ''],
  hintEvidence: ['', '', '', '', ''],
  lyrics: null,
  isOneHitWonder: false,
  links: {
    youtube: '',
    spotify: '',
    spotifyFreePreview: '',
    amazonMusic: '',
    amazonPrimePreview: '',
  },
  supportedModes: [
    'timeline',
    'hint-master',
    'lyrics',
    'vibe-check',
    'cover-confusion',
    'survivor',
  ],
  isQRCompatible: true,
};

/** Checks whether a song is complete (no null fields, all required fields present) */
export function isSongComplete(song: AdminSong): boolean {
  if (!song.id || !song.title || !song.artist) return false;
  if (!song.links.youtube || song.links.youtube.startsWith('TODO:'))
    return false;
  if (!song.lyrics) return false;
  if (!song.hints.every((h) => h.trim() !== '')) return false;
  return true;
}

/**
 * Reduces a text to the characters that identify a song: no case, no
 * diacritics, no parentheses and no version markers.
 */
function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(
      /\b(feat\.?|ft\.?|featuring|remaster(ed)?|version|edit|radio mix|live)\b/g,
      ' '
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The key under which a song is recognised as a duplicate of another one.
 *
 * WHY the year belongs to the key: a cover is a different song than its
 * original, and a re-release of the same song carries another year. Only
 * artist, title and year together name the same song twice.
 */
export function duplicateKey(song: AdminSong): string {
  return `${normalizeText(song.artist)}::${normalizeText(song.title)}::${song.year}`;
}

/**
 * Whether a hint of the song spoils the song.
 *
 * WHY the rule exists: a hint that names the title or the artist of the song
 * gives the answer away — the hint is the ladder to the answer, not the answer
 * itself.
 */
export function hasHintSpoiler(song: AdminSong): boolean {
  const tokens = new Set([
    ...normalizeText(song.title)
      .split(' ')
      .filter((t) => t.length >= 4),
    ...normalizeText(song.artist)
      .split(' ')
      .filter((t) => t.length >= 4),
  ]);

  return song.hints.some((hint) => {
    const h = normalizeText(hint);
    return [...tokens].some((token) => token && h.includes(token));
  });
}

/**
 * Whether every hint of the song carries a source that can be checked.
 *
 * WHY the rule exists: a hint without a source is a claim. The catalogue of
 * the game is the answer key of the round, and every answer has to be
 * verifiable by the person who maintains it.
 */
export function hasVerifiableHints(song: AdminSong): boolean {
  if (!song.hintEvidence || song.hintEvidence.length !== 5) return false;
  return song.hintEvidence.every(
    (url) => typeof url === 'string' && /^https?:\/\//.test(url)
  );
}
