/**
 * Player Types
 *
 * Represents a person participating in a Phomu game session.
 * Players are anonymous by default — no login required.
 */

/** How teams are organized in a game session */
export type TeamMode =
  | 'individual'  // Every player for themselves
  | 'fixed'       // Fixed teams throughout the game
  | 'shifting';   // Teams randomized every round

/**
 * A single player in a game session.
 * Created when someone enters their name in the lobby.
 */
export interface Player {
  /** Unique ID generated client-side (e.g. crypto.randomUUID()) */
  id: string;

  /** Display name chosen by the player */
  name: string;

  /** Current score in the session */
  score: number;

  /** Which team this player belongs to — undefined in Individual mode */
  teamId?: string;

  /**
   * Whether this player has been eliminated from the game.
   * Eliminated players become spectators: they can still play along
   * for fun, but their answers don't count toward the scoreboard.
   */
  isEliminated: boolean;

  /**
   * Spectator mode flag.
   * A player becomes a spectator when eliminated, or can join as spectator
   * directly (e.g., someone who joins late).
   */
  isSpectator: boolean;

  /**
   * Whether this player is the "Pilot" — the person holding the device
   * and controlling the game flow. The Pilot validates answers in Hint-Master mode.
   * There is exactly one Pilot per Pass-the-Phone session.
   */
  isPilot: boolean;

  /** Optional: color used for visual distinction (hex string, e.g. '#ff6b35') */
  color?: string;

  /** Optional: emoji avatar chosen by the player */
  avatar?: string;
}

/**
 * A team grouping in Fixed or Shifting team mode.
 */
export interface Team {
  /** Unique team ID */
  id: string;

  /** Display name, e.g. "Team 1" or "The Rockers" */
  name: string;

  /** IDs of players belonging to this team */
  playerIds: string[];

  /** Combined score of all team members */
  score: number;

  /** Team color for visual distinction */
  color: string;
}
