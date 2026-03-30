/**
 * Game-Over-Seite — Gewinner-Screen
 *
 * Zeigt das Endergebnis mit Podest (Platz 1–3) und vollständiger Tabelle.
 * Optionen: "Nochmal spielen" (Lobby behalten) oder "Neu starten" (alles reset).
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';

// ─── Podest-Konfiguration ─────────────────────────────────────────

const PODEST_CONFIG = [
  { rank: 1, icon: '🥇', sizeClass: 'text-5xl', heightClass: 'h-24', order: 1 },
  { rank: 2, icon: '🥈', sizeClass: 'text-3xl', heightClass: 'h-16', order: 0 },
  { rank: 3, icon: '🥉', sizeClass: 'text-2xl', heightClass: 'h-12', order: 2 },
] as const;

// ─── Seite ────────────────────────────────────────────────────────

export default function GameOverPage() {
  const router = useRouter();
  const { players, config, winnerId, currentRound, initSession, startGame, resetScores } = useGameStore();

  // Guard: Kein beendetes Spiel → zur Lobby
  useEffect(() => {
    if (players.length === 0) {
      router.replace('/lobby');
    }
  }, [players.length, router]);

  if (players.length === 0) return null;

  // Spieler nach Score sortieren
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = players.find((p) => p.id === winnerId) ?? sorted[0];

  // Top-3 für Podest
  const podest = PODEST_CONFIG.map((cfg) => ({
    ...cfg,
    player: sorted[cfg.rank - 1],
  })).filter((p) => p.player !== undefined);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-start px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Gewinner-Headline */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center mb-10"
      >
        <p className="text-7xl mb-4 select-none">🏆</p>
        <h1
          className="text-4xl font-black mb-1"
          style={{ color: 'var(--color-secondary)' }}
        >
          {winner?.name} gewinnt!
        </h1>
        <p className="opacity-60">
          Nach {currentRound - 1} {currentRound - 1 === 1 ? 'Runde' : 'Runden'}
        </p>
      </motion.div>

      {/* Podest */}
      {podest.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-end gap-3 mb-10 w-full max-w-xs"
        >
          {[...podest].sort((a, b) => a.order - b.order).map(({ rank, icon, sizeClass, heightClass, player }) => (
            <div
              key={rank}
              className={`flex-1 flex flex-col items-center justify-end rounded-t-xl pt-3 ${heightClass}`}
              style={{
                backgroundColor: player?.color ? `${player.color}22` : 'var(--color-bg-card)',
                border: `2px solid ${player?.color ?? 'var(--color-border)'}`,
              }}
            >
              <span className={`${sizeClass} mb-1 select-none`} aria-hidden>{icon}</span>
              <span className="text-lg" aria-hidden>{player?.avatar ?? '🎵'}</span>
              <p
                className="text-xs font-bold truncate w-full text-center px-1"
                style={{ color: player?.color ?? 'var(--color-text)' }}
              >
                {player?.name}
              </p>
              <p className="text-xs opacity-60 mb-2 font-black">{player?.score} Pkt.</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Vollständige Tabelle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden mb-8"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-4 py-3 border-b text-sm font-bold opacity-60"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Endabrechnung
        </div>
        <ol>
          {sorted.map((player, i) => (
            <li
              key={player.id}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="w-5 text-center opacity-50 text-sm font-bold shrink-0">
                {i + 1}.
              </span>
              <span className="text-lg shrink-0" aria-hidden>{player.avatar ?? '🎵'}</span>
              <span
                className="flex-1 font-bold truncate"
                style={{ color: player.color ?? 'var(--color-text)' }}
              >
                {player.name}
              </span>
              <span className="font-black tabular-nums">{player.score}</span>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* Aktions-Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {/* Nochmal spielen: gleiche Spieler, Scores und Runden-Stand auf 0 */}
        <button
          onClick={() => {
            resetScores();
            startGame();
            router.push('/game');
          }}
          className="w-full py-4 rounded-2xl text-xl font-black hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          🔄 Nochmal spielen
        </button>

        {/* Neu starten: alles zurücksetzen */}
        <button
          onClick={() => {
            initSession();
            router.push('/lobby');
          }}
          className="w-full py-3 rounded-2xl text-base font-bold border opacity-70
                     hover:opacity-100 transition-opacity"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Neue Runde (andere Spieler)
        </button>

        <button
          onClick={() => router.push('/')}
          className="text-sm opacity-40 hover:opacity-60 transition-opacity text-center"
        >
          Zur Startseite
        </button>
      </motion.div>
    </main>
  );
}
