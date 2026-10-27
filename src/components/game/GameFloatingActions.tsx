/**
 * The floating actions of the game.
 *
 * WHAT: the two round buttons that float over the game — the points and the
 * in-game settings.
 *
 * WHY they exist only in the portrait: in the landscape the scoreboard is a
 * permanent column and the settings stand in it as well. Both buttons would
 * cover the phase of the round there.
 */
'use client';

import { useTranslation } from 'react-i18next';

// ─── Props ────────────────────────────────────────────────────────

interface GameFloatingActionsProps {
  /** Opens the scoreboard. */
  onShowScoreboard: () => void;
  /** Opens the in-game settings. */
  onShowSettings: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameFloatingActions({
  onShowScoreboard,
  onShowSettings,
}: GameFloatingActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Scoreboard toggle button */}
      <button
        onClick={onShowScoreboard}
        className="fixed bottom-4 right-4 z-30 px-4 py-2 min-h-[44px] rounded-full text-sm font-bold
                   shadow-lg transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        aria-label={t('game.page.showScoreboardAria')}
      >
        {t('game.page.pointsButton')}
      </button>

      {/* In-game settings (reachable at any time) */}
      <button
        onClick={onShowSettings}
        className="fixed bottom-4 left-4 z-30 px-4 py-2 min-h-[44px] rounded-full text-sm font-bold shadow-lg transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        aria-label={t('game.page.openSettingsAria')}
      >
        {t('game.page.settingsButton')}
      </button>
    </>
  );
}
