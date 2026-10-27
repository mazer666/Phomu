/**
 * Game page — main game screen
 *
 * Forwards to the matching phase component depending on roundPhase:
 *   drawing   → DrawingPhase   (draw a card)
 *   question  → QuestionPhase  (mode-specific question)
 *   locked-in → QuestionPhase  (same UI, locked)
 *   reveal    → RevealPhase    (uncover the song, points)
 *   scoring   → RevealPhase    (game-over overlay)
 *
 * Guard: no running game → redirect to the lobby.
 */
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { useCoreRound } from '@/hooks/useCoreSession';
import { useOrientation } from '@/hooks/useOrientation';
import { GameHeader } from '@/components/game/GameHeader';
import { GamePhaseArea } from '@/components/game/GamePhaseArea';
import { GameBody } from '@/components/game/GameBody';
import { GameFloatingActions } from '@/components/game/GameFloatingActions';
import { Scoreboard } from '@/components/game/Scoreboard';
import type { PlayerAnswer } from '@/types/game-state';
import { useRoundProgress } from '@/hooks/useRoundProgress';
import { resolveGameLayout } from '@/utils/orientation-layout';

// ─── Game page ───────────────────────────────────────────────────

import { FeedbackOverlay } from '@/components/game/FeedbackOverlay';
import { DiceAnimation } from '@/components/game/DiceAnimation';
import { LastRoundBanner } from '@/components/game/LastRoundBanner';
import { InGameSettingsPanel } from '@/components/game/InGameSettingsPanel';
import { pickLastRoundMessage } from '@/utils/last-round-messages';
import type { LastRoundMessage } from '@/utils/last-round-messages';
import { useGameAudioCues } from '@/hooks/useGameAudioCues';
import { answerLabel } from '@/utils/mode-rules';

export default function GamePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    players,
    teams,
    config,
    currentRound,
    roundPhase,
    currentMode,
    currentQuestion,
    currentReveal,
    currentAnswers,
    playedSongIds,
    turnOrder,
    currentTurnIndex,
    isGameOver,
    gameStartTime,
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
  const [lastRoundBannerMsg, setLastRoundBannerMsg] =
    useState<LastRoundMessage | null>(null);
  const lastRoundBannerShown = useRef(false);

  // ── Orientation of the viewport ───────────────────────────────
  // The portrait draws one column, the landscape two: the phase of the
  // round and the scoreboard next to it. The hook only reports the shape
  // of the viewport — the state of the session stays in the store and
  // survives the rotation.
  const { orientation } = useOrientation();
  const layout = resolveGameLayout(orientation);

  // The core owns the round: it draws the songs, evaluates the answers and
  // releases the solution. The shell never holds the catalogue
  // (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
  const { drawCard, releaseSolution, closeRound } = useCoreRound();

  // ── Time updater for the progress bar ─────────────────────────────
  useEffect(() => {
    if (config.endingCondition !== 'time') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [config.endingCondition]);

  // ── Guard: no game → lobby ──────────────────────────────────
  useEffect(() => {
    if (currentRound === 0 || players.length === 0) {
      router.replace('/lobby');
    }
  }, [currentRound, players.length, router]);

  // ── Game over → /game-over ────────────────────────────────────
  useEffect(() => {
    if (isGameOver) {
      router.push('/game-over');
    }
  }, [isGameOver, router]);

  // ── Active player/active team (pilot) + next one ────────────────────────
  const pilotId = turnOrder[currentTurnIndex];
  const isTeamTurn = config.teamMode !== 'individual';
  const pilot = isTeamTurn
    ? teams.find((t) => t.id === pilotId)
    : players.find((p) => p.id === pilotId);
  const nextPilotId =
    turnOrder.length > 1
      ? turnOrder[(currentTurnIndex + 1) % turnOrder.length]
      : undefined;
  const nextPilot = isTeamTurn
    ? teams.find((t) => t.id === nextPilotId)
    : players.find((p) => p.id === nextPilotId);

  const pilotAvatar =
    !isTeamTurn && pilot && 'avatar' in pilot ? pilot.avatar : '👥';

  // ── Handler: card drawn ─────────────────────────────────────
  // The core draws the song and hands over the question of the round — the
  // question has no field for the solution.
  const handleCardDrawn = useCallback(async () => {
    await drawCard();
  }, [drawCard]);

  // ── Handler: player has answered ──────────────────────────
  const handleAnswered = useCallback(
    (
      isCorrect: boolean,
      pointsAwarded: number,
      answeredInSeconds?: number
    ) => {
      if (!pilotId) return;

      const answer: PlayerAnswer = {
        playerId: pilotId,
        answer: answerLabel(isCorrect),
        isCorrect,
        pointsAwarded,
        answeredInSeconds,
      };

      submitAnswer(answer);
      if (isCorrect && pointsAwarded > 0) {
        awardPoints(pilotId, pointsAwarded);
      }
    },
    [pilotId, submitAnswer, awardPoints]
  );

  // ── Handler: start the reveal ────────────────────────────────────
  // The reveal is the phase that releases the solution. The core hands it
  // over — the shell had no field for it before.
  const handleReveal = useCallback(async () => {
    await releaseSolution();
    advancePhase('reveal');
  }, [advancePhase, releaseSolution]);

  // ── Detect the last rotation ──────────────────────────────────
  const isLastRotation = useMemo(() => {
    if (config.endingCondition === 'time' && gameStartTime) {
      return now >= gameStartTime + config.targetTimeMinutes * 60 * 1000;
    }
    if (config.endingCondition === 'rounds') {
      const totalTurns = config.targetRounds * turnOrder.length;
      // The next round (currentRound + 1) would be in the last rotation
      return currentRound + 1 >= totalTurns - turnOrder.length + 1;
    }
    return false;
  }, [config, currentRound, turnOrder, gameStartTime, now]);

  // ── Handler: next round ─────────────────────────────────────
  const handleNextRound = useCallback(async () => {
    if (isLastRotation && !isGameOver && !lastRoundBannerShown.current) {
      lastRoundBannerShown.current = true;
      setLastRoundBannerMsg(pickLastRoundMessage());
      setTimeout(() => {
        setLastRoundBannerMsg(null);
        void closeRound();
      }, 3400);
    } else {
      void closeRound();
    }
  }, [isLastRotation, isGameOver, closeRound]);

  // ── Power user: override the answer ─────────────────────────────
  const handleOverrideCorrect = useCallback(() => {
    if (!pilotId) return;
    const alreadyCorrect = currentAnswers.some(
      (a) => a.playerId === pilotId && a.isCorrect
    );
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

  // ── Power user: discard the round / draw again ───────────────────
  const handleOverrideRedraw = useCallback(() => {
    void closeRound();
  }, [closeRound]);

  // ── Handler: end the game ─────────────────────────────────────
  const handleEndGame = useCallback(() => {
    const winner = [...players].sort((a, b) => b.score - a.score)[0];
    endGame(winner?.id);
  }, [players, endGame]);

  // ── Handler: exit (confirmation prompt) ──────────────────────────
  const handleExit = useCallback(() => {
    if (confirm(t('game.page.exitConfirm'))) {
      initSession();
      router.push('/lobby');
    }
  }, [initSession, router, t]);

  // ── Timer expired ──────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    if (roundPhase === 'question') {
      advancePhase('reveal');
    }
  }, [roundPhase, advancePhase]);

  // ── Reroll trigger ───────────────────────────────────────────
  const handleReroll = useCallback(() => {
    setIsRerolling(true);
    // Wait for the animation, then skip the song
    setTimeout(() => {
      skipBrokenSong();
      setIsRerolling(false);
    }, 2000);
  }, [skipBrokenSong]);

  const lastAnswer = currentAnswers[currentAnswers.length - 1];

  // Short event SFX (resilient, without interrupting the flow)
  useGameAudioCues({
    currentMode,
    roundPhase,
    answerCount: currentAnswers.length,
    lastAnswerCorrect: lastAnswer?.isCorrect ?? null,
    isGameOver,
    sfxEnabled,
    sfxVolume,
  });

  // ── Progress calculation (progress bar) ─────────────────────
  const progressData = useRoundProgress({
    config,
    currentRound,
    turnOrderLength: turnOrder.length,
    players,
    teams,
    gameStartTime,
    now,
    t,
  });

  // Not ready yet → render nothing (the redirect is running)
  if (currentRound === 0 || players.length === 0) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      data-layout={layout.variant}
      data-columns={layout.columns}
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Juicy overlays */}
      <FeedbackOverlay
        isCorrect={lastAnswer?.isCorrect ?? null}
        triggerKey={currentAnswers.length}
      />
      <DiceAnimation isVisible={isRerolling} />
      <LastRoundBanner
        message={lastRoundBannerMsg}
        onDismiss={() => {
          setLastRoundBannerMsg(null);
          nextRound();
        }}
      />

      {/* Header — over the full width in both orientations */}
      <GameHeader
        roundNumber={progressData.currentVal}
        currentMode={currentMode}
        pilotName={pilot?.name}
        pilotAvatar={pilotAvatar}
        pilotColor={pilot?.color}
        timeLimitSeconds={
          roundPhase === 'question' ? config.timeLimitSeconds : null
        }
        progressPercentage={progressData.percentage}
        targetLabel={progressData.targetLabel}
        onTimeUp={handleTimeUp}
        onExit={handleExit}
      />

      {/* Body: the phase of the round, in the landscape next to the scoreboard */}
      <GameBody
        layout={layout}
        players={players}
        teams={teams}
        teamMode={config.teamMode}
        winCondition={config.winCondition}
        onLeaveParty={handleExit}
        onOpenFullSettings={() => router.push('/settings')}
      >
        {/* Phase content with transition animation */}
        <GamePhaseArea
          roundPhase={roundPhase}
          currentMode={currentMode}
          currentQuestion={currentQuestion}
          currentReveal={currentReveal}
          currentAnswers={currentAnswers}
          players={players}
          teams={teams}
          config={config}
          isGameOver={isGameOver}
          playedSongIds={playedSongIds}
          pilotName={pilot?.name}
          pilotColor={pilot?.color}
          nextPilotName={turnOrder.length > 1 ? nextPilot?.name : undefined}
          nextPilotColor={nextPilot?.color}
          onDraw={handleCardDrawn}
          onAnswered={handleAnswered}
          onReveal={handleReveal}
          onReroll={handleReroll}
          onNextRound={handleNextRound}
          onEndGame={handleEndGame}
          onOverrideCorrect={handleOverrideCorrect}
          onOverrideRedraw={handleOverrideRedraw}
        />
      </GameBody>

      {/* The floating buttons — the portrait only, the landscape has the column */}
      {layout.showScoreboardToggle && layout.showSettingsToggle && (
        <GameFloatingActions
          onShowScoreboard={() => setShowScoreboard(true)}
          onShowSettings={() => setShowInGameSettings(true)}
        />
      )}

      {/* Scoreboard overlay — the portrait only, the landscape has the column */}
      <Scoreboard
        players={players}
        teams={teams}
        teamMode={config.teamMode}
        winCondition={config.winCondition}
        isOpen={showScoreboard && layout.scoreboardMode === 'overlay'}
        onClose={() => setShowScoreboard(false)}
      />

      <InGameSettingsPanel
        isOpen={showInGameSettings && layout.variant === 'portrait'}
        onClose={() => setShowInGameSettings(false)}
        onLeaveParty={handleExit}
        onOpenFullSettings={() => router.push('/settings')}
      />
    </div>
  );
}
