/**
 * Game-Over-Seite — Gewinner-Screen
 *
 * Zeigt das Endergebnis mit Podest (Platz 1–3) und vollständiger Tabelle.
 * Optionen: "Nochmal spielen" (Lobby behalten) oder "Neu starten" (alles reset).
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';

// ─── Podest-Konfiguration ─────────────────────────────────────────

const PODEST_CONFIG = [
  { rank: 1, icon: '🥇', heightClass: 'h-24', order: 1 },
  { rank: 2, icon: '🥈', heightClass: 'h-16', order: 0 },
  { rank: 3, icon: '🥉', heightClass: 'h-12', order: 2 },
] as const;

// ─── Seite ────────────────────────────────────────────────────────

export default function GameOverPage() {
  const router = useRouter();
  const {
    players,
    winnerId,
    currentRound,
    totalXP,
    initSession,
    startGame,
    resetScores
  } = useGameStore();

  const sessionXP = players.reduce((sum, p) => sum + p.score, 0);
  const previousTotalXP = totalXP - sessionXP;

  // Level-Berechnung
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const previousLevel = Math.floor(previousTotalXP / 100) + 1;
  const didLevelUp = currentLevel > previousLevel;

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-8 pb-24 overflow-x-hidden">
      {/* Konfetti-Gefühl / Gewinner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-8"
      >
        <div className="relative inline-block">
          <span className="text-8xl select-none">🏆</span>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-4 border-dashed border-[var(--color-accent)] rounded-full opacity-20 scale-150"
          />
        </div>
        <h1 className="text-4xl font-black mt-6" style={{ color: 'var(--color-secondary)' }}>
          {winner?.name} gewinnt!
        </h1>
        <p className="opacity-40 font-bold uppercase tracking-tighter text-xs mt-1">
          {currentRound - 1} Runden gerockt • {sessionXP} XP verdient
        </p>
      </motion.div>

      {/* NEU: XP / Progression Fortschrittsbalken */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm bg-white/5 p-6 rounded-3xl border border-white/10 mb-8 space-y-4"
      >
        <div className="flex justify-between items-end">
          <h2 className="text-xs font-black uppercase opacity-60">Level {currentLevel}</h2>
          <p className="text-2xl font-black font-mono">+{sessionXP} XP</p>
        </div>
        
        <div className="h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden">
          <motion.div 
            initial={{ width: `${(previousTotalXP % 100)}%` }}
            animate={{ width: `${(totalXP % 100)}%` }}
            className="h-full bg-[var(--color-accent)] shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.5)]"
          />
        </div>

        {/* Level Up / Unlock Alert */}
        <AnimatePresence>
          {didLevelUp && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-[var(--color-accent)]/20 p-3 rounded-xl border border-[var(--color-accent)]/30 text-center"
            >
              <p className="text-[var(--color-accent)] font-black text-xs uppercase animate-bounce">
                🎉 LEVEL UP! NEUE PACKS FREIGESCHALTET! 🎉
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Podest (Zusammengefasst) */}
      <div className="flex items-end gap-3 mb-10 w-full max-w-xs h-40">
        {PODEST_CONFIG.map(({ rank, icon, heightClass, order }) => {
          const p = sorted[rank - 1];
          if (!p) return null;
          return (
            <motion.div
              key={rank}
              style={{ order }}
              initial={{ height: 0 }}
              animate={{ height: heightClass.includes('24') ? '100px' : heightClass.includes('16') ? '70px' : '50px' }}
              className="flex-1 bg-white/5 rounded-t-2xl border-2 border-white/10 flex flex-col items-center justify-center relative pt-4"
            >
              <span className="absolute -top-6 text-2xl" aria-hidden>{icon}</span>
              <span className="text-2xl mb-1">{p.avatar}</span>
              <p className="text-[10px] font-black uppercase text-center px-1 truncate w-full" style={{ color: p.color }}>{p.name}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Aktions-Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={() => {
            resetScores();
            startGame();
            router.push('/game');
          }}
          className="w-full py-5 rounded-3xl text-2xl font-black bg-[var(--color-accent)] text-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--color-accent)]/20"
        >
          🔄 NOCHMAL SPIELEN
        </button>

        <button
          onClick={() => {
            initSession();
            router.push('/lobby');
          }}
          className="w-full py-4 rounded-3xl text-sm font-black border border-white/10 hover:bg-white/5 transition-all"
        >
          NEUE LOBBY STARTEN
        </button>

        <button
          onClick={() => router.push('/')}
          className="text-[10px] uppercase font-black opacity-30 hover:opacity-100 transition-opacity text-center mt-4 tracking-widest"
        >
          Zurück zum Hauptmenü
        </button>
      </div>
    </main>
  );
}
