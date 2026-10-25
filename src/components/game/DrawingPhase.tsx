/**
 * DrawingPhase
 *
 * Die "Karte-Ziehen"-Phase am Beginn jeder Runde.
 * Zeigt den aktiven Spielmodus und einen großen Button,
 * der eine zufällige Spielkarte (Song) zieht und die Runde startet.
 */
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import type { GameMode } from '@/config/game-config';
import type { PhomuSong } from '@/types/song';
import { pickRandomSong } from '@/utils/song-picker';

// ─── Juicy Text-Varianten ─────────────────────────────────────────

const DRAW_BUTTON_LABELS = [
  '🃏 Karte ziehen',
  '🎴 Karte auf den Tisch!',
  '🎲 Schicksal herausfordern',
  '🎵 Song aufdecken',
  '🔮 Was kommt als nächstes?',
  '💥 Los geht\'s!',
  '🎯 Ran an die Karte',
  '🤞 Drück das Glück',
];

const PILOT_LABELS = [
  (name: string) => `🎮 ${name} ist am Zug`,
  (name: string) => `🎯 ${name}, du bist dran!`,
  (name: string) => `🎤 Vorhang auf für ${name}!`,
  (name: string) => `👑 ${name} übernimmt das Steuer`,
  (name: string) => `🚀 ${name} — jetzt oder nie`,
  (name: string) => `🃏 ${name} zieht die Karte`,
];

// ─── Modus-Metadaten ──────────────────────────────────────────────

const MODE_META: Record<GameMode, { icon: string; title: string; instruction: string }> = {
  timeline: {
    icon: '📅',
    title: 'Chronologische Timeline',
    instruction: 'Ordne die Karte an der richtigen Stelle in deiner Zeitlinie ein!',
  },
  'hint-master': {
    icon: '🕵️',
    title: 'Hint-Master',
    instruction: 'Erkenne den Song so früh wie möglich — je früher, desto mehr Punkte!',
  },
  lyrics: {
    icon: '📝',
    title: 'Lyrics Labyrinth',
    instruction: 'Welcher Liedtext ist echt? Finde die echten Lyrics!',
  },
  'vibe-check': {
    icon: '😎',
    title: 'Vibe-Check',
    instruction: 'Welche Stimmung passt zu diesem Song? Einigt euch!',
  },
  survivor: {
    icon: '🏆',
    title: 'Survivor',
    instruction: 'One-Hit-Wonder oder Dauerstar? Was glaubst du?',
  },
  'cover-confusion': {
    icon: '🖼️',
    title: 'Cover Confusion',
    instruction: 'Welches Cover passt zu diesem Song? Finde es heraus!',
  },
};


function deterministicIndex(seed: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

// ─── Props ────────────────────────────────────────────────────────

interface DrawingPhaseProps {
  currentMode: GameMode;
  playedSongIds: string[];
  pilotName?: string;
  pilotColor?: string;
  nextPilotName?: string;
  nextPilotColor?: string;
  /** Wird aufgerufen, wenn eine Karte gezogen wurde */
  onCardDrawn: (song: PhomuSong) => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function DrawingPhase({
  currentMode,
  playedSongIds,
  pilotName,
  pilotColor,
  nextPilotName,
  nextPilotColor,
  onCardDrawn,
}: DrawingPhaseProps) {
  const meta = MODE_META[currentMode];
  const { autoDrawIntent, config } = useGameStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState('');

  const drawLabel = useMemo(() => {
    const seed = `${currentMode}:${playedSongIds.length}`;
    return DRAW_BUTTON_LABELS[deterministicIndex(seed, DRAW_BUTTON_LABELS.length)]!;
  }, [currentMode, playedSongIds.length]);

  const pilotLabel = useMemo(() => {
    const seed = `${pilotName ?? 'pilot'}:${currentMode}`;
    return PILOT_LABELS[deterministicIndex(seed, PILOT_LABELS.length)]!;
  }, [pilotName, currentMode]);

  const handleDraw = useCallback(() => {
    if (isDrawing) return;
    setIsDrawing(true);
    setError('');

    const song = pickRandomSong({
      playedIds: playedSongIds,
      selectedPacks: config.selectedPacks,
      difficulty: config.difficulty,
      onlyQRCompatible: config.onlyQRCompatible,
      currentMode: currentMode
    });
    if (!song) {
      setError('Keine Songs verfügbar. Bitte prüfe dein Song-Pack.');
      setIsDrawing(false);
      return;
    }

    // Kurze Delay für Animation, dann Song an Parent übergeben
    setTimeout(() => {
      onCardDrawn(song);
      setIsDrawing(false);
    }, 600);
  }, [isDrawing, playedSongIds, onCardDrawn, config, currentMode]);

  // AUTO-DRAW: Wenn wir nach einem Skip hier ankommen, automatisch ziehen
  useEffect(() => {
    if (!autoDrawIntent || isDrawing) return;

    const timer = setTimeout(() => {
      handleDraw();
    }, 0);

    return () => clearTimeout(timer);
  }, [autoDrawIntent, isDrawing, handleDraw]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">

      {/* Modus-Icon mit Puls-Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-8xl mb-6 select-none"
        aria-hidden
      >
        {meta.icon}
      </motion.div>

      {/* Modus-Name */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl font-black mb-3"
      >
        {meta.title}
      </motion.h2>

      {/* Spielanweisung */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-base opacity-70 max-w-sm mb-2"
      >
        {meta.instruction}
      </motion.p>

      {/* Pilot-Info */}
      {pilotName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-1 mb-10"
        >
          <p className="text-sm font-black" style={{ color: pilotColor ?? 'inherit' }}>
            {pilotLabel(pilotName)}
          </p>
          {nextPilotName && (
            <p className="text-xs opacity-40">
              Danach: <span style={{ color: nextPilotColor ?? 'inherit' }}>{nextPilotName}</span>
            </p>
          )}
        </motion.div>
      )}

      {/* Karte-Ziehen-Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <AnimatePresence mode="wait">
          {!isDrawing ? (
            <motion.button
              key="draw"
              onClick={handleDraw}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 rounded-2xl text-xl font-black shadow-xl transition-colors"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-text)',
              }}
            >
              {drawLabel}
            </motion.button>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl"
            >
              🎴
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Fehlermeldung */}
      {error && (
        <p className="mt-4 text-sm" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
