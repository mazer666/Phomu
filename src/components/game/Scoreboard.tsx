/**
 * Scoreboard
 *
 * Shows all players/teams with their current score, sorted by points.
 * Rendered as a side overlay or bottom sheet.
 *
 * WHY the list is a component of its own: in the landscape the scoreboard
 * stands next to the phase of the round as a permanent column. Both draw
 * the same list — the list lives in `ScoreboardList`.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Player, Team, TeamMode } from '@/types/player';
import { ScoreboardList } from './ScoreboardList';

// ─── Props ────────────────────────────────────────────────────────

interface ScoreboardProps {
  players: Player[];
  teams?: Team[];
  teamMode?: TeamMode;
  winCondition: number;
  /** When true, the scoreboard is shown as a modal overlay */
  isOpen: boolean;
  onClose: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function Scoreboard({
  players,
  teams = [],
  teamMode = 'individual',
  winCondition,
  isOpen,
  onClose,
}: ScoreboardProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/** Background overlay for closing */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/** Scoreboard-Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed right-0 top-0 h-full w-72 z-50 flex flex-col"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderLeft: '1px solid var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-lg font-black">
                {t('game.scoreboard.title')}
              </h2>
              <button
                onClick={onClose}
                className="opacity-60 hover:opacity-100 transition-opacity text-lg min-h-[44px] min-w-[44px]"
                aria-label={t('game.scoreboard.closeAriaLabel')}
              >
                ✕
              </button>
            </div>

            {/* Spieler- / Teamliste */}
            <div className="flex-1 overflow-y-auto">
              <ScoreboardList
                players={players}
                teams={teams}
                teamMode={teamMode}
                winCondition={winCondition}
              />
            </div>

            {/* Gewinnscore-Anzeige */}
            <div
              className="px-5 py-3 text-xs opacity-50 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {t('game.scoreboard.winCondition', { count: winCondition })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
