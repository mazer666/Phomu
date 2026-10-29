/**
 * The initial state of a game session.
 *
 * WHY a module of its own: the store is built from slices, and every slice
 * needs the state a fresh session starts with. The state lives apart from
 * the slices, so that it can be read without the store.
 */
import type { GameState } from '@/types/game-state';
import { PHOMU_CONFIG } from '@/config/game-config';
import { DEFAULT_GAME_CONFIG } from '@/config/default-game-config';

/**
 * The state of a fresh session.
 *
 * WHY a function and not a constant: the session carries an identifier that
 * is new for every session, and a constant would be shared by all of them.
 */
export function createInitialState(): GameState {
  return {
    sessionId: crypto.randomUUID(),
    players: [],
    teams: [],
    turnOrder: [],
    currentTurnIndex: 0,
    config: DEFAULT_GAME_CONFIG,
    currentRound: 0,
    roundPhase: 'drawing',
    currentQuestion: null,
    currentReveal: null,
    currentMode: 'timeline',
    currentAnswers: [],
    roundHistory: [],
    playedSongIds: [],
    isGameOver: false,
    winnerId: undefined,
    // Global Progression & Preferences
    totalXP: 0,
    preferredPlayer: 'standard',
    preferredMusicProvider: PHOMU_CONFIG.DEFAULT_MUSIC_PROVIDER,
    musicEnabled: true,
    musicVolume: 0.8,
    sfxEnabled: true,
    sfxVolume: 0.55,
    currentSongSource: null,
    quickSongId: null,
    autoDrawIntent: false,
    timelineYears: [],
    gameStartTime: null,
    // A fresh session has no failure — the first one is reported by the core.
    error: null,
    errorValues: null,
  };
}
