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
import { GameActionSlot } from './GameAction';

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

      <GameActionSlot />

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
