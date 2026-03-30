/**
 * Song-Picker Utility
 *
 * Wählt zufällig einen Song aus dem geladenen Pack aus,
 * der noch nicht in dieser Session gespielt wurde.
 */
import type { PhomuSong } from '@/types/song';
import globalHits from '@/data/packs/global-hits.json';

/** Alle Songs aus dem einzigen aktuell vorhandenen Pack */
const ALL_SONGS = globalHits.songs as PhomuSong[];

/**
 * Gibt einen zufälligen Song zurück, der noch nicht gespielt wurde.
 *
 * @param playedIds - IDs der bereits gespielten Songs
 * @returns Zufälliger Song, oder null wenn keine Songs verfügbar
 */
export function pickRandomSong(playedIds: string[]): PhomuSong | null {
  // Songs filtern, die noch nicht gespielt wurden
  const available = ALL_SONGS.filter((s) => !playedIds.includes(s.id));

  // Wenn alles gespielt wurde, von vorne beginnen (ohne die letzten 3 für Abwechslung)
  if (available.length === 0) {
    const recentlyPlayed = playedIds.slice(-3);
    const fallback = ALL_SONGS.filter((s) => !recentlyPlayed.includes(s.id));
    const pool = fallback.length > 0 ? fallback : ALL_SONGS;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/** Alle verfügbaren Songs (für Tests/Debugging) */
export function getAllSongs(): PhomuSong[] {
  return ALL_SONGS;
}
