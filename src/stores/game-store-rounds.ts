/**
 * The slice of the rounds of a session.
 *
 * WHAT: starting the game, running the round, ending the round and ending
 * the game.
 *
 * WHY a slice: the rules of a round are the part of the store with the most
 * state. Keeping them apart makes the store readable, and the round
 * testable without the lobby.
 */
import type { GameRound } from '@/types/game-state';
import type { Team } from '@/types/player';
import type { SliceActions, StoreGet, StoreSet } from './game-store-types';

/** The actions of the slice of the rounds. */
export type RoundActions = SliceActions<
  | 'startGame'
  | 'nextRound'
  | 'endGame'
  | 'setQuestion'
  | 'setReveal'
  | 'skipBrokenSong'
  | 'submitAnswer'
  | 'resetScores'
  | 'startQuickGame'
  | 'advancePhase'
  | 'setCurrentMode'
>;

/**
 * The slice of the rounds of a session.
 *
 * @param set - The setter of the store.
 * @param get - The reader of the store.
 */
export function createRoundActions(
  set: StoreSet,
  get: StoreGet
): RoundActions {
  return {
    // ── startGame ────────────────────────────────────────────────
    startGame() {
      const { config, players, teams } = get();

      // Define turnOrder based on mode
      const newTurnOrder = config.teamMode === 'individual'
        ? players.map((p) => p.id)
        : teams.map((t) => t.id);

      set({
        turnOrder: newTurnOrder,
        currentTurnIndex: 0,
        currentRound: 1,
        roundPhase: 'drawing',
        // The mode of the round comes from the core — it draws the mode
        // of every round from the modes of the lobby.
        currentMode: 'timeline',
        currentQuestion: null,
        currentReveal: null,
        currentAnswers: [],
        isGameOver: false,
        winnerId: undefined,
        gameStartTime: Date.now(),
      });
    },

    // ── nextRound ────────────────────────────────────────────────
    nextRound() {
      const state = get();
      const {
        currentRound,
        config,
        currentTurnIndex,
        turnOrder,
        currentMode,
        currentAnswers,
        currentQuestion,
        currentReveal,
        roundHistory,
        players,
        teams,
        gameStartTime,
      } = state;

      // 1. Check for Game Over Conditions
      let shouldEnd = false;
      let winnerId: string | undefined = undefined;

      // Only check ending after a full rotation is complete (last player finished)
      // or if it's the very first round being initialized.
      const isEndOfRotation = currentTurnIndex === turnOrder.length - 1;

      if (isEndOfRotation) {
        if (config.endingCondition === 'points') {
          const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
          const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];
          const maxScore = config.teamMode === 'individual' ? (topPlayer?.score ?? 0) : (topTeam?.score ?? 0);

          if (maxScore >= config.targetPoints) {
            shouldEnd = true;
            winnerId = config.teamMode === 'individual' ? topPlayer?.id : topTeam?.id;
          }
        } else if (config.endingCondition === 'rounds') {
          // targetRounds is per team/player
          if (currentRound >= config.targetRounds * (config.teamMode === 'individual' ? players.length : teams.length)) {
            shouldEnd = true;
          }
        } else if (config.endingCondition === 'time' && gameStartTime) {
          const elapsedMinutes = (Date.now() - gameStartTime) / 60000;
          if (elapsedMinutes >= config.targetTimeMinutes) {
            shouldEnd = true;
          }
        }
      }

      if (shouldEnd) {
        state.endGame(winnerId);
        return;
      }

      // 2. Prepare next round
      //
      // WHY the condition is the drawn song and not the reveal: the
      // contract requires that a round **with a drawn song** is logged and
      // that a round **without** a drawn song is not
      // (docs/design/GAME-CONTRACT.md § 6.3; REQUIREMENTS.md, GAME-005).
      // The shell holds no song — the question of the round carries its
      // identifier — so the question is the record of the drawn song. The
      // identity is only known when the reveal has been released; a round
      // that was ended without a reveal is logged without an identity.
      const newHistory: GameRound[] =
        currentQuestion !== null
          ? [
              ...roundHistory,
              {
                roundNumber: currentRound,
                mode: currentMode,
                identity: currentReveal
                  ? {
                      title: currentReveal.title,
                      artist: currentReveal.artist,
                      year: currentReveal.year,
                    }
                  : null,
                answers: currentAnswers,
                completedAt: new Date().toISOString(),
              },
            ]
          : roundHistory;

      const nextTurnIndex = turnOrder.length > 0
        ? (currentTurnIndex + 1) % turnOrder.length
        : 0;

      // With shifting teams: reshuffle the players every round
      let updatedTeams = teams;
      let updatedPlayers = players;
      if (config.teamMode === 'shifting' && teams.length >= 2) {
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const newTeams: Team[] = teams.map(t => ({ ...t, playerIds: [] as string[] }));
        shuffled.forEach((p, i) => {
          newTeams[i % newTeams.length]!.playerIds.push(p.id);
        });
        updatedPlayers = players.map(p => {
          const team = newTeams.find(t => t.playerIds.includes(p.id));
          return { ...p, teamId: team?.id };
        });
        updatedTeams = newTeams;
      }

      set({
        currentRound: currentRound + 1,
        roundPhase: 'drawing',
        // The mode of the round comes from the core — it draws the mode
        // of every round from the modes of the lobby.
        currentMode: 'timeline',
        currentQuestion: null,
        currentReveal: null,
        currentAnswers: [],
        currentTurnIndex: nextTurnIndex,
        roundHistory: newHistory,
        teams: updatedTeams,
        players: updatedPlayers,
      });
    },

    // ── endGame ──────────────────────────────────────────────────
    endGame(winnerId) {
      const { players, totalXP } = get();
      // Compute the XP earned in this session (sum of all player points)
      const sessionXP = players.reduce((sum, p) => sum + p.score, 0);
      const newTotalXP = totalXP + sessionXP;

      set({
        isGameOver: true,
        winnerId,
        roundPhase: 'scoring',
        totalXP: newTotalXP,
      });
    },

    // ── setQuestion ───────────────────────────────────────────────
    setQuestion(question, source = 'random') {
      set((state) => ({
        currentQuestion: question,
        currentReveal: null,
        currentSongSource: source,
        currentMode: question.mode,
        roundPhase: 'question',
        playedSongIds: [...state.playedSongIds, question.songId],
        autoDrawIntent: false, // Reset flag once song is actually drawn
      }));
    },

    // ── setReveal ─────────────────────────────────────────────────
    setReveal(reveal) {
      set({ currentReveal: reveal });
    },

    // ── skipBrokenSong ───────────────────────────────────────────
    skipBrokenSong() {
      const { currentSongSource } = get();

      if (currentSongSource === 'qr') {
        // With a QR scan it is only marked as "skipped"
        set({ roundPhase: 'drawing', autoDrawIntent: false });
        return;
      }

      // With a random draw a new song is drawn immediately (via DrawingPhase auto-intent)
      set({
        roundPhase: 'drawing',
        currentQuestion: null,
        currentReveal: null,
        autoDrawIntent: true,
      });
    },

    // ── submitAnswer ──────────────────────────────────────────────
    submitAnswer(answer) {
      set((state) => ({
        currentAnswers: [...state.currentAnswers, answer],
      }));
    },

    // ── resetScores ───────────────────────────────────────────────
    resetScores() {
      set((state) => ({
        players: state.players.map((p) => ({ ...p, score: 0 })),
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
        currentRound: 0,
        roundHistory: [],
        playedSongIds: [],
        currentAnswers: [],
        currentQuestion: null,
        currentReveal: null,
        isGameOver: false,
        winnerId: undefined,
        roundPhase: 'drawing',
        timelineYears: [],
      }));
    },

    // ── startQuickGame ───────────────────────────────────────────
    startQuickGame(songId) {
      const { addPlayer } = get();
      // If there are no players, add a default player
      if (get().players.length === 0) {
        addPlayer('Spieler 1', '🎵', '#FF6B35');
      }
      set((state) => ({
        currentRound: 1,
        roundPhase: 'question',
        currentMode: state.config.selectedModes[0] ?? 'timeline',
        currentAnswers: [],
        isGameOver: false,
        winnerId: undefined,
        playedSongIds: [...state.playedSongIds, songId],
        currentSongSource: 'qr',
      }));
    },

    // ── advancePhase ──────────────────────────────────────────────
    advancePhase(phase) {
      set({ roundPhase: phase });
    },

    // ── setCurrentMode ─────────────────────────────────────────────
    // The core draws the mode of every round; the shell only shows it.
    setCurrentMode(mode) {
      set({ currentMode: mode });
    },
  };
}
