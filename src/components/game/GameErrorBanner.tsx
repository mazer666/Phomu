/**
 * GameErrorBanner
 *
 * WHAT: the message of the last failure of the game. It names the failure,
 * tells the player what to do, and can be dismissed.
 *
 * WHY the banner reads the store itself: the failure is a state of the
 * session, and the screen shows the state. A component that took the
 * failure as a prop would need every caller to know the state.
 *
 * WHY a `role="alert"`: a screen reader announces a region with that role
 * as soon as it appears. The player hears the failure instead of hunting
 * for it.
 *
 * WHY no technical text: the failure of the core is a stack trace and a
 * file path. It belongs in the console, where the developer reads it. The
 * player gets a sentence he can act on.
 *
 * EXAMPLE: the core refuses to draw a card — the banner shows
 * "Die nächste Karte konnte nicht gezogen werden." and offers a reload.
 */
'use client';

import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { GAME_ERROR_KEYS, isGameErrorKey } from '@/stores/game-store-errors';

// ─── Props ────────────────────────────────────────────────────────

interface GameErrorBannerProps {
  /**
   * Reloads the game — the way out the banner offers.
   *
   * WHY a prop: the default reloads the page, and a test needs a spy that
   * does not touch the browser.
   */
  onReload?: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameErrorBanner({ onReload }: GameErrorBannerProps) {
  const { t } = useTranslation();
  const error = useGameStore((state) => state.error);
  const errorValues = useGameStore((state) => state.errorValues);
  const clearError = useGameStore((state) => state.clearError);

  // No failure — nothing to show.
  if (!error) return null;

  // WHY the check: the state holds a string. A string that names no known
  // failure would be shown as it is — the player would read a key instead
  // of a sentence.
  const key = isGameErrorKey(error) ? error : GAME_ERROR_KEYS.generic;
  const message = t(key, { ...(errorValues ?? {}) });

  return (
    <div
      role="alert"
      data-testid="game-error-banner"
      className="sticky top-0 z-40 mx-3 mt-3 flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-lg sm:flex-row sm:items-start"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-error)',
        color: 'var(--color-text)',
      }}
    >
      {/* The sign of the failure — decorative, the text carries the meaning */}
      <span aria-hidden="true" className="text-2xl leading-none">
        ⚠️
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-lg font-black">{t('game.error.title')}</p>
        <p className="mt-1 text-base">{message}</p>
        <p className="mt-2 text-sm opacity-80">{t('game.error.advice')}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          data-testid="game-error-reload"
          onClick={() => (onReload ?? (() => window.location.reload()))()}
          className="min-h-[44px] rounded-xl border-2 px-4 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          style={{
            borderColor: 'var(--color-primary)',
            color: 'var(--color-text)',
          }}
        >
          {t('game.error.reload')}
        </button>

        <button
          type="button"
          data-testid="game-error-dismiss"
          onClick={() => clearError()}
          aria-label={t('game.error.dismiss')}
          className="min-h-[44px] min-w-[44px] rounded-xl text-lg transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
