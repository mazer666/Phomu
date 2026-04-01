/**
 * Game-Seite — Haupt-Spielbildschirm
 *
 * Leitet je nach roundPhase an die passende Phase-Komponente weiter:
 *   drawing   → DrawingPhase   (Karte ziehen)
 *   question  → QuestionPhase  (modus-spezifische Frage)
 *   locked-in → QuestionPhase  (gleiche UI, gesperrt)
 *   reveal    → RevealPhase    (Song aufdecken, Punkte)
 *   scoring   → RevealPhase    (Spielende-Overlay)
 *
 * Guard: Kein laufendes Spiel → Weiterleitung zur Lobby.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { GameHeader } from '@/components/game/GameHeader';
import { Scoreboard } from '@/components/game/Scoreboard';
import { DrawingPhase } from '@/components/game/DrawingPhase';
import { QuestionPhase } from '@/components/game/QuestionPhase';
import { RevealPhase } from '@/components/game/RevealPhase';
import type { PhomuSong } from '@/types/song';
import type { PlayerAnswer } from '@/types/game-state';

// ─── Übergangsanimation ───────────────────────────────────────────

const PHASE_VARIANTS = {
  initial:  { opacity: 0, y: 24 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -16 },
};

// ─── Game-Seite ───────────────────────────────────────────────────

export default function GamePage() {
  const router = useRouter();
  const {
    players,
    config,
    currentRound,
    roundPhase,
    currentMode,
    currentSong,
    currentAnswers,
    playedSongIds,
    turnOrder,
    currentTurnIndex,
    isGameOver,
    drawSong,
    advancePhase,
    submitAnswer,
    awardPoints,
    nextRound,
    endGame,
    initSession,
  } = useGameStore();

  const [showScoreboard, setShowScoreboard] = useState(false);

  // ── Guard: kein Spiel → Lobby ──────────────────────────────────
  useEffect(() => {
    if (currentRound === 0 || players.length === 0) {
      router.replace('/lobby');
    }
  }, [currentRound, players.length, router]);

  // ── Game Over → /game-over ────────────────────────────────────
  useEffect(() => {
    if (isGameOver) {
      router.push('/game-over');
    }
  }, [isGameOver, router]);

  // ── Aktiver Spieler (Pilot) ────────────────────────────────────
  const pilotId = turnOrder[currentTurnIndex];
  const pilot = players.find((p) => p.id === pilotId);

  // ── Handler: Karte gezogen ─────────────────────────────────────
  const handleCardDrawn = useCallback(
    (song: PhomuSong) => {
      drawSong(song);
    },
    [drawSong],
  );

  // ── Handler: Spieler hat geantwortet ──────────────────────────
  const handleAnswered = useCallback(
    (isCorrect: boolean, basePointsAwarded: number, answeredInSeconds?: number) => {
      if (!pilotId) return;

      let pointsAwarded = basePointsAwarded;
      if (isCorrect && config.timeDecayEnabled && typeof answeredInSeconds === 'number') {
        const overtime = Math.max(0, answeredInSeconds - config.timeDecayGraceSeconds);
        const decaySteps = Math.floor(overtime / Math.max(1, config.timeDecayStepSeconds));
        const decayPoints = decaySteps * config.timeDecayStepPoints;
        pointsAwarded = Math.max(config.minPointsPerCorrect, basePointsAwarded - decayPoints);
      }

      const answer: PlayerAnswer = {
        playerId: pilotId,
        answer: isCorrect ? 'correct' : 'incorrect',
        isCorrect,
        pointsAwarded,
        answeredInSeconds,
      };

      submitAnswer(answer);
      if (isCorrect && pointsAwarded > 0) {
        awardPoints(pilotId, pointsAwarded);
      }
    },
    [
      pilotId,
      config.timeDecayEnabled,
      config.timeDecayGraceSeconds,
      config.timeDecayStepSeconds,
      config.timeDecayStepPoints,
      config.minPointsPerCorrect,
      submitAnswer,
      awardPoints,
    ],
  );

  // ── Handler: Reveal starten ────────────────────────────────────
  const handleReveal = useCallback(() => {
    advancePhase('reveal');
  }, [advancePhase]);

  // ── Handler: Nächste Runde ─────────────────────────────────────
  const handleNextRound = useCallback(() => {
    nextRound();
  }, [nextRound]);


  // ── Power User: Antwort overrulen ─────────────────────────────
  const handleOverrideCorrect = useCallback(() => {
    if (!pilotId) return;
    const alreadyCorrect = currentAnswers.some((a) => a.playerId === pilotId && a.isCorrect);
    if (alreadyCorrect) return;

    const points = Math.max(1, config.minPointsPerCorrect);
    submitAnswer({
      playerId: pilotId,
      answer: 'override-correct',
      isCorrect: true,
      pointsAwarded: points,
    });
    awardPoints(pilotId, points);
  }, [pilotId, currentAnswers, config.minPointsPerCorrect, submitAnswer, awardPoints]);

  // ── Power User: Runde verwerfen / neu ziehen ───────────────────
  const handleOverrideRedraw = useCallback(() => {
    nextRound();
  }, [nextRound]);

  // ── Handler: Spiel beenden ─────────────────────────────────────
  const handleEndGame = useCallback(() => {
    const winner = [...players].sort((a, b) => b.score - a.score)[0];
    endGame(winner?.id);
  }, [players, endGame]);

  // ── Handler: Exit (Sicherheitsfrage) ──────────────────────────
  const handleExit = useCallback(() => {
    if (confirm('Spiel abbrechen und zur Lobby zurückkehren?')) {
      initSession();
      router.push('/lobby');
    }
  }, [initSession, router]);

  // ── Timer abgelaufen ──────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    if (roundPhase === 'question') {
      advancePhase('reveal');
    }
  }, [roundPhase, advancePhase]);

  // Noch nicht bereit → nichts rendern (Redirect läuft)
  if (currentRound === 0 || players.length === 0) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Header */}
      <GameHeader
        roundNumber={currentRound}
        currentMode={currentMode}
        pilotName={pilot?.name}
        timeLimitSeconds={roundPhase === 'question' ? config.timeLimitSeconds : null}
        onTimeUp={handleTimeUp}
        onExit={handleExit}
      />

      {/* Scoreboard-Toggle-Button */}
      <button
        onClick={() => setShowScoreboard(true)}
        className="fixed bottom-4 right-4 z-30 px-4 py-2 rounded-full text-sm font-bold
                   shadow-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        aria-label="Punktestand anzeigen"
      >
        🏆 Punkte
      </button>

      {/* Scoreboard Overlay */}
      <Scoreboard
        players={players}
        winCondition={config.winCondition}
        isOpen={showScoreboard}
        onClose={() => setShowScoreboard(false)}
      />

      {/* Phasen-Content mit Übergangsanimation */}
      <main className="flex-1 overflow-y-auto">
        {/* ── Drawing + Scoring: normal AnimatePresence ─────── */}
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
                pilotName={pilot?.name}
                onCardDrawn={handleCardDrawn}
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
              <h2 className="text-3xl font-black text-center">Spiel beendet!</h2>
              <p className="opacity-60">Weiterleitung …</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Question + Reveal: QuestionPhase bleibt gemountet ─
            Damit der MusicPlayer (YouTube-Iframe) beim Übergang
            zur RevealPhase nicht neu startet.
            display:none hält den Iframe am Leben — Audio läuft weiter. */}
        {currentSong !== null &&
          (roundPhase === 'question' ||
            roundPhase === 'locked-in' ||
            roundPhase === 'reveal') && (
          <motion.div
            variants={PHASE_VARIANTS}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.3 }}
          >
            {/* QuestionPhase: versteckt (nicht unmountet) während Reveal */}
            <div
              style={roundPhase === 'reveal' ? { display: 'none' } : undefined}
              className="pt-2"
            >
              <QuestionPhase
                song={currentSong}
                currentMode={currentMode}
                onAnswered={handleAnswered}
                onReveal={handleReveal}
              />
            </div>

            {/* RevealPhase: überlagert, eigene Einblend-Animation */}
            <AnimatePresence>
              {roundPhase === 'reveal' && (
                <motion.div
                  key="reveal"
                  variants={PHASE_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <RevealPhase
                    song={currentSong}
                    currentMode={currentMode}
                    answers={currentAnswers}
                    players={players}
                    winCondition={config.winCondition}
                    onNextRound={handleNextRound}
                    onEndGame={handleEndGame}
                    onOverrideCorrect={handleOverrideCorrect}
                    onOverrideRedraw={handleOverrideRedraw}
                    overrideGovernance={config.overrideGovernance}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
