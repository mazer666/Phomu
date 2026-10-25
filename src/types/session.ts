/**
 * Session Types
 *
 * A "session" is a game room that players join.
 * In Pass-the-Phone mode, the session lives entirely on the client.
 * In Multi-Device mode, it syncs via Supabase Realtime.
 */
import type { GameConfig } from './game-state';

/** Current status of a game session */
export type SessionStatus =
  | 'lobby'     // Players joining, settings being configured
  | 'playing'   // Game is active
  | 'paused'    // Game temporarily paused
  | 'ended';    // Game finished

/**
 * A saved session preset — lets users quickly reuse a favorite configuration.
 * Stored in localStorage (anonymous) or Supabase (logged-in users).
 */
export interface SessionPreset {
  id: string;
  name: string;       // User-given name, e.g. "Friday Night Settings"
  config: GameConfig;
  createdAt: string;  // ISO timestamp
}

/**
 * Multi-device session record (used with Supabase in Phase 6).
 * The 6-digit code lets other devices join.
 */
export interface MultiDeviceSession {
  /** 6-digit numeric code players type to join */
  code: string;

  /** Supabase Realtime channel name */
  channelName: string;

  /** ID of the host player */
  hostPlayerId: string;

  /** Current session status */
  status: SessionStatus;

  /** Session configuration */
  config: GameConfig;

  /** When the session was created */
  createdAt: string;
}
