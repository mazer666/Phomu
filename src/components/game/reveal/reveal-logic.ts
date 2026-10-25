/**
 * The pure logic of the reveal phase.
 *
 * WHAT: the choice of the variants of the texts, the winner of the game and
 * the points that a player won in the round.
 *
 * WHY: the reveal is the phase that releases the solution, and the rule of
 * the winner decides what the table sees. As a pure function it can be
 * tested without a DOM — and the spoiler boundary stays where it is: the
 * component only ever receives the song of the reveal.
 *
 * EXAMPLE: `resolveWinner` answers the question "team or player?" without
 * knowing the language of the session.
 */
import { hashSeed } from '@/utils/feedback-messages';
import {
  TIMELINE_DECADE_KEYS,
  TIMELINE_GENERIC_KEYS,
  type TranslationKey,
} from '@/i18n/variant-keys';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player, Team } from '@/types/player';

/**
 * The index of the variant that a seed picks.
 *
 * WHY the seed: the variant of a song is the same in every session and in
 * every language — only the wording is translated.
 *
 * @param seed - The seed of the choice.
 * @param length - The number of variants.
 * @throws When there is no variant to pick from.
 */
export function pickVariantIndex(seed: string, length: number): number {
  if (length <= 0) throw new Error('Cannot pick from empty range');
  return hashSeed(seed) % length;
}

/**
 * The keys of the headlines of the timeline.
 *
 * The text itself comes from the translation (placeholder: {{year}}).
 *
 * @param year - The year of the song.
 */
export function buildTimelineHeadlineKeys(year: number): TranslationKey[] {
  const decade = Math.floor(year / 10) * 10;
  return [...TIMELINE_GENERIC_KEYS, ...(TIMELINE_DECADE_KEYS[decade] ?? [])];
}

/** Who won the game. */
export type WinnerKind = 'team' | 'player' | 'none';

/** The winner of the game, without the text. */
export interface WinnerResolution {
  /** Whether the screen of the winner is shown. */
  readonly showWinUI: boolean;
  /** Who won. */
  readonly kind: WinnerKind;
  /** The name of the winner. */
  readonly name: string | null;
}

/** Everything the winner of the game depends on. */
export interface WinnerInput {
  /** The players of the session. */
  readonly players: Player[];
  /** The teams of the session. */
  readonly teams: Team[];
  /** The score that ends the game. */
  readonly winCondition: number;
  /** The condition that ends the game. */
  readonly endingCondition: 'rounds' | 'points' | 'time';
  /** Whether the game is over. */
  readonly isGameOver: boolean;
}

/**
 * The winner of the game.
 *
 * WHY a team wins over a player: a session with teams is a team game, and
 * the table wants the name of the team.
 */
export function resolveWinner(input: WinnerInput): WinnerResolution {
  const { players, teams, winCondition, endingCondition, isGameOver } = input;

  const showWinUI =
    isGameOver ||
    (endingCondition === 'points' &&
      (players.some((p) => p.score >= winCondition) ||
        teams.some((t) => t.score >= winCondition)));

  if (!showWinUI) {
    return { showWinUI: false, kind: 'none', name: null };
  }

  const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
  const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];
  const isTeamMode = teams.length > 0;

  if (isTeamMode && topTeam) {
    return { showWinUI: true, kind: 'team', name: topTeam.name };
  }
  if (topPlayer) {
    return { showWinUI: true, kind: 'player', name: topPlayer.name };
  }
  return { showWinUI: true, kind: 'none', name: null };
}

/**
 * The points that a player won in the running round.
 *
 * @param answers - The answers of the round.
 * @param playerId - The identifier of the player.
 */
export function pointsOfRound(
  answers: PlayerAnswer[],
  playerId: string
): number {
  return answers.find((a) => a.playerId === playerId)?.pointsAwarded ?? 0;
}
