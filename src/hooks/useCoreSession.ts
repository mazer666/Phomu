/**
 * The session of the core.
 *
 * WHAT: the hook that starts the session of the Rust base when the game
 * page opens, and the commands of the round that the base owns.
 *
 * WHY the hook exists: the core owns the round — it draws the songs,
 * evaluates the answers and releases the solution. The session has to be
 * created before the first round is drawn, and it has to be created exactly
 * once per game (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * WHY a failure is reported: a failure used to end in a `console.error`.
 * The player saw a button that did nothing and got no hint. Every failure
 * is therefore written into the state of the session, and the screen shows
 * it. The technical text stays in the console — the player gets a message
 * he can act on.
 *
 * WHY the timeline is handed over here: the core evaluates the answer
 * against the timeline it knows and builds the slots and the possible
 * points of the round from it. The shell owns the picture, the core owns
 * the rule — the years have to reach the core before the card is drawn,
 * otherwise the core refuses the answer (`errors.invalidAnswer`) and the
 * solution of the round cannot be released afterwards.
 *
 * EXAMPLE: the game page calls `useCoreRound()` and draws the first card.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { GAME_ERROR_KEYS } from '@/stores/game-store-errors';
import {
  advance,
  drawById,
  drawRandom,
  openSession,
  reveal,
  startTimeline,
  timeout,
  yearScale,
} from '@/core/session-service';
import { initialTimelineYears } from '@/core/timeline';
import { isAnswersNotLocked } from '@/core/errors';
import type { RoundQuestion } from '@/core/types';

/** The commands of the round that the base owns. */
export interface CoreRound {
  /** Draws a song and opens the question phase. */
  drawCard: () => Promise<void>;
  /** Releases the solution of the round. */
  releaseSolution: () => Promise<void>;
  /** Ends the round without an answer — the timeout. */
  endRoundWithoutAnswer: () => Promise<void>;
  /** Closes the round and prepares the next one. */
  closeRound: () => Promise<void>;
}

/**
 * Starts the session of the core and returns the commands of the round.
 *
 * WHY the players and the teams are handed over: the base needs them to
 * know whose turn it is — it evaluates the answer for the active player.
 *
 * WHY a success clears the failure: the failure belongs to the step that
 * failed. A step that works again means the problem is gone — an old
 * message must not stay on the screen.
 */
export function useCoreRound(): CoreRound {
  const config = useGameStore((state) => state.config);
  const players = useGameStore((state) => state.players);
  const teams = useGameStore((state) => state.teams);
  const setQuestion = useGameStore((state) => state.setQuestion);
  const setReveal = useGameStore((state) => state.setReveal);
  const setCurrentMode = useGameStore((state) => state.setCurrentMode);
  const nextRound = useGameStore((state) => state.nextRound);
  const setError = useGameStore((state) => state.setError);
  const clearError = useGameStore((state) => state.clearError);
  const started = useRef(false);

  /**
   * Hands the timeline of the round to the core.
   *
   * WHY only when the timeline is empty: the core owns the timeline once it
   * knows it. It adds the year of a correct answer on its own, and the
   * shell tells it about a year the player removes. A second initialisation
   * would throw the grown timeline away.
   *
   * WHY before the card is drawn: the core builds the slots and the
   * possible points of the round from the timeline it knows.
   */
  const prepareTimeline = useCallback(async () => {
    const state = useGameStore.getState();
    if (state.currentMode !== 'timeline') return;
    if (state.timelineYears.length > 0) return;
    const scale = await yearScale();
    const years = initialTimelineYears(scale);
    if (years.length === 0) return;
    // WHY the order: the core comes first. If it refuses the years, the
    // shell keeps an empty timeline and tries again — a timeline that only
    // the shell knows would make the core evaluate the answer against
    // years that are not on the screen.
    await startTimeline(years);
    state.initTimeline(years);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = async () => {
      try {
        const view = await openSession(
          config as unknown as Record<string, unknown>,
          players.map((player) => ({
            id: player.id,
            name: player.name,
            teamId: player.teamId,
            isPilot: player.isPilot,
            isSpectator: player.isSpectator,
          })),
          teams.map((team) => ({
            id: team.id,
            name: team.name,
            playerIds: team.playerIds,
          }))
        );
        setCurrentMode(view.mode);
        await prepareTimeline();
        clearError();
      } catch (failure) {
        console.error('the core could not be started', failure);
        setError(GAME_ERROR_KEYS.coreUnavailable);
      }
    };
    void start();
  }, [config, players, teams, setCurrentMode, setError, clearError, prepareTimeline]);

  const drawCard = useCallback(async () => {
    try {
      await prepareTimeline();
      const state = useGameStore.getState();
      let question: RoundQuestion;
      if (state.quickSongId) {
        // WHY the identifier: the player chose the song in the library, and
        // the core owns the catalogue — it draws the song by its identifier.
        try {
          question = await drawById(state.quickSongId);
        } catch (failure) {
          // WHY the fallback: a song that the player added or changed in the
          // library is not in the catalogue of the core. The round draws a
          // song from the catalogue instead of ending in a dead screen.
          console.warn(
            'the chosen song is not in the catalogue of the core — a song is drawn instead',
            failure
          );
          question = await drawRandom();
        }
        setQuestion(question, 'qr');
      } else {
        question = await drawRandom();
        setQuestion(question, 'random');
      }
      clearError();
    } catch (failure) {
      console.error('the song could not be drawn', failure);
      setError(GAME_ERROR_KEYS.drawFailed);
    }
  }, [setQuestion, setError, clearError, prepareTimeline]);

  const releaseSolution = useCallback(async () => {
    try {
      const revealed = await reveal();
      setReveal(revealed);
      clearError();
    } catch (failure) {
      // WHY the fallback: the base releases the solution only after the
      // answers are locked in (C-3). A round that nobody answered — the
      // table skipped the answer — is closed with the timeout of the base,
      // which locks the round and releases the solution in one go.
      if (isAnswersNotLocked(failure)) {
        try {
          const released = await timeout();
          setReveal(released);
          clearError();
          return;
        } catch (second) {
          console.error('the round could not be closed', second);
          setError(GAME_ERROR_KEYS.revealFailed);
          return;
        }
      }
      console.error('the solution could not be released', failure);
      setError(GAME_ERROR_KEYS.revealFailed);
    }
  }, [setReveal, setError, clearError]);

  const endRoundWithoutAnswer = useCallback(async () => {
    try {
      const released = await timeout();
      setReveal(released);
      clearError();
    } catch (failure) {
      console.error('the round could not be closed', failure);
      setError(GAME_ERROR_KEYS.revealFailed);
    }
  }, [setReveal, setError, clearError]);

  const closeRound = useCallback(async () => {
    try {
      const view = await advance();
      if (view.phase === 'drawing') {
        setCurrentMode(view.mode);
        await prepareTimeline();
      }
      clearError();
    } catch (failure) {
      console.error('the round could not be closed', failure);
      setError(GAME_ERROR_KEYS.roundFailed);
    }
    nextRound();
  }, [nextRound, setCurrentMode, setError, clearError, prepareTimeline]);

  return { drawCard, releaseSolution, endRoundWithoutAnswer, closeRound };
}
