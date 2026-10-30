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
import { useOrientation } from '@/hooks/useOrientation';
import type { GameMode } from '@/config/game-config';
import type { RoundQuestion } from '@/core/types';
import { SurvivorMode } from './modes/SurvivorMode';
import { VibeCheckMode } from './modes/VibeCheckMode';
import { HintMasterMode } from './modes/HintMasterMode';
import { TimelineMode } from './modes/TimelineMode';
import { LyricsMode } from './modes/LyricsMode';
import { CoverConfusionMode } from './modes/CoverConfusionMode';

// ─── Props ────────────────────────────────────────────────────────

interface QuestionPhaseProps {
  /**
   * The question of the round.
   *
   * WHY a question and not a song: the question view model of the core has
   * no field for the solution. The phase therefore cannot show the title,
   * the artist or the year of the song — it does not have them
   * (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
   */
  question: RoundQuestion;
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

/**
 * Modes in which the "everyone done → reveal" button is shown.
 *
 * WHY the timeline is not on the list: the mode has its own button, and it
 * sends the answer of the player to the base before it releases the
 * solution. The generic button would release the solution without the
 * answer — the round would be judged without a judgement, and the slot
 * would show a wrong placement and the year `0`.
 */
const MODES_WITH_REVEAL_BUTTON: GameMode[] = [
  'survivor',
  'vibe-check',
  'hint-master',
  // lyrics and cover-confusion have their own buttons in the mode
  // timeline has its own button as well — it has to send the answer first
];

// ─── Komponente ───────────────────────────────────────────────────

export function QuestionPhase({
  question,
  currentMode,
  onAnswered,
  onReveal,
  onReroll,
}: QuestionPhaseProps) {
  const { t } = useTranslation();
  // WHY the orientation: the landscape gives the mode the whole width of
  // the phase column — the timeline runs from left to right there.
  const { isLandscape } = useOrientation();

  const handleAnswered = useCallback(
    (isCorrect: boolean, points: number, answeredInSeconds?: number) => {
      onAnswered(isCorrect, points, answeredInSeconds);
    },
    [onAnswered]
  );

  return (
    <div
      className={[
        'w-full mx-auto flex flex-col items-center',
        isLandscape ? 'max-w-none' : 'max-w-2xl',
      ].join(' ')}
    >
      {/* Modus-spezifischer Inhalt */}
      {currentMode === 'survivor' && (
        <SurvivorMode question={question} onAnswer={handleAnswered} />
      )}

      {currentMode === 'vibe-check' && (
        <VibeCheckMode question={question} onAnswer={handleAnswered} />
      )}

      {currentMode === 'hint-master' && (
        <HintMasterMode question={question} onAnswer={handleAnswered} />
      )}

      {currentMode === 'timeline' && (
        <TimelineMode
          question={question}
          onAnswer={handleAnswered}
          onReveal={onReveal}
        />
      )}

      {currentMode === 'lyrics' && (
        <LyricsMode
          question={question}
          onAnswer={handleAnswered}
          onReveal={onReveal}
        />
      )}

      {currentMode === 'cover-confusion' && (
        <CoverConfusionMode
          question={question}
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
