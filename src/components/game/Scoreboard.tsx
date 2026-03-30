/**
 * Scoreboard
 *
 * Zeigt alle Spieler mit ihrem aktuellen Score, sortiert nach Punkten.
 * Wird als seitlicher Overlay oder Bottom-Sheet eingeblendet.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/types/player';

// ─── Props ────────────────────────────────────────────────────────

interface ScoreboardProps {
  players: Player[];
  winCondition: number;
  /** Wenn true, wird das Scoreboard als Modal-Overlay gezeigt */
  isOpen: boolean;
  onClose: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function Scoreboard({ players, winCondition, isOpen, onClose }: ScoreboardProps) {
  // Spieler nach Score sortieren (höchster zuerst)
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Hintergrund-Overlay zum Schließen */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Scoreboard-Panel */}
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
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-black">🏆 Punktestand</h2>
              <button
                onClick={onClose}
                className="opacity-60 hover:opacity-100 transition-opacity text-lg"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            {/* Spielerliste */}
            <ol className="flex-1 overflow-y-auto p-4 space-y-2">
              {sorted.map((player, index) => {
                const progressPct = Math.min((player.score / winCondition) * 100, 100);
                const isLeading = index === 0 && player.score > 0;

                return (
                  <li key={player.id}>
                    <div className="flex items-center gap-3 mb-1">
                      {/* Rang-Nummer */}
                      <span
                        className="text-sm font-black w-5 text-center shrink-0 opacity-60"
                      >
                        {index + 1}.
                      </span>

                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                        style={{
                          backgroundColor: player.color ? `${player.color}33` : 'rgba(255,255,255,0.15)',
                        }}
                        aria-hidden
                      >
                        {player.avatar ?? '🎵'}
                      </div>

                      {/* Name + Score */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="font-bold text-sm truncate"
                            style={{ color: player.color ?? 'var(--color-text)' }}
                          >
                            {isLeading && '👑 '}
                            {player.name}
                          </span>
                          <span className="font-black text-sm shrink-0">
                            {player.score}
                          </span>
                        </div>

                        {/* Fortschrittsbalken zum Gewinnscore */}
                        <div
                          className="h-1.5 rounded-full mt-1 overflow-hidden"
                          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: player.color ?? 'var(--color-accent)' }}
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

            {/* Gewinnscore-Anzeige */}
            <div
              className="px-5 py-3 text-xs opacity-50 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Gewinnscore: {winCondition} Punkte
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
