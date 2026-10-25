/**
 * The progress of a running session.
 *
 * WHAT: the percentage of the progress bar, the label of the target and the
 * value that the header shows next to the round.
 *
 * WHY a pure function: the three ending conditions of the lobby are three
 * different rules, and they were written inside the page of the game. As a
 * function they can be tested without a DOM.
 *
 * EXAMPLE: the ending condition "points" shows the score of the leader and
 * the number of points that end the game.
 */
import type { GameConfig } from '@/types/game-state';
import type { Player, Team } from '@/types/player';

/** The progress of a session, as the header draws it. */
export interface RoundProgress {
  /** The percentage of the bar. */
  percentage: number;
  /** The label of the target. */
  targetLabel: string;
  /** The value that is shown next to the round. */
  currentVal: number;
}

/** Everything the progress of a session depends on. */
export interface ProgressInput {
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
  /** The label of the target points, in the language of the session. */
  targetPointsLabel: (points: number) => string;
  /** The label of the target minutes, in the language of the session. */
  targetMinutesLabel: (minutes: number) => string;
}

/**
 * The progress of a running session.
 *
 * WHY the current value changes with the condition: the bar of the rounds
 * counts rounds, the bar of the points counts points, and the bar of the
 * time counts minutes. The header shows the same number that the bar
 * measures.
 */
export function computeRoundProgress(input: ProgressInput): RoundProgress {
  const {
    config,
    currentRound,
    turnOrderLength,
    players,
    teams,
    gameStartTime,
    now,
    targetPointsLabel,
    targetMinutesLabel,
  } = input;

  let percentage = 0;
  let targetLabel = '';
  let currentVal = currentRound;

  if (config.endingCondition === 'rounds') {
    const totalTurns = config.targetRounds * turnOrderLength;
    percentage = (currentRound / totalTurns) * 100;
    targetLabel = `${totalTurns}`;
  } else if (config.endingCondition === 'points') {
    const topScore =
      config.teamMode === 'individual'
        ? Math.max(...players.map((p) => p.score), 0)
        : Math.max(...teams.map((t) => t.score), 0);
    percentage = (topScore / config.targetPoints) * 100;
    targetLabel = targetPointsLabel(config.targetPoints);
    currentVal = topScore;
  } else if (config.endingCondition === 'time' && gameStartTime) {
    const elapsedMs = now - gameStartTime;
    const targetMs = config.targetTimeMinutes * 60 * 1000;
    percentage = (elapsedMs / targetMs) * 100;
    targetLabel = targetMinutesLabel(config.targetTimeMinutes);
    currentVal = Math.floor(elapsedMs / 60000);
  }

  return { percentage, targetLabel, currentVal };
}
