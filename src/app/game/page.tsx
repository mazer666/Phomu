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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

import { FeedbackOverlay } from '@/components/game/FeedbackOverlay';
import { DiceAnimation } from '@/components/game/DiceAnimation';
import { LastRoundBanner } from '@/components/game/LastRoundBanner';
import { InGameSettingsPanel } from '@/components/game/InGameSettingsPanel';
import { pickLastRoundMessage } from '@/utils/last-round-messages';
import type { LastRoundMessage } from '@/utils/last-round-messages';
import { useGameAudioCues } from '@/hooks/useGameAudioCues';

export default function GamePage() {
  const router = useRouter();
  const {
    players,
    teams,
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
    gameStartTime,
    drawSong,
    advancePhase,
    submitAnswer,
    awardPoints,
    nextRound,
    endGame,
    initSession,
    skipBrokenSong,
    sfxEnabled,
    sfxVolume,
  } = useGameStore();

  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showInGameSettings, setShowInGameSettings] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isRerolling, setIsRerolling] = useState(false);
  const [lastRoundBannerMsg, setLastRoundBannerMsg] = useState<LastRoundMessage | null>(null);
  const lastRoundBannerShown = useRef(false);


  // ── Zeit-Updater für Progress-Bar ─────────────────────────────
  useEffect(() => {
    if (config.endingCondition !== 'time') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [config.endingCondition]);

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

  // ── Aktiver Spieler/Aktives Team (Pilot) + nächster ────────────────────────
  const pilotId = turnOrder[currentTurnIndex];
  const isTeamTurn = config.teamMode !== 'individual';
  const pilot = isTeamTurn
    ? teams.find((t) => t.id === pilotId)
    : players.find((p) => p.id === pilotId);
  const nextPilotId = turnOrder.length > 1
    ? turnOrder[(currentTurnIndex + 1) % turnOrder.length]
    : undefined;
  const nextPilot = isTeamTurn
    ? teams.find((t) => t.id === nextPilotId)
    : players.find((p) => p.id === nextPilotId);

  const pilotAvatar = !isTeamTurn && pilot && 'avatar' in pilot ? pilot.avatar : '👥';

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

  // ── Letzte Rotation erkennen ──────────────────────────────────
  const isLastRotation = useMemo(() => {
    if (config.endingCondition === 'time' && gameStartTime) {
      return now >= gameStartTime + config.targetTimeMinutes * 60 * 1000;
    }
    if (config.endingCondition === 'rounds') {
      const totalTurns = config.targetRounds * turnOrder.length;
      // Nächste Runde (currentRound + 1) wäre in der letzten Rotation
      return (currentRound + 1) >= (totalTurns - turnOrder.length + 1);
    }
    return false;
  }, [config, currentRound, turnOrder, gameStartTime, now]);

  // ── Handler: Nächste Runde ─────────────────────────────────────
  const handleNextRound = useCallback(() => {
    if (isLastRotation && !isGameOver && !lastRoundBannerShown.current) {
      lastRoundBannerShown.current = true;
      setLastRoundBannerMsg(pickLastRoundMessage());
      setTimeout(() => {
        setLastRoundBannerMsg(null);
        nextRound();
      }, 3400);
    } else {
      nextRound();
    }
  }, [isLastRotation, isGameOver, nextRound]);


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

  // ── Reroll Trigger ───────────────────────────────────────────
  const handleReroll = useCallback(() => {
    setIsRerolling(true);
    // Animation abwarten, dann Song überspringen
    setTimeout(() => {
      skipBrokenSong();
      setIsRerolling(false);
    }, 2000);
  }, [skipBrokenSong]);


  const lastAnswer = currentAnswers[currentAnswers.length - 1];

  // Kurze Event-SFX (resilient, ohne Flow-Unterbrechung)
  useGameAudioCues({
    currentMode,
    roundPhase,
    answerCount: currentAnswers.length,
    lastAnswerCorrect: lastAnswer?.isCorrect ?? null,
    isGameOver,
    sfxEnabled,
    sfxVolume,
  });

  // ── Fortschrittsberechnung (Progress Bar) ─────────────────────
  const progressData = useMemo(() => {
    let percentage = 0;
    let targetLabel = '';
    let currentVal = currentRound;

    if (config.endingCondition === 'rounds') {
      const totalTurns = config.targetRounds * turnOrder.length;
      percentage = (currentRound / totalTurns) * 100;
      targetLabel = `${totalTurns}`;
    } else if (config.endingCondition === 'points') {
      const topScore = config.teamMode === 'individual'
        ? Math.max(...players.map(p => p.score), 0)
        : Math.max(...teams.map(t => t.score), 0);
      percentage = (topScore / config.targetPoints) * 100;
      targetLabel = `${config.targetPoints} Pkt`;
      currentVal = topScore;
    } else if (config.endingCondition === 'time' && gameStartTime) {
      const elapsedMs = now - gameStartTime;
      const targetMs = config.targetTimeMinutes * 60 * 1000;
      percentage = (elapsedMs / targetMs) * 100;
      targetLabel = `${config.targetTimeMinutes} Min`;
      currentVal = Math.floor(elapsedMs / 60000);
    }
    return { percentage, targetLabel, currentVal };
  }, [config, currentRound, turnOrder.length, players, teams, gameStartTime, now]);

  // Noch nicht bereit → nichts rendern (Redirect läuft)
  if (currentRound === 0 || players.length === 0) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Juicy Overlays */}
      <FeedbackOverlay
        isCorrect={lastAnswer?.isCorrect ?? null}
        triggerKey={currentAnswers.length}
      />
      <DiceAnimation isVisible={isRerolling} />
      <LastRoundBanner
        message={lastRoundBannerMsg}
        onDismiss={() => { setLastRoundBannerMsg(null); nextRound(); }}
      />

      {/* Header */}
      <GameHeader
        roundNumber={progressData.currentVal}
        currentMode={currentMode}
        pilotName={pilot?.name}
        pilotAvatar={pilotAvatar}
        pilotColor={pilot?.color}
        timeLimitSeconds={roundPhase === 'question' ? config.timeLimitSeconds : null}
        progressPercentage={progressData.percentage}
        targetLabel={progressData.targetLabel}
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

      {/* In-Game Settings (jederzeit erreichbar) */}
      <button
        onClick={() => setShowInGameSettings(true)}
        className="fixed bottom-4 left-4 z-30 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        aria-label="Spiel-Einstellungen öffnen"
      >
        ⚙️ Settings
      </button>

      {/* Scoreboard Overlay */}
      <Scoreboard
        players={players}
        teams={teams}
        teamMode={config.teamMode}
        winCondition={config.winCondition}
        isOpen={showScoreboard}
        onClose={() => setShowScoreboard(false)}
      />

      <InGameSettingsPanel
        isOpen={showInGameSettings}
        onClose={() => setShowInGameSettings(false)}
        onLeaveParty={handleExit}
        onOpenFullSettings={() => router.push('/settings')}
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
                pilotColor={pilot?.color}
                nextPilotName={turnOrder.length > 1 ? nextPilot?.name : undefined}
                nextPilotColor={nextPilot?.color}
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
                onReroll={handleReroll}
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
                    teams={teams}
                    winCondition={config.winCondition}
                    endingCondition={config.endingCondition}
                    isGameOver={isGameOver}
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
