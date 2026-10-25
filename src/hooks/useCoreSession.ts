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
 * EXAMPLE: the game page calls `useCoreRound()` and draws the first card.
 */
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { advance, drawRandom, openSession, reveal } from '@/core/session-service';

/** The commands of the round that the base owns. */
export interface CoreRound {
  /** Draws a song and opens the question phase. */
  drawCard: () => Promise<void>;
  /** Releases the solution of the round. */
  releaseSolution: () => Promise<void>;
  /** Closes the round and prepares the next one. */
  closeRound: () => Promise<void>;
}

/**
 * Starts the session of the core and returns the commands of the round.
 *
 * WHY the players and the teams are handed over: the base needs them to
 * know whose turn it is — it evaluates the answer for the active player.
 */
export function useCoreRound(): CoreRound {
  const config = useGameStore((state) => state.config);
  const players = useGameStore((state) => state.players);
  const teams = useGameStore((state) => state.teams);
  const setQuestion = useGameStore((state) => state.setQuestion);
  const setReveal = useGameStore((state) => state.setReveal);
  const setCurrentMode = useGameStore((state) => state.setCurrentMode);
  const nextRound = useGameStore((state) => state.nextRound);
  const started = useRef(false);

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
      } catch (failure) {
        console.error('the core could not be started', failure);
      }
    };
    void start();
  }, [config, players, teams, setCurrentMode]);

  const drawCard = useCallback(async () => {
    try {
      const question = await drawRandom();
      setQuestion(question);
    } catch (failure) {
      console.error('the song could not be drawn', failure);
    }
  }, [setQuestion]);

  const releaseSolution = useCallback(async () => {
    try {
      const revealed = await reveal();
      setReveal(revealed);
    } catch (failure) {
      console.error('the solution could not be released', failure);
    }
  }, [setReveal]);

  const closeRound = useCallback(async () => {
    try {
      const view = await advance();
      if (view.phase === 'drawing') {
        setCurrentMode(view.mode);
      }
    } catch (failure) {
      console.error('the round could not be closed', failure);
    }
    nextRound();
  }, [nextRound, setCurrentMode]);

  return { drawCard, releaseSolution, closeRound };
}
