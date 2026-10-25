/**
 * The phase area of the game page.
 *
 * WHAT: the part of the game screen that shows the phase of the round —
 * the drawing, the question, the reveal and the end of the game.
 *
 * WHY a component of its own: the page of the game holds the state of the
 * session and the handlers of the round. The area that draws the phase is
 * the presentation of that state, and it changes with every phase.
 *
 * WHY the question stays mounted during the reveal: the player of the music
 * is an iframe, and it must not restart when the phase changes. The area
 * therefore hides the question with `display: none` instead of unmounting
 * it.
 */
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { RoundQuestion, RoundReveal } from '@/core/types';
import type { GameMode } from '@/config/game-config';
import type { GameConfig, PlayerAnswer, RoundPhase } from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import { DrawingPhase } from './DrawingPhase';
import { QuestionPhase } from './QuestionPhase';
import { RevealPhase } from './RevealPhase';

/** The animation of the phases. */
const PHASE_VARIANTS = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

interface GamePhaseAreaProps {
  /** The phase of the running round. */
  roundPhase: RoundPhase;
  /** The mode of the running round. */
  currentMode: GameMode;
  /** The question of the running round. */
  currentQuestion: RoundQuestion | null;
  /** The reveal of the running round. */
  currentReveal: RoundReveal | null;
  /** The answers of the running round. */
  currentAnswers: PlayerAnswer[];
  /** The players of the session. */
  players: Player[];
  /** The teams of the session. */
  teams: Team[];
  /** The configuration of the lobby. */
  config: GameConfig;
  /** Whether the game is over. */
  isGameOver: boolean;
  /** The songs that were already played. */
  playedSongIds: string[];
  /** The name of the player whose turn it is. */
  pilotName?: string;
  /** The colour of the player whose turn it is. */
  pilotColor?: string;
  /** The name of the next player. */
  nextPilotName?: string;
  /** The colour of the next player. */
  nextPilotColor?: string;
  /** The handler of a drawn card. */
  onDraw: () => void;
  /** The handler of an answer of the player. */
  onAnswered: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  /** The handler of the start of the reveal. */
  onReveal: () => void;
  /** The handler of a reroll of the card. */
  onReroll: () => void;
  /** The handler of the next round. */
  onNextRound: () => void;
  /** The handler of the end of the game. */
  onEndGame: () => void;
  /** The handler of the override of a correct answer. */
  onOverrideCorrect: () => void;
  /** The handler of the override of a redraw. */
  onOverrideRedraw: () => void;
}

export function GamePhaseArea({
  roundPhase,
  currentMode,
  currentQuestion,
  currentReveal,
  currentAnswers,
  players,
  teams,
  config,
  isGameOver,
  playedSongIds,
  pilotName,
  pilotColor,
  nextPilotName,
  nextPilotColor,
  onDraw,
  onAnswered,
  onReveal,
  onReroll,
  onNextRound,
  onEndGame,
  onOverrideCorrect,
  onOverrideRedraw,
}: GamePhaseAreaProps) {
  const { t } = useTranslation();

  return (
    <main className="flex-1 overflow-y-auto">
      {/* ── Drawing + scoring: normal AnimatePresence ─────── */}
      <AnimatePresence mode="wait">
        {roundPhase === 'drawing' && (
          <motion.div
            key="drawing"
            variants={PHASE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <DrawingPhase
              currentMode={currentMode}
              playedSongIds={playedSongIds}
              pilotName={pilotName}
              pilotColor={pilotColor}
              nextPilotName={nextPilotName}
              nextPilotColor={nextPilotColor}
              onDraw={onDraw}
            />
          </motion.div>
        )}

        {roundPhase === 'scoring' && (
          <motion.div
            key="scoring"
            variants={PHASE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6"
          >
            <p className="text-6xl">🏁</p>
            <h2 className="text-3xl font-black text-center">
              {t('game.page.gameOver')}
            </h2>
            <p className="opacity-60">{t('game.page.redirecting')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Question + reveal: QuestionPhase stays mounted ─
          So that the MusicPlayer (YouTube iframe) does not restart when
          switching to the RevealPhase.
          display:none keeps the iframe alive — the audio keeps playing. */}
      {currentQuestion !== null &&
        (roundPhase === 'question' ||
          roundPhase === 'locked-in' ||
          roundPhase === 'reveal') && (
          <motion.div
            variants={PHASE_VARIANTS}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.3 }}
          >
            {/* QuestionPhase: hidden (not unmounted) during the reveal */}
            <div
              style={
                roundPhase === 'reveal' ? { display: 'none' } : undefined
              }
              className="pt-2"
            >
              <QuestionPhase
                question={currentQuestion}
                currentMode={currentMode}
                onAnswered={onAnswered}
                onReveal={onReveal}
                onReroll={onReroll}
              />
            </div>

            {/* RevealPhase: overlaid, with its own reveal animation */}
            <AnimatePresence>
              {roundPhase === 'reveal' && currentReveal?.song && (
                <motion.div
                  key="reveal"
                  variants={PHASE_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <RevealPhase
                    song={currentReveal.song}
                    currentMode={currentMode}
                    answers={currentAnswers}
                    players={players}
                    teams={teams}
                    winCondition={config.winCondition}
                    endingCondition={config.endingCondition}
                    isGameOver={isGameOver}
                    onNextRound={onNextRound}
                    onEndGame={onEndGame}
                    onOverrideCorrect={onOverrideCorrect}
                    onOverrideRedraw={onOverrideRedraw}
                    overrideGovernance={config.overrideGovernance}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
    </main>
  );
}
