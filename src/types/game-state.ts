/**
 * Game State Types
 *
 * Represents the complete state of a running Phomu game session.
 * This is managed by Zustand on the client; in multi-device mode
 * it syncs via Supabase Realtime.
 */
import type { Player, Team, TeamMode } from './player';
import type { PhomuSong } from './song';
import type { GameMode, MusicProvider, Difficulty } from '@/config/game-config';

/** How the game is currently being played */
export type DeviceMode =
  | 'pass-the-phone'  // Single device passed between players
  | 'multi-device';   // Each player uses their own device (via session code)

/** The current phase within a single round */
export type RoundPhase =
  | 'drawing'     // Card is being drawn / revealed
  | 'question'    // Question is shown, players are thinking
  | 'locked-in'   // All answers submitted, waiting for reveal
  | 'reveal'      // Answer revealed, music playing
  | 'scoring';    // Points being awarded, next turn loading

/**
 * Configuration set before the game starts.
 * Created in the lobby and locked in when the game begins.
 */
export interface GameConfig {
  /** Which game modes are active for this session */
  selectedModes: GameMode[];

  /** Which content packs to draw songs from */
  selectedPacks: string[];

  /** How teams are organized */
  teamMode: TeamMode;

  /** How the game is played (one device or many) */
  deviceMode: DeviceMode;

  /** Score needed to win — e.g. 10 points */
  winCondition: number;

  /** Maximum seconds per turn — null means no limit */
  timeLimitSeconds: number | null;

  /** Song difficulty filter */
  difficulty: Difficulty | 'all';

  /** Whether chips/betting mechanic is active */
  chipsEnabled: boolean;
}

/**
 * The result of a single player's answer in one round.
 */
export interface PlayerAnswer {
  playerId: string;
  /** The answer value (varies by mode: lyric index, mood string, boolean, etc.) */
  answer: string | number | boolean;
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** Points awarded for this answer */
  pointsAwarded: number;
  /** How many seconds it took to answer (for future time-bonus mechanic) */
  answeredInSeconds?: number;
}

/**
 * Complete record of one round (one song).
 * Stored in game history for potential future replay/stats.
 */
export interface GameRound {
  roundNumber: number;
  mode: GameMode;
  song: PhomuSong;
  answers: PlayerAnswer[];
  completedAt: string; // ISO timestamp
}

/**
 * The full game state — everything needed to render the current game screen.
 */
export interface GameState {
  /** Unique session ID (used for multi-device sync) */
  sessionId: string;

  /** All players in this session (including spectators) */
  players: Player[];

  /** Teams (only populated in Fixed/Shifting team mode) */
  teams: Team[];

  /** Player IDs in the order they take turns */
  turnOrder: string[];

  /** Index into turnOrder — whose turn is it right now */
  currentTurnIndex: number;

  /** Configuration chosen in the lobby */
  config: GameConfig;

  /** Current round number (starts at 1) */
  currentRound: number;

  /** What phase this round is in */
  roundPhase: RoundPhase;

  /** The song currently being played */
  currentSong: PhomuSong | null;

  /** Which game mode is active for this round */
  currentMode: GameMode;

  /** Answers submitted so far this round */
  currentAnswers: PlayerAnswer[];

  /** All completed rounds (for history/stats) */
  roundHistory: GameRound[];

  /** IDs of songs already played — to avoid repeats */
  playedSongIds: string[];

  /** Whether the game has ended */
  isGameOver: boolean;

  /** ID of the winning player or team (set when isGameOver = true) */
  winnerId?: string;

  // ─── Global Progression (Phase 5) ──────────────────────────

  /** Total XP earned across all sessions */
  totalXP: number;

  /** Bevorzugter Player-Typ (Standard YouTube vs YouTube Music) */
  preferredPlayer: 'standard' | 'music';

  /** Woher der aktuelle Song kommt (Zufallswahl vs QR-Scan) */
  currentSongSource: 'random' | 'qr' | null;

  /** Ob die Drawing-Phase automatisch triggern soll (z.B. nach Auto-Skip) */
  autoDrawIntent: boolean;

  /** Jahreszahlen auf der gemeinsamen Timeline (wächst mit richtigen Antworten) */
  timelineYears: number[];
}
