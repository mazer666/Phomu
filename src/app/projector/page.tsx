/**
 * Projector Mode — /projector
 *
 * Spoilerfreie Beamer-Ansicht für große Screens.
 * Zeigt: aktuellen Modus, Spieler-Scoreboard, aktiven Spieler, Timer.
 * Kein Artist, kein Titel, kein Album-Art — nichts das die Frage verrät.
 *
 * Öffne diesen Tab auf dem Beamer während das Spiel auf dem Handy läuft.
 * Beide lesen aus demselben Zustand (localStorage via Zustand persist).
 */
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';

const MODE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  timeline:          { label: 'Timeline',        emoji: '📅', color: '#22d3ee' },
  'hint-master':     { label: 'Hint-Master',     emoji: '🕵️', color: '#c4b5fd' },
  lyrics:            { label: 'Lyrics Labyrinth', emoji: '📝', color: '#fb923c' },
  'vibe-check':      { label: 'Vibe Check',      emoji: '😎', color: '#34d399' },
  survivor:          { label: 'Survivor',         emoji: '💀', color: '#f87171' },
  'cover-confusion': { label: 'Cover Confusion', emoji: '🎭', color: '#e879f9' },
};

export default function ProjectorPage() {
  const {
    players,
    teams,
    currentMode,
    currentRound,
    config,
    roundPhase,
    turnOrder,
    currentTurnIndex,
  } = useGameStore();

  const [tick, setTick] = useState(0);

  // Alle 2 Sekunden neu rendern, damit Punkte-Änderungen vom Handy ankommen
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const modeInfo = MODE_LABELS[currentMode] ?? { label: currentMode, emoji: '🎵', color: '#fff' };

  const isTeamMode = teams.length > 0;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  const activePilot = players.find((p) => p.id === turnOrder[currentTurnIndex]);

  const phaseLabel: Record<string, string> = {
    drawing:   'Song wird gezogen …',
    question:  'Frage läuft',
    reveal:    'Auflösung',
    gameover:  'Spiel beendet',
  };

  if (currentRound === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-8 p-12">
        <p className="text-[80px]">🕹️</p>
        <h1 className="text-4xl font-black uppercase tracking-widest opacity-60">Kein Spiel aktiv</h1>
        <p className="text-xl opacity-30 font-bold">Starte ein Spiel in der Lobby, dann erscheint der Projector hier.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-black text-white overflow-hidden"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-12 py-6 border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <span className="text-3xl font-black tracking-tighter opacity-60">PHOMU</span>
          <span className="text-xs font-black uppercase tracking-[0.3em] opacity-20 border border-white/10 px-2 py-1 rounded-lg">
            Projector
          </span>
        </div>

        {/* Modus-Badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border"
            style={{ borderColor: `${modeInfo.color}40`, background: `${modeInfo.color}10` }}
          >
            <span className="text-3xl">{modeInfo.emoji}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Modus</p>
              <p className="text-xl font-black" style={{ color: modeInfo.color }}>{modeInfo.label}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Runde + Phase */}
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Runde</p>
          <p className="text-3xl font-black tabular-nums">
            {currentRound}
            {config.endingCondition === 'rounds' && (
              <span className="text-lg opacity-30"> / {config.targetRounds}</span>
            )}
          </p>
          <p className="text-xs font-bold opacity-30 uppercase tracking-widest mt-0.5">
            {phaseLabel[roundPhase] ?? roundPhase}
          </p>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex gap-0">

        {/* Scoreboard */}
        <section className="flex-1 px-12 py-10 flex flex-col gap-4">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">
            {isTeamMode ? 'Team-Wertung' : 'Spieler-Wertung'}
          </p>

          {isTeamMode ? (
            <div className="space-y-3">
              {sortedTeams.map((team, rank) => (
                <motion.div
                  key={team.id}
                  layout
                  className="flex items-center gap-6 p-5 rounded-2xl"
                  style={{
                    background: rank === 0 ? `${team.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${rank === 0 ? `${team.color}50` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-2xl font-black opacity-20 w-8 text-right tabular-nums">{rank + 1}</span>
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="flex-1 text-2xl font-black">{team.name}</span>
                  <motion.span
                    key={team.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black tabular-nums"
                    style={{ color: rank === 0 ? team.color : 'white' }}
                  >
                    {team.score}
                  </motion.span>
                  <span className="text-sm opacity-30 font-black">Pkt</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.map((player, rank) => (
                <motion.div
                  key={player.id}
                  layout
                  className="flex items-center gap-6 p-5 rounded-2xl"
                  style={{
                    background: rank === 0 ? `${player.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${rank === 0 ? `${player.color}50` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-2xl font-black opacity-20 w-8 text-right tabular-nums">{rank + 1}</span>
                  <span className="text-3xl">{player.avatar ?? '🎵'}</span>
                  <span
                    className="flex-1 text-2xl font-black truncate"
                    style={{ color: player.color }}
                  >
                    {player.name}
                  </span>
                  <motion.span
                    key={player.score}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="text-4xl font-black tabular-nums"
                    style={{ color: rank === 0 ? player.color : 'white' }}
                  >
                    {player.score}
                  </motion.span>
                  <span className="text-sm opacity-30 font-black">Pkt</span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="w-px bg-white/5 my-8" />

        {/* Right Panel: Aktiver Spieler + Spoiler-freie Modus-Info */}
        <section className="w-80 px-8 py-10 flex flex-col gap-8">

          {/* Aktiver Spieler / Pionier */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">Aktueller Pionier</p>
            {activePilot ? (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: activePilot.color, boxShadow: `0 0 20px ${activePilot.color}40` }}
                >
                  {activePilot.avatar ?? '👤'}
                </div>
                <div>
                  <p className="font-black text-lg" style={{ color: activePilot.color }}>
                    {activePilot.name}
                  </p>
                  <p className="text-sm opacity-40 font-bold">{activePilot.score} Punkte</p>
                </div>
              </div>
            ) : (
              <p className="opacity-20 font-bold">—</p>
            )}
          </div>

          {/* Spoiler-freier Platzhalter während Frage */}
          {roundPhase === 'question' && (
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-3xl border p-8 text-center gap-4"
              style={{ borderColor: `${modeInfo.color}30`, background: `${modeInfo.color}08` }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="text-6xl"
              >
                {modeInfo.emoji}
              </motion.div>
              <p className="font-black text-lg uppercase tracking-widest" style={{ color: modeInfo.color }}>
                {modeInfo.label}
              </p>
              <p className="text-sm opacity-40 font-bold">Frage läuft …</p>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: modeInfo.color }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.4 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Win-Condition Progress */}
          {config.endingCondition === 'points' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">Ziel</p>
              <p className="font-black text-2xl">{config.targetPoints} <span className="text-sm opacity-40">Punkte</span></p>
              {/* Fortschrittsbalken: Führender Spieler */}
              {sortedPlayers[0] && (
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: sortedPlayers[0].color }}
                    animate={{ width: `${Math.min(100, (sortedPlayers[0].score / config.targetPoints) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="px-12 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
          phomu.app · Projector View
        </p>
        <p className="text-[10px] opacity-10 tabular-nums">
          sync #{tick}
        </p>
      </footer>
    </div>
  );
}
