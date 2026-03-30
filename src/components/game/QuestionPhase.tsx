/**
 * QuestionPhase
 *
 * Router-Komponente für die Fragerunde.
 * Leitet je nach aktivem Spielmodus an die passende Modus-Komponente weiter.
 */
'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GameMode } from '@/config/game-config';
import type { PhomuSong } from '@/types/song';
import { SurvivorMode } from './modes/SurvivorMode';
import { VibeCheckMode } from './modes/VibeCheckMode';
import { HintMasterMode } from './modes/HintMasterMode';
import { TimelineMode } from './modes/TimelineMode';
import { LyricsMode } from './modes/LyricsMode';

// ─── Props ────────────────────────────────────────────────────────

interface QuestionPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  /** Wird aufgerufen, wenn der Spieler fertig ist: isCorrect + Punkte */
  onAnswered: (isCorrect: boolean, pointsAwarded: number) => void;
  /** Wird aufgerufen, wenn alle bereit sind zum Reveal */
  onReveal: () => void;
}

/** Modi, bei denen der "Alle fertig → Reveal"-Button angezeigt wird */
const MODES_WITH_REVEAL_BUTTON: GameMode[] = [
  'survivor',
  'vibe-check',
  'hint-master',
  'timeline',
  'lyrics',
];

// ─── Komponente ───────────────────────────────────────────────────

export function QuestionPhase({
  song,
  currentMode,
  onAnswered,
  onReveal,
}: QuestionPhaseProps) {
  const handleAnswered = useCallback(
    (isCorrect: boolean, points: number) => {
      onAnswered(isCorrect, points);
    },
    [onAnswered],
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Modus-spezifischer Inhalt */}
      {currentMode === 'survivor' && (
        <SurvivorMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'vibe-check' && (
        <VibeCheckMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'hint-master' && (
        <HintMasterMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'timeline' && (
        <TimelineMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'lyrics' && (
        <LyricsMode song={song} onAnswer={handleAnswered} />
      )}

      {/* Alle-fertig-Button → Reveal für alle Modi */}
      {MODES_WITH_REVEAL_BUTTON.includes(currentMode) && (
        <motion.div
          className="flex justify-center mt-6 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={onReveal}
            className="px-8 py-3 rounded-xl font-bold border opacity-70 hover:opacity-100
                       transition-opacity text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Alle fertig → Reveal
          </button>
        </motion.div>
      )}
    </div>
  );
}
