/**
 * QuestionPhase
 *
 * Router component for the question round.
 * Forwards to the matching mode component depending on the active game mode.
 */
'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameMode } from '@/config/game-config';
import type { PhomuSong } from '@/types/song';
import { SurvivorMode } from './modes/SurvivorMode';
import { VibeCheckMode } from './modes/VibeCheckMode';
import { HintMasterMode } from './modes/HintMasterMode';
import { TimelineMode } from './modes/TimelineMode';
import { LyricsMode } from './modes/LyricsMode';
import { CoverConfusionMode } from './modes/CoverConfusionMode';

// ─── Props ────────────────────────────────────────────────────────

interface QuestionPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  /** Called when the player is done: isCorrect + points */
  onAnswered: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  /** Called when everyone is ready for the reveal */
  onReveal: () => void;
  /** Called when the video is broken or should be re-rolled */
  onReroll?: () => void;
}

/** Modes in which the "everyone done → reveal" button is shown */
const MODES_WITH_REVEAL_BUTTON: GameMode[] = [
  'survivor',
  'vibe-check',
  'hint-master',
  'timeline',
  // lyrics and cover-confusion have their own buttons in the mode
];

// ─── Komponente ───────────────────────────────────────────────────

export function QuestionPhase({
  song,
  currentMode,
  onAnswered,
  onReveal,
  onReroll,
}: QuestionPhaseProps) {
  const { t } = useTranslation();

  const handleAnswered = useCallback(
    (isCorrect: boolean, points: number, answeredInSeconds?: number) => {
      onAnswered(isCorrect, points, answeredInSeconds);
    },
    [onAnswered]
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
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
        <TimelineMode
          song={song}
          onAnswer={handleAnswered}
          onReveal={onReveal}
        />
      )}

      {currentMode === 'lyrics' && (
        <LyricsMode song={song} onAnswer={handleAnswered} onReveal={onReveal} />
      )}

      {currentMode === 'cover-confusion' && (
        <CoverConfusionMode
          song={song}
          onAnswer={handleAnswered}
          onReveal={onReveal}
        />
      )}

      {/** Everyone-done button → reveal for all modes */}
      {MODES_WITH_REVEAL_BUTTON.includes(currentMode) && (
        <motion.div
          className="flex justify-center mt-6"
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
            {t('game.question.allDoneReveal')}
          </button>
        </motion.div>
      )}

      {/* Reroll Button (Subtil) */}
      {onReroll && (
        <button
          onClick={onReroll}
          className="mt-12 mb-8 px-5 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 hover:bg-white/5 hover:border-white/20 transition-all min-h-[44px]"
        >
          {t('game.question.reroll')}
        </button>
      )}
    </div>
  );
}
