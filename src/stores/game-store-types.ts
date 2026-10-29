/**
 * The shape of the game store.
 *
 * WHAT: the state of a session and the actions that change it.
 *
 * WHY a module of its own: the store is the biggest piece of state of the
 * shell. The type lives apart from the implementation, so that the slices
 * can be written against the type without importing the store — and without
 * a cycle between the store and its slices.
 */
import type { StoreApi } from 'zustand';
import type {
  GameState,
  GameConfig,
  GameRound,
  RoundPhase,
  PlayerAnswer,
} from '@/types/game-state';
import type { Player } from '@/types/player';
import type { RoundQuestion, RoundReveal } from '@/core/types';
import type { GameMode } from '@/config/game-config';

/** All actions that operate on the GameState */
export interface GameActions {
  /** Resets the entire state and generates a new session ID */
  initSession: () => void;

  /** Adds a new player to the lobby */
  addPlayer: (name: string, avatar?: string, color?: string) => void;

  /** Removes a player by its ID */
  removePlayer: (playerId: string) => void;

  /** Updates the game configuration (partial update possible) */
  setConfig: (updates: Partial<GameConfig>) => void;

  /** Starts the game — sets the round state and picks the first mode */
  startGame: () => void;

  /** Saves the completed round and prepares the next one */
  nextRound: () => void;

  /** Ends the game and sets the winner */
  endGame: (winnerId?: string) => void;

  /**
   * Sets the question of the running round and switches to the question
   * phase.
   *
   * WHY a question and not a song: the question view model of the base has
   * no field for the solution (docs/qa/QA-02-SPOILER-FREENESS.md,
   * QA-SPO-001).
   */
  setQuestion: (question: RoundQuestion, source?: 'random' | 'qr') => void;

  /** Sets the reveal of the running round */
  setReveal: (reveal: RoundReveal) => void;

  /** Skips a broken song (404/restricted) */
  skipBrokenSong: () => void;

  /** Sets the preferred player type */
  setPreferredPlayer: (type: 'standard' | 'music') => void;

  /** Sets the preferred music provider */
  setPreferredMusicProvider: (provider: GameState['preferredMusicProvider']) => void;

  /** Audio settings for music/SFX */
  setAudioSettings: (updates: Partial<Pick<GameState, 'musicEnabled' | 'musicVolume' | 'sfxEnabled' | 'sfxVolume'>>) => void;

  /** Switches the current round phase */
  advancePhase: (phase: RoundPhase) => void;

  /**
   * Sets the mode of the running round — the core draws it, the shell shows it.
   */
  setCurrentMode: (mode: GameMode) => void;

  /** Adds a player answer to the running round */
  submitAnswer: (answer: PlayerAnswer) => void;

  /** Adds points to the score of a player */
  awardPoints: (playerId: string, points: number) => void;

  /** Resets all player scores to 0 (for "play again") */
  resetScores: () => void;

  /**
   * Starts a game immediately with a specific song (quick play).
   *
   * @param songId - The identifier of the song of the card.
   */
  startQuickGame: (songId: string) => void;

  /** Updates player data (e.g. avatar/colour in the settings) */
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  /** Resets the entire progression (XP) */
  resetProgress: () => void;

  /** Creates N teams with random funny names */
  initTeams: (count: number) => void;

  /** Adds a new team */
  createTeam: (name?: string) => void;

  /** Removes a team and clears all assignments */
  removeTeam: (teamId: string) => void;

  /** Assigns a player to a team (undefined = no team) */
  assignPlayerToTeam: (playerId: string, teamId: string | undefined) => void;

  /** Sets the initial timeline years (on the first timeline draw) */
  initTimeline: (years: number[]) => void;

  /** Adds a year to the timeline (after a correct guess) */
  addTimelineYear: (year: number) => void;

  /** Removes a year from the timeline (first occurrence) */
  removeTimelineYear: (year: number) => void;

  /**
   * Reports a failure of the game — the player sees it.
   *
   * @param message - The translation key of the failure
   * @param values - The values of the placeholders of the message
   */
  setError: (
    message: string,
    values?: Record<string, string | number>
  ) => void;

  /** Removes the failure of the game from the screen */
  clearError: () => void;
}

/** Complete store type = state + actions */
export type GameStore = GameState & GameActions;

/**
 * The setter of the store, as the slices use it.
 *
 * WHY the type of the store and not a free function: the slices write parts
 * of the state, and the store has to know that the parts belong together.
 */
export type StoreSet = StoreApi<GameStore>['setState'];

/** The reader of the store, as the slices use it. */
export type StoreGet = StoreApi<GameStore>['getState'];

/** The actions of a slice — a part of the actions of the store. */
export type SliceActions<Keys extends keyof GameActions> = Pick<
  GameActions,
  Keys
>;
