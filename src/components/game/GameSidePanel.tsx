/**
 * The side column of the game in the landscape.
 *
 * WHAT: the column that stands next to the phase of the round in the
 * landscape — the players with their points and the in-game settings.
 *
 * WHY the scoreboard stands next to the phase: the landscape has twice the
 * width and half the height. As an overlay the scoreboard covers the phase
 * of the round; as a column it is readable at any time and the round stays
 * visible.
 *
 * WHY the settings are a disclosure: the floating button of the settings is
 * not needed in the landscape, but the settings themselves have to stay
 * reachable — with the keyboard as well. A native `<details>` is operable
 * with the keyboard without any script.
 */
'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, Team, TeamMode } from '@/types/player';
import { InGameSettingsContent } from './InGameSettingsContent';
import { ScoreboardList } from './ScoreboardList';

// ─── Props ────────────────────────────────────────────────────────

interface GameSidePanelProps {
  /** The players of the session. */
  players: Player[];
  /** The teams of the session. */
  teams: Team[];
  /** How the teams are organized. */
  teamMode: TeamMode;
  /** The points that win the game. */
  winCondition: number;
  /** Leaves the party and returns to the lobby. */
  onLeaveParty: () => void;
  /** Opens the full settings of the shell. */
  onOpenFullSettings: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameSidePanel({
  players,
  teams,
  teamMode,
  winCondition,
  onLeaveParty,
  onOpenFullSettings,
}: GameSidePanelProps) {
  const { t } = useTranslation();
  const settingsRef = useRef<HTMLDetailsElement>(null);

  return (
    <aside
      className="w-80 shrink-0 flex flex-col overflow-y-auto border-l"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
      aria-label={t('game.scoreboard.title')}
      data-testid="game-side-panel"
    >
      <h2
        className="text-lg font-black px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {t('game.scoreboard.title')}
      </h2>

      <ScoreboardList
        players={players}
        teams={teams}
        teamMode={teamMode}
        winCondition={winCondition}
      />

      <div
        className="px-5 py-3 text-xs opacity-50 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {t('game.scoreboard.winCondition', { count: winCondition })}
      </div>

      {/* The in-game settings: a disclosure that the keyboard operates as well */}
      <details
        ref={settingsRef}
        className="border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <summary className="px-5 py-4 min-h-[44px] flex items-center text-sm font-black uppercase tracking-wider cursor-pointer opacity-80 hover:opacity-100">
          {t('game.settings.title')}
        </summary>
        <div className="px-4 pb-5">
          <InGameSettingsContent
            onClose={() => settingsRef.current?.removeAttribute('open')}
            onLeaveParty={onLeaveParty}
            onOpenFullSettings={onOpenFullSettings}
          />
        </div>
      </details>
    </aside>
  );
}
