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
    (isCorrect: boolean, pointsAwarded: number) => {
      if (!pilotId) return;

      const answer: PlayerAnswer = {
        playerId: pilotId,
        answer: isCorrect ? 'correct' : 'incorrect',
        isCorrect,
        pointsAwarded,
      };

      submitAnswer(answer);
      if (isCorrect && pointsAwarded > 0) {
        awardPoints(pilotId, pointsAwarded);
      }
    },
    [pilotId, submitAnswer, awardPoints],
  );

  // ── Handler: Reveal starten ────────────────────────────────────
  const handleReveal = useCallback(() => {
    advancePhase('reveal');
  }, [advancePhase]);

  // ── Handler: Nächste Runde ─────────────────────────────────────
  const handleNextRound = useCallback(() => {
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
        <AnimatePresence mode="wait">
          {/* ── Drawing Phase ─────────────────────────────────── */}
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

          {/* ── Question Phase ────────────────────────────────── */}
          {(roundPhase === 'question' || roundPhase === 'locked-in') &&
            currentSong !== null && (
              <motion.div
                key="question"
                variants={PHASE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="pt-2"
              >
                <QuestionPhase
                  song={currentSong}
                  currentMode={currentMode}
                  onAnswered={handleAnswered}
                  onReveal={handleReveal}
                />
              </motion.div>
            )}

          {/* ── Reveal Phase ──────────────────────────────────── */}
          {roundPhase === 'reveal' && currentSong !== null && (
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
                answers={currentAnswers}
                players={players}
                winCondition={config.winCondition}
                onNextRound={handleNextRound}
                onEndGame={handleEndGame}
              />
            </motion.div>
          )}

          {/* ── Scoring Phase (Spielende) ─────────────────────── */}
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
      </main>
    </div>
  );
}
