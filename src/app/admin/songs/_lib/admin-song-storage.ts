/**
 * The browser overlay of the admin song tool.
 *
 * WHAT: the two functions that read the edited songs from the storage of the
 * browser and write them back, and the function that clears the overlay.
 *
 * WHY an overlay exists: the catalogue of the game comes from the base and is
 * the answer key of the round — it must not travel into the browser as a file
 * (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001). The edits of the
 * administrator live in the storage of the browser until they are exported.
 * The overlay wins over the catalogue, because the edits are the newer state.
 *
 * EXAMPLE: `loadSongsFromStorage(records)` returns the edited songs of the
 * browser, or the records of the catalogue when the browser holds none.
 */
import { SONG_STORAGE_KEY } from '@/utils/song-storage';
import type { AdminSong } from './admin-song-model';

/**
 * Loads songs from localStorage (if present), otherwise from the catalogue.
 *
 * WHY the catalogue is a parameter: the catalogue lives in the base. It
 * arrives asynchronously, and the edits of the browser win over it.
 */
export function loadSongsFromStorage(source: AdminSong[]): AdminSong[] {
  try {
    const raw = localStorage.getItem(SONG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AdminSong[];
    }
  } catch {
    // localStorage unavailable or corrupted → fall back to the catalogue
  }
  return source;
}

/** Saves songs in localStorage */
export function saveSongsToStorage(songs: AdminSong[]): void {
  try {
    localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(songs));
  } catch {
    console.error('[Admin] Konnte nicht in localStorage speichern.');
  }
}

/**
 * Removes the overlay of the admin tool from the storage of the browser.
 *
 * WHY the removal is the reset: the catalogue of the base is the source, the
 * overlay of the browser is the deviation. Removing the deviation brings the
 * tool back to the source.
 */
export function clearAdminSongs(): void {
  localStorage.removeItem(SONG_STORAGE_KEY);
}
