/**
 * Game State Types
 *
 * Represents the complete state of a running Phomu game session.
 * This is managed by Zustand on the client; in multi-device mode
 * it syncs via Supabase Realtime.
 */
import type { Player, Team, TeamMode } from './player';
import type { RoundQuestion, RoundReveal, SongIdentity } from '@/core/types';
import type { GameMode, MusicProvider, Difficulty } from '@/config/game-config';


/** Who is allowed to perform override actions in the game */
export type OverrideGovernance = 'host' | 'co-host' | 'majority';

/** Publication policy for AI-generated hints */
export type HintReleasePolicy = 'auto-publish' | 'manual-review';

/** Verhalten bei API-Blocking/Rate-Limit */
export type AIQueueStrategy = 'queue-retry-pending' | 'fail-fast';

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

export type GameEndingCondition = 'points' | 'rounds' | 'time';

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

  /** Main condition that triggers the end of the game */
  endingCondition: GameEndingCondition;

  /** Target value for the ending condition (points, total rounds, or minutes) */
  targetPoints: number;
  targetRounds: number;
  targetTimeMinutes: number;

  /** Score needed to win — e.g. 10 points (Legacy/Alias for targetPoints) */
  winCondition: number;

  /** Maximum seconds per turn — null means no limit */
  timeLimitSeconds: number | null;

  /** Song difficulty filter */
  difficulty: Difficulty | 'all';

  /** Standard number of rounds (product requirement: at least 10) (legacy/alias for targetRounds) */
  roundsToPlay: number;

  /** Maximum points in timeline mode */
  timelineMaxPoints: number;

  /** Optional: answering later = fewer points */
  timeDecayEnabled: boolean;

  /** From when the time penalty kicks in */
  timeDecayGraceSeconds: number;

  /** Every X seconds 1 point is deducted */
  timeDecayStepSeconds: number;

  /** How many points are deducted per step */
  timeDecayStepPoints: number;

  /** Minimum for a correct answer despite the time penalty */
  minPointsPerCorrect: number;

  /** Governance for hidden override actions */
  overrideGovernance: OverrideGovernance;

  /** Publication of AI hints after passed checks */
  hintReleasePolicy: HintReleasePolicy;

  /** Behaviour on AI blocking (queue + retry + pending recommended) */
  aiQueueStrategy: AIQueueStrategy;

  /** Whether chips/betting mechanic is active */
  chipsEnabled: boolean;

  /** EXPERT: Disables all cheats/jokers */
  noCheatMode: boolean;

  /** Whether to play only songs that have a physical QR card */
  onlyQRCompatible: boolean;
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
  /**
   * The identity of the song of the round.
   *
   * WHY the identity and not the song: the history keeps what the round was
   * about. It is written when the round is over, and then the solution has
   * been released (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
   */
  identity: SongIdentity | null;
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

  /**
   * The question of the running round.
   *
   * WHY a question and not a song: the question view model of the base has
   * no field for the solution. The shell therefore cannot show the title, the
   * artist or the year of the song before the reveal — not because it hides
   * them, but because it does not have them
   * (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
   */
  currentQuestion: RoundQuestion | null;

  /**
   * The reveal of the running round — the phase that releases the solution.
   */
  currentReveal: RoundReveal | null;

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

  // ─── Global progression (phase 5) ──────────────────────────

  /** Total XP earned across all sessions */
  totalXP: number;

  /** Preferred player type (standard YouTube vs YouTube Music) */
  preferredPlayer: 'standard' | 'music';

  /** Preferred music provider (YouTube stays the default) */
  preferredMusicProvider: MusicProvider;

  /** Whether background music should be played */
  musicEnabled: boolean;

  /** Volume for background music (0..1) */
  musicVolume: number;

  /** Whether short sound effects should be played */
  sfxEnabled: boolean;

  /** Volume for sound effects (0..1) */
  sfxVolume: number;

  /** Where the current song comes from (random draw vs QR scan) */
  currentSongSource: 'random' | 'qr' | null;

  /**
   * The song the player picked in the library — the quick game.
   *
   * WHY the song is named here: the core owns the catalogue, and it draws a
   * song by its identifier. The shell remembers which song the player chose
   * until the card is drawn; after that the round draws at random again.
   */
  quickSongId: string | null;

  /** Whether the drawing phase should trigger automatically (e.g. after an auto-skip) */
  autoDrawIntent: boolean;

  /** Years on the shared timeline (grows with correct answers) */
  timelineYears: number[];

  /** Timestamp when the game started (for time-based ending condition) */
  gameStartTime: number | null;

  /**
   * The last failure of the game, or null. The player sees it.
   *
   * WHY a translation key and not the text of the failure: the shell speaks
   * two languages, and the technical text of a failure (a stack, a file
   * path) belongs in the console. The player gets a message he can act on.
   */
  error: string | null;

  /**
   * The values of the placeholders of the message of the failure.
   *
   * WHY a second field: the key names the failure, the values fill its
   * placeholders. A failure without values carries `null` here.
   */
  errorValues: Record<string, string | number> | null;
}
