import type { PhomuSong } from '@/types/song';
import type { GameMode, Difficulty } from '@/config/game-config';
import { ALL_SONGS } from '@/data/songs';

interface PickerOptions {
  playedIds: string[];
  selectedPacks?: string[];
  difficulty?: Difficulty | 'all';
  onlyQRCompatible?: boolean;
  currentMode?: GameMode;
}

/**
 * Gibt einen zufälligen Song zurück, der den Kriterien entspricht.
 */
export function pickRandomSong({ 
  playedIds, 
  selectedPacks, 
  difficulty = 'all', 
  onlyQRCompatible = false, 
  currentMode 
}: PickerOptions): PhomuSong | null {
  
  let basePool = ALL_SONGS;
  if (selectedPacks && selectedPacks.length > 0) {
    basePool = ALL_SONGS.filter(s => s.packs.some(p => selectedPacks.includes(p)));
  }
  if (basePool.length === 0) basePool = ALL_SONGS; // Absoluter Fallback

  let pool = basePool;

  // Optionale Filter (Difficulty, QR) anwenden. Falls diese zu 0 Songs führen, ignorieren wir sie (Soft-Fallback)
  if (onlyQRCompatible) {
    const qrPool = pool.filter(s => s.isQRCompatible);
    if (qrPool.length > 0) pool = qrPool;
  }
  
  if (difficulty !== 'all') {
    const diffPool = pool.filter(s => s.difficulty === difficulty);
    if (diffPool.length > 0) pool = diffPool;
  }

  // 2. Modus-Spezifische Filter (z.B. Lyrics Labyrinth braucht zwingend Lyrics)
  let modePool = pool;
  if (currentMode === 'lyrics') {
    modePool = pool.filter(s => s.lyrics !== null);
  } else if (currentMode) {
    modePool = pool.filter(s => s.supportedModes?.includes(currentMode as GameMode));
  }

  if (modePool.length > 0) {
    pool = modePool;
  } else if (currentMode === 'lyrics') {
     // Hard-Fallback für Lyrics: Wenn der Pool 0 ist, müssen wir zwingend auf die BasePool (ignorierte Difficulty/QR) zurückgreifen
     const absoluteLyricsPool = basePool.filter(s => s.lyrics !== null);
     if (absoluteLyricsPool.length > 0) pool = absoluteLyricsPool;
  }

  // 3. Noch nicht gespielte Songs bevorzugen
  const available = pool.filter((s) => !playedIds.includes(s.id));

  // Wenn alles gespielt wurde, ignorieren wir playedIds für ältere Songs
  if (available.length === 0) {
    const recentlyPlayed = playedIds.slice(-5);
    const fallback = pool.filter((s) => !recentlyPlayed.includes(s.id));
    const finalPool = fallback.length > 0 ? fallback : pool;
    if (finalPool.length === 0) return null; // Extrem unwahrscheinlich
    return finalPool[Math.floor(Math.random() * finalPool.length)] ?? null;
  }

  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/** Alle verfügbaren Songs (für Tests/Debugging) */
export function getAllSongs(): PhomuSong[] {
  return ALL_SONGS;
}
