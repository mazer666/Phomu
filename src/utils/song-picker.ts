import type { PhomuSong } from '@/types/song';
import type { GameMode, Difficulty } from '@/config/game-config';
import { PHOMU_CONFIG } from '@/config/game-config';
import { ALL_SONGS } from '@/data/songs';

/**
 * Maps old lobby pack IDs (e.g. 'global-hits') to the current pack keys.
 * The IDs do not occur as a `packs` entry in any song and therefore produced
 * empty selections in the filter. Saved game states from older versions
 * still contain them.
 */
function normalizePackIds(packIds: string[]): string[] {
  const aliases = PHOMU_CONFIG.PACK_ALIASES as Record<string, string>;
  return packIds.map((id) => aliases[id] ?? id);
}

interface PickerOptions {
  playedIds: string[];
  selectedPacks?: string[];
  difficulty?: Difficulty | 'all';
  onlyQRCompatible?: boolean;
  currentMode?: GameMode;
}

/**
 * Returns a random song that matches the criteria.
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
    const packIds = normalizePackIds(selectedPacks);
    basePool = ALL_SONGS.filter(s => s.packs.some(p => packIds.includes(p)));
  }
  if (basePool.length === 0) basePool = ALL_SONGS; // Absolute fallback

  let pool = basePool;

  // Apply the optional filters (difficulty, QR). If these lead to 0 songs we ignore them (soft fallback)
  if (onlyQRCompatible) {
    const qrPool = pool.filter(s => s.isQRCompatible);
    if (qrPool.length > 0) pool = qrPool;
  }
  
  if (difficulty !== 'all') {
    const diffPool = pool.filter(s => s.difficulty === difficulty);
    if (diffPool.length > 0) pool = diffPool;
  }

  // 2. Mode-specific filters (e.g. Lyrics Labyrinth strictly requires lyrics)
  let modePool = pool;
  if (currentMode === 'lyrics') {
    modePool = pool.filter(s => s.lyrics !== null);
  } else if (currentMode) {
    modePool = pool.filter(s => s.supportedModes?.includes(currentMode as GameMode));
  }

  if (modePool.length > 0) {
    pool = modePool;
  } else if (currentMode === 'lyrics') {
     // Hard fallback for lyrics: if the pool is 0 we strictly have to fall back to the base pool (ignored difficulty/QR)
     const absoluteLyricsPool = basePool.filter(s => s.lyrics !== null);
     if (absoluteLyricsPool.length > 0) pool = absoluteLyricsPool;
  }

  // 3. Prefer songs that have not been played yet
  const available = pool.filter((s) => !playedIds.includes(s.id));

  // If everything has been played we ignore playedIds for older songs
  if (available.length === 0) {
    const recentlyPlayed = playedIds.slice(-5);
    const fallback = pool.filter((s) => !recentlyPlayed.includes(s.id));
    const finalPool = fallback.length > 0 ? fallback : pool;
    if (finalPool.length === 0) return null; // Extremely unlikely
    return finalPool[Math.floor(Math.random() * finalPool.length)] ?? null;
  }

  return available[Math.floor(Math.random() * available.length)] ?? null;
}

/** All available songs (for tests/debugging) */
export function getAllSongs(): PhomuSong[] {
  return ALL_SONGS;
}
