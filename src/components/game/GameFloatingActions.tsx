/**
 * The floating actions of the game.
 *
 * WHAT: the compact bottom bar for points, round continuation and settings.
 *
 * CSS keeps it visible on portrait and compact landscape screens. Wider
 * landscape screens use the side panel and the reveal's own action instead.
 */
'use client';

import { useTranslation } from 'react-i18next';

// ─── Props ────────────────────────────────────────────────────────

interface GameFloatingActionsProps {
  /** Opens the scoreboard. */
  onShowScoreboard: () => void;
  /** Opens the in-game settings. */
  onShowSettings: () => void;
  /** Continues a revealed round; absent while answering or showing a winner. */
  onNextRound?: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameFloatingActions({
  onShowScoreboard,
  onShowSettings,
  onNextRound,
}: GameFloatingActionsProps) {
  const { t } = useTranslation();

  return (
    <nav className="game-utilities">
      {/* Scoreboard toggle button */}
      <button
        onClick={onShowScoreboard}
        className=" px-4 py-2 min-h-[44px] rounded-full text-sm font-bold
                   shadow-lg transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        aria-label={t('game.page.showScoreboardAria')}
      >
        {t('game.page.pointsButton')}
      </button>

      {onNextRound && (
        <button
          onClick={onNextRound}
          data-testid="next-round"
          className="game-continue-action flex-1 min-w-0 px-3 py-2 min-h-[44px] rounded-full font-black shadow-lg transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          {t('game.page.continueButton')}
        </button>
      )}

      {/* In-game settings (reachable at any time) */}
      <button
        onClick={onShowSettings}
        className=" px-4 py-2 min-h-[44px] rounded-full text-sm font-bold shadow-lg transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        aria-label={t('game.page.openSettingsAria')}
      >
        {t('game.page.settingsButton')}
      </button>
    </nav>
  );
}
