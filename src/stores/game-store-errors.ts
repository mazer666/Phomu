/**
 * The slice of the failures of a session.
 *
 * WHAT: the last failure of the game — the message the player sees, and the
 * two actions that write and clear it.
 *
 * WHY the slice exists: a failure of the core used to end in a
 * `console.error`, and the player was left with a button that did nothing.
 * The failure belongs to the state of the session, so that the screen can
 * show it (docs/qa/QA-02-SPOILER-FREENESS.md is about the round; the
 * failure is the counterpart of it).
 *
 * WHY the state holds a translation key and not a text: the shell speaks
 * German and English. The screen translates the key, the console keeps the
 * technical text — the player never sees a stack or a file path.
 *
 * EXAMPLE: the core refuses to draw a card — the hook writes
 * `game.error.drawFailed` into the state and the screen shows the message.
 */
import type { TranslationKey } from '@/i18n/types';
import type { SliceActions, StoreSet } from './game-store-types';

/**
 * The translation keys of the failures the shell can show.
 *
 * WHY the keys are listed here: the hook writes them, the screen reads
 * them. A key that is not in this list cannot be shown in a translated way
 * and falls back to the generic message.
 */
export const GAME_ERROR_KEYS = {
  /** The session of the core could not be opened. */
  coreUnavailable: 'game.error.coreUnavailable',
  /** The next card could not be drawn. */
  drawFailed: 'game.error.drawFailed',
  /** The solution of the round could not be released. */
  revealFailed: 'game.error.revealFailed',
  /** The round could not be closed. */
  roundFailed: 'game.error.roundFailed',
  /** The fallback for a failure without a message of its own. */
  generic: 'game.error.generic',
} as const satisfies Record<string, TranslationKey>;

/** A translation key of a failure of the game. */
export type GameErrorKey = (typeof GAME_ERROR_KEYS)[keyof typeof GAME_ERROR_KEYS];

/** Every key of a failure of the game. */
const GAME_ERROR_KEY_LIST: readonly string[] = Object.values(GAME_ERROR_KEYS);

/**
 * Checks whether a value names a failure of the game.
 *
 * WHY the check: the state holds a string. A string that is not a known key
 * would be shown as it is — the player would read the key instead of a
 * message.
 *
 * @param value - The value of the state
 * @returns Whether the value is a known key of a failure
 */
export function isGameErrorKey(value: string): value is GameErrorKey {
  return GAME_ERROR_KEY_LIST.includes(value);
}

/** The actions of the slice of the failures. */
export type ErrorActions = SliceActions<'setError' | 'clearError'>;

/**
 * The slice of the failures of a session.
 *
 * WHY the values are cleared together with the key: a message without its
 * values would render the placeholder of a missing value.
 *
 * @param set - The setter of the store.
 */
export function createErrorActions(set: StoreSet): ErrorActions {
  return {
    // ── setError ───────────────────────────────────────────────────
    setError(message, values) {
      set({ error: message, errorValues: values ?? null });
    },

    // ── clearError ─────────────────────────────────────────────────
    clearError() {
      set({ error: null, errorValues: null });
    },
  };
}
