/**
 * The local edits of the catalogue.
 *
 * WHAT: the overlay of the edits that a surface stores in the browser.
 *
 * WHY the overlay exists: the administrative surfaces and the catalogue
 * browser edit songs. Until the catalogue is written back into the pack
 * files, the edits live in the browser — and the browser has them again the
 * next time it is opened.
 *
 * WHY the overlay is separate from the catalogue: the catalogue comes from
 * the base, the overlay belongs to the browser. A surface that shows the
 * catalogue merges the two.
 *
 * EXAMPLE: `const songs = readStoredSongs() ?? records;`
 */
import type { PhomuSong } from '@/types/song';

/** The key of the overlay in the storage of the browser. */
export const SONG_STORAGE_KEY = 'phomu-admin-songs';

/**
 * Reads the edited songs from the storage of the browser.
 *
 * WHY the failure is swallowed: a browser without a storage, or a corrupted
 * entry, must not take the surface down — the catalogue is the source and
 * is always available.
 *
 * @returns The edited songs, or `null` when there is no overlay.
 */
export function readStoredSongs(): PhomuSong[] | null {
  try {
    const raw = localStorage.getItem(SONG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PhomuSong[]) : null;
  } catch {
    return null;
  }
}

/**
 * Writes the edited songs into the storage of the browser.
 *
 * @param songs - The songs of the surface.
 */
export function writeStoredSongs(songs: PhomuSong[]): void {
  try {
    localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(songs));
  } catch {
    console.error('the edited songs could not be stored');
  }
}

/**
 * Removes the edited songs from the storage of the browser.
 */
export function clearStoredSongs(): void {
  try {
    localStorage.removeItem(SONG_STORAGE_KEY);
  } catch {
    console.error('the edited songs could not be removed');
  }
}
