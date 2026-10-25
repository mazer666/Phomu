/**
 * The narrow interface of the song catalogue.
 *
 * WHY THIS MODULE EXISTS
 *   The catalogue is stored as a barrel of 136 JSON files
 *   (`src/data/songs/index.ts`) that every consumer of the raw catalogue
 *   receives in full — 1,557 songs with their hints and their lyrics. That
 *   is the structural root of QA-SPO-001 (the answer key reaches the
 *   browser) and of QA-ARC-006 (the presentation is coupled to the storage
 *   format of the catalogue).
 *
 *   This module is the only place that is allowed to know the storage
 *   format. Everything above it asks for what it needs:
 *
 *   - `loadCatalogue()` returns the **metadata only** — the identifier, the
 *     title, the artist and the year. A consumer that lists or searches
 *     never receives a hint and never receives a lyric.
 *   - `loadPack()` returns the songs of **one pack**, with their hints and
 *     their real lyric lines — the data a round needs.
 *   - `loadAdminRecords()` returns the full records and belongs to the
 *     administrative surfaces only; it must never be used by a component of
 *     the game.
 *
 *   The functions are asynchronous on purpose: the delivery of the
 *   catalogue from an API instead of from the bundle (the backlog item 1.1)
 *   changes the implementation of this module and nothing above it.
 *
 * THE BOUNDARY
 *   `scripts/check-module-boundaries.mjs` forbids a component and a page
 *   from importing `src/data/songs` (the rule MB-RAW-CATALOGUE). They have
 *   to import this module instead.
 *
 * THE HINTS
 *   The hints of a bundle are the **stored** hints. They are not censored:
 *   the censoring happens in the mode component at the moment the hint is
 *   shown (`src/components/game/modes/HintMasterMode.tsx`), because the
 *   amount of information a hint may carry depends on the level of the
 *   Hint-Master mode.
 *
 * THE LYRICS
 *   The lyrics of a bundle are the **real** lines. The invented line — the
 *   answer of the Lyrics Labyrinth mode — is not part of the interface at
 *   all: a client that receives the round never receives the answer.
 *
 * EXAMPLE: the metadata of the catalogue, without a single hint.
 *
 * ```ts
 * const entries = await loadCatalogue();
 * console.log(entries.length, entries[0].title);
 * ```
 */

import { PHOMU_CONFIG } from '@/config/game-config';
import { ALL_SONGS, AVAILABLE_PACKS } from '@/data/songs';
import type { PhomuSong } from '@/types/song';

/**
 * The metadata of one song — everything a consumer may know before the
 * reveal.
 */
export interface CatalogueEntry {
  /** The unique identifier of the song. */
  id: string;
  /** The title of the song. */
  title: string;
  /** The artist of the song. */
  artist: string;
  /** The year of the release. */
  year: number;
}

/**
 * The data of one song that a round needs.
 */
export interface RoundBundle {
  /** The metadata of the song. */
  entry: CatalogueEntry;
  /** The stored hints of the song, from the hardest to the easiest. */
  hints: string[];
  /** The real lyric lines — the invented line is never part of a bundle. */
  lyrics?: string[];
}

/**
 * The names of the packs of the catalogue.
 *
 * WHY: the pack names are the identifiers of the selection of the lobby
 * and of the store. They are data of the catalogue and therefore belong to
 * its interface.
 *
 * @returns the names of the packs, sorted
 */
export function listPacks(): string[] {
  return [...AVAILABLE_PACKS].sort();
}

/**
 * The metadata of the whole catalogue — without a single hint and without
 * a single lyric.
 *
 * WHY: a consumer that lists or searches the catalogue needs the title, the
 * artist and the year. The hints and the lyrics are the answers of the
 * round and have no place in a list.
 *
 * @returns the metadata of every song of the catalogue
 */
export async function loadCatalogue(): Promise<CatalogueEntry[]> {
  return ALL_SONGS.map(toEntry);
}

/**
 * The songs of one pack, with the data a round needs.
 *
 * WHY: the pack is the unit of the selection of the lobby. A consumer asks
 * for the pack it plays and receives the songs of that pack — and not the
 * whole catalogue.
 *
 * @param packId the name of the pack; a legacy identifier is resolved to its
 *   current name
 * @returns the bundles of the songs of the pack, empty when the pack is
 *   unknown
 */
export async function loadPack(packId: string): Promise<RoundBundle[]> {
  const canonical = resolvePackId(packId);
  return ALL_SONGS.filter((song) => song.packs.includes(canonical)).map(toBundle);
}

/**
 * The bundle of one song.
 *
 * @param songId the identifier of the song
 * @returns the bundle of the song, undefined when the catalogue has no such
 *   song
 */
export async function loadSong(songId: string): Promise<RoundBundle | undefined> {
  const song = ALL_SONGS.find((candidate) => candidate.id === songId);
  return song ? toBundle(song) : undefined;
}

/**
 * The full records of the catalogue.
 *
 * WHY: the administrative surfaces edit the songs — they need every field,
 * including the ones a round does not use. This escape hatch is the reason
 * the rule MB-RAW-CATALOGUE exists: it is the only way to the raw format,
 * and it is named so that a reader sees that it is not for the game.
 *
 * @returns the records of every song of the catalogue
 */
export async function loadAdminRecords(): Promise<PhomuSong[]> {
  return ALL_SONGS;
}

/**
 * The metadata of a song.
 *
 * @param song the song of the catalogue
 * @returns the metadata of the song
 */
function toEntry(song: PhomuSong): CatalogueEntry {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    year: song.year,
  };
}

/**
 * The bundle of a song.
 *
 * @param song the song of the catalogue
 * @returns the bundle of the song
 */
function toBundle(song: PhomuSong): RoundBundle {
  const entry = toEntry(song);
  const bundle: RoundBundle = { entry, hints: [...song.hints] };
  const real = song.lyrics?.real;
  if (real && real.length > 0) {
    bundle.lyrics = [...real];
  }
  return bundle;
}

/**
 * The current name of a pack.
 *
 * WHY: the lobbies of older versions stored the legacy identifiers of the
 * packs. Without the resolution a saved session would ask for a pack that
 * does not exist and receive an empty pack.
 *
 * @param packId the name or the legacy identifier of the pack
 * @returns the current name of the pack
 */
function resolvePackId(packId: string): string {
  const aliases = PHOMU_CONFIG.PACK_ALIASES as Record<string, string>;
  return aliases[packId] ?? packId;
}
