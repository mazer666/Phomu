import type { PhomuSong } from '@/types/song';
import type { GameMode, Difficulty } from '@/config/game-config';
import { ALL_SONGS } from '@/data/packs';

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
  
  // 1. Grundgesamtheit filtern (Packs, Difficulty, QR)
  let pool = ALL_SONGS;
  
  if (selectedPacks && selectedPacks.length > 0) {
    pool = pool.filter(s => selectedPacks.includes(s.pack));
  }
  
  if (difficulty !== 'all') {
    pool = pool.filter(s => s.difficulty === difficulty);
  }
  
  if (onlyQRCompatible) {
    pool = pool.filter(s => s.isQRCompatible);
  }
  
  // 2. Modus-Spezifische Filter (z.B. Lyrics Labyrinth nur für Songs mit Lyrics)
  if (currentMode === 'lyrics') {
    pool = pool.filter(s => s.lyrics !== null && s.supportedModes?.includes('lyrics'));
  } else if (currentMode) {
    pool = pool.filter(s => s.supportedModes?.includes(currentMode as any));
  }

  // 3. Noch nicht gespielte Songs bevorzugen
  const available = pool.filter((s) => !playedIds.includes(s.id));

  // Wenn alles gespielt wurde, von vorne beginnen (Sicherheit)
  if (available.length === 0) {
    const recentlyPlayed = playedIds.slice(-5);
    const fallback = pool.filter((s) => !recentlyPlayed.includes(s.id));
    const finalPool = fallback.length > 0 ? fallback : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)] ?? null;
  }

  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/** Alle verfügbaren Songs (für Tests/Debugging) */
export function getAllSongs(): PhomuSong[] {
  return ALL_SONGS;
}
