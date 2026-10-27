/**
 * The progress of the running round.
 *
 * WHAT: the hook that computes the progress bar of the header out of the
 * state of the session.
 *
 * WHY the hook and not the page: the computation itself is a pure function
 * (`computeRoundProgress`), but the page has to keep the result stable while
 * the session runs. The hook holds the memo, so the page only hands over
 * the state.
 *
 * WHY the labels come from the translation: the bar shows "10 Pkt" and
 * "45 Min" — the words come from the language of the session.
 *
 * EXAMPLE: `const progress = useRoundProgress({ config, currentRound, t });`
 */
'use client';

import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import {
  computeRoundProgress,
  type RoundProgress,
} from '@/utils/game-progress';
import type { GameConfig } from '@/types/game-state';
import type { Player, Team } from '@/types/player';

// ─── Props ────────────────────────────────────────────────────────

interface RoundProgressInput {
  /** The configuration of the lobby. */
  config: GameConfig;
  /** The number of the running round. */
  currentRound: number;
  /** The number of entries in the turn order. */
  turnOrderLength: number;
  /** The players of the session. */
  players: Player[];
  /** The teams of the session. */
  teams: Team[];
  /** The moment the game started, or `null` when it did not start yet. */
  gameStartTime: number | null;
  /** The current moment. */
  now: number;
  /** The translation function of the session. */
  t: TFunction;
}

// ─── Hook ─────────────────────────────────────────────────────────

/**
 * Computes the progress of the running round.
 *
 * @param input The state of the session
 * @returns The progress of the round
 */
export function useRoundProgress(input: RoundProgressInput): RoundProgress {
  const {
    config,
    currentRound,
    turnOrderLength,
    players,
    teams,
    gameStartTime,
    now,
    t,
  } = input;

  return useMemo(
    () =>
      computeRoundProgress({
        config,
        currentRound,
        turnOrderLength,
        players,
        teams,
        gameStartTime,
        now,
        targetPointsLabel: (count) => t('game.page.targetPoints', { count }),
        targetMinutesLabel: (count) => t('game.page.targetMinutes', { count }),
      }),
    [
      config,
      currentRound,
      turnOrderLength,
      players,
      teams,
      gameStartTime,
      now,
      t,
    ]
  );
}
