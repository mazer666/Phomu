/**
 * The list of the players with their points.
 *
 * WHAT: the list of the players or of the teams, sorted by their points,
 * with the progress towards the win condition.
 *
 * WHY the list is a component of its own: the scoreboard is an overlay in
 * the portrait and a permanent column in the landscape. Both draw the same
 * list — only the frame around it differs. Without a component of its own
 * the list would be written twice and the two would drift apart.
 *
 * WHY the list does not scroll: the frame around it scrolls (the overlay
 * and the side column of the landscape), so the list stays a pure list.
 */
'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, Team, TeamMode } from '@/types/player';

// ─── Props ────────────────────────────────────────────────────────

interface ScoreboardListProps {
  /** The players of the session. */
  players: Player[];
  /** The teams of the session — empty in the individual mode. */
  teams?: Team[];
  /** How the teams are organized. */
  teamMode?: TeamMode;
  /** The points that win the game. */
  winCondition: number;
}

// ─── Komponente ───────────────────────────────────────────────────

export function ScoreboardList({
  players,
  teams = [],
  teamMode = 'individual',
  winCondition,
}: ScoreboardListProps) {
  const { i18n } = useTranslation();
  const isTeamMode = teamMode !== 'individual' && teams.length > 0;

  // Number formatting always with the active locale (Intl, no toLocaleString without a locale)
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  // Sort players or teams by score (highest first)
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <ol className="space-y-2 p-4">
      {isTeamMode
        ? // ── Team-Modus ──────────────────────────────
          sortedTeams.map((team, index) => {
            const progressPct = Math.min(
              (team.score / winCondition) * 100,
              100
            );
            const isLeading = index === 0 && team.score > 0;
            const memberNames = players
              .filter((p) => p.teamId === team.id)
              .map((p) => p.name)
              .join(', ');

            return (
              <li key={team.id}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black w-5 text-center shrink-0 opacity-60">
                    {numberFormatter.format(index + 1)}.
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: `${team.color}33` }}
                    aria-hidden
                  >
                    {isLeading ? '👑' : '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: team.color }}
                      >
                        {isLeading && '👑 '}
                        {team.name}
                      </span>
                      <span className="font-black text-sm shrink-0">
                        {numberFormatter.format(team.score)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full mt-1 overflow-hidden"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: team.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    {memberNames && (
                      <p className="text-[10px] opacity-40 mt-1 truncate">
                        {memberNames}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })
        : // ── Einzelspieler-Modus ─────────────────────
          sorted.map((player, index) => {
            const progressPct = Math.min(
              (player.score / winCondition) * 100,
              100
            );
            const isLeading = index === 0 && player.score > 0;

            return (
              <li key={player.id}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black w-5 text-center shrink-0 opacity-60">
                    {numberFormatter.format(index + 1)}.
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor: player.color
                        ? `${player.color}33`
                        : 'rgba(255,255,255,0.15)',
                    }}
                    aria-hidden
                  >
                    {player.avatar ?? '🎵'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-bold text-sm truncate"
                        style={{
                          color: player.color ?? 'var(--color-text)',
                        }}
                      >
                        {isLeading && '👑 '}
                        {player.name}
                      </span>
                      <span className="font-black text-sm shrink-0">
                        {numberFormatter.format(player.score)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full mt-1 overflow-hidden"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            player.color ?? 'var(--color-accent)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
    </ol>
  );
}
