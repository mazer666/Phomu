/**
 * RevealPhase
 *
 * Zeigt den aufgedeckten Song mit allen Infos.
 * Fasst Punkte zusammen, die in der Fragerunde vergeben wurden.
 * Pilot kann die nächste Runde starten oder das Spiel beenden.
 */
'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { PhomuSong } from '@/types/song';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player } from '@/types/player';
import type { GameMode } from '@/config/game-config';
// ─── Props ────────────────────────────────────────────────────────

interface RevealPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  answers: PlayerAnswer[];
  players: Player[];
  winCondition: number;
  onNextRound: () => void;
  onEndGame: () => void;
  onOverrideCorrect?: () => void;
  onOverrideRedraw?: () => void;
  overrideGovernance?: 'host' | 'co-host' | 'majority';
}

// ─── Hilfs-Badge für Schwierigkeit ───────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   'var(--color-success)',
  medium: 'var(--color-secondary)',
  hard:   'var(--color-error)',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   'Leicht',
  medium: 'Mittel',
  hard:   'Schwer',
};

// ─── Komponente ───────────────────────────────────────────────────

export function RevealPhase({
  song,
  currentMode,
  answers,
  players,
  winCondition,
  onNextRound,
  onEndGame,
  onOverrideCorrect,
  onOverrideRedraw,
  overrideGovernance = 'host',
}: RevealPhaseProps) {

  const [showPowerMenu, setShowPowerMenu] = useState(false);

  // Prüfen ob irgendein Spieler den Gewinnscore erreicht hat
  const winner = players.find((p) => p.score >= winCondition);

  // Punkte-Zusammenfassung
  const scoringRows = answers
    .filter((a) => a.pointsAwarded > 0)
    .map((a) => {
      const player = players.find((p) => p.id === a.playerId);
      return { player, points: a.pointsAwarded };
    })
    .filter((r): r is { player: Player; points: number } => r.player !== undefined);

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

      {/* Mode-Specific Reveal Info (NEW Phase 5) */}
      {currentMode === 'lyrics' && song.lyrics && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3"
        >
          <p className="text-[10px] font-black uppercase opacity-40 text-center tracking-widest">Die gefälschte Zeile war</p>
          <p className="text-sm font-mono text-center italic text-red-400">
            &ldquo;{song.lyrics.fake}&rdquo;
          </p>
          <div className="pt-2 flex justify-center">
             <span className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black rounded-full border border-green-500/20">
               DIE ANDEREN 3 WAREN ECHT
             </span>
          </div>
        </motion.div>
      )}

      {currentMode === 'cover-confusion' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-5 rounded-3xl text-center space-y-2"
        >
          <p className="text-[10px] font-black uppercase opacity-60">Original von</p>
          <p className="text-2xl font-black text-[var(--color-accent)]">{song.artist}</p>
          <p className="text-[10px] opacity-40 italic">Gehört haben wir eine Cover-Version</p>
        </motion.div>
      )}

      {/* Song-Karte */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-2xl p-6 text-center"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '2px solid var(--color-accent)',
        }}
      >
        {/* Aufgedeckt-Badge */}
        <p className="text-xs uppercase tracking-widest opacity-50 mb-4">🎵 Aufgedeckt!</p>

        {/* Titel + Artist */}
        <h2 className="text-4xl font-black leading-tight mb-1">{song.title}</h2>
        <p className="text-xl opacity-80 mb-4">{song.artist}</p>

        {/* Metadaten-Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Badge>{song.year}</Badge>
          <Badge>{song.genre}</Badge>
          <Badge
            style={{
              backgroundColor: DIFFICULTY_COLORS[song.difficulty] + '33',
              color: DIFFICULTY_COLORS[song.difficulty],
              borderColor: DIFFICULTY_COLORS[song.difficulty],
            }}
          >
            {DIFFICULTY_LABELS[song.difficulty] ?? song.difficulty}
          </Badge>
          <Badge>{song.country}</Badge>
        </div>

        {/* Stimmungen */}
        <div className="flex flex-wrap justify-center gap-1">
          {song.mood.map((m) => (
            <span key={m} className="text-xs opacity-60 px-2 py-0.5 rounded-full bg-white/10">
              {m}
            </span>
          ))}
        </div>

        {/* Kein eigener Player – Musik läuft weiter vom Question-Screen */}
      </motion.div>

      {/* Punkte-Zusammenfassung */}
      {scoringRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm font-bold opacity-70 mb-3">Punkte diese Runde</p>
          <div className="space-y-2">
            {scoringRows.map(({ player, points }) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>{player.avatar ?? '🎵'}</span>
                <span className="flex-1 font-semibold text-sm" style={{ color: player.color }}>
                  {player.name}
                </span>
                <span
                  className="font-black text-sm"
                  style={{ color: 'var(--color-success)' }}
                >
                  +{points}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hinweis bei One-Hit-Wonder */}
      {song.isOneHitWonder && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm opacity-60"
        >
          ⭐ {song.artist} ist ein One-Hit-Wonder!
        </motion.p>
      )}

      {/* Verstecktes Power-User Menü (nur Ausnahmefälle) */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowPowerMenu((v) => !v)}
          className="text-[10px] opacity-20 hover:opacity-60 transition-opacity px-2 py-1"
          aria-label="Power Actions"
          title="Power Actions"
        >
          ⋯
        </button>
      </div>

      {showPowerMenu && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider opacity-60">
            Power User · Governance: {overrideGovernance}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onOverrideCorrect?.();
                setShowPowerMenu(false);
              }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              ✅ Antwort trotzdem korrekt werten
            </button>
            <button
              onClick={() => {
                onOverrideRedraw?.();
                setShowPowerMenu(false);
              }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              🔄 Runde verwerfen & neue Frage
            </button>
          </div>
        </div>
      )}

      {/* Aktions-Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-2"
      >
        {winner ? (
          <>
            <p
              className="text-center font-black text-2xl"
              style={{ color: 'var(--color-secondary)' }}
            >
              🏆 {winner.name} hat gewonnen!
            </p>
            <button
              onClick={onEndGame}
              className="w-full py-4 rounded-2xl text-xl font-black shadow-lg"
              style={{ backgroundColor: 'var(--color-secondary)', color: '#000' }}
            >
              Zum Gewinner-Screen!
            </button>
          </>
        ) : (
          <button
            onClick={onNextRound}
            className="w-full py-4 rounded-2xl text-xl font-black shadow-lg
                       hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Nächste Runde →
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ─── Badge-Hilfskomponente ────────────────────────────────────────

function Badge({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full border font-semibold"
      style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'var(--color-border)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
