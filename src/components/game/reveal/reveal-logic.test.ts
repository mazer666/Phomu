/**
 * The pure logic of the reveal phase.
 *
 * WHY: these tests pin the rules that were extracted from
 * `src/components/game/RevealPhase.tsx` into `reveal/reveal-logic.ts`. The
 * winner of the game and the points of the round decide what the table
 * sees — and they must not change with a refactoring of the drawing.
 */
import { describe, it, expect } from 'vitest';
import {
  buildTimelineHeadlineKeys,
  pickVariantIndex,
  pointsOfRound,
  resolveWinner,
} from '@/components/game/reveal/reveal-logic';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player, Team } from '@/types/player';

/** A player with the given score. */
function player(id: string, score: number): Player {
  return {
    id,
    name: `Player ${id}`,
    score,
    isEliminated: false,
    isSpectator: false,
    isPilot: false,
  };
}

/** A team with the given score. */
function team(id: string, score: number): Team {
  return { id, name: `Team ${id}`, playerIds: [], score, color: '#ff6b35' };
}

describe('the variant of a text', () => {
  it('picks the same variant for the same seed', () => {
    expect(pickVariantIndex('song-1', 5)).toBe(pickVariantIndex('song-1', 5));
  });

  it('picks an index inside the range', () => {
    const index = pickVariantIndex('song-1', 5);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(5);
  });

  it('refuses to pick without a variant', () => {
    expect(() => pickVariantIndex('song-1', 0)).toThrow();
  });
});

describe('the headlines of the timeline', () => {
  it('knows the headlines of every decade', () => {
    expect(buildTimelineHeadlineKeys(1985).length).toBeGreaterThan(0);
    expect(buildTimelineHeadlineKeys(2020).length).toBeGreaterThan(0);
  });

  it('falls back to the generic headlines of a decade without its own', () => {
    const generic = buildTimelineHeadlineKeys(1985).length;
    const other = buildTimelineHeadlineKeys(1875).length;
    expect(other).toBeGreaterThan(0);
    expect(other).toBeLessThanOrEqual(generic);
  });
});

describe('the winner of the game', () => {
  it('shows no winner while the game runs', () => {
    const winner = resolveWinner({
      players: [player('a', 3)],
      teams: [],
      winCondition: 10,
      endingCondition: 'points',
      isGameOver: false,
    });
    expect(winner.showWinUI).toBe(false);
    expect(winner.kind).toBe('none');
    expect(winner.name).toBeNull();
  });

  it('shows the winner when the game is over', () => {
    const winner = resolveWinner({
      players: [player('a', 3)],
      teams: [],
      winCondition: 10,
      endingCondition: 'rounds',
      isGameOver: true,
    });
    expect(winner.showWinUI).toBe(true);
    expect(winner.kind).toBe('player');
    expect(winner.name).toBe('Player a');
  });

  it('shows the winner when a player reaches the target', () => {
    const winner = resolveWinner({
      players: [player('a', 10)],
      teams: [],
      winCondition: 10,
      endingCondition: 'points',
      isGameOver: false,
    });
    expect(winner.showWinUI).toBe(true);
    expect(winner.kind).toBe('player');
  });

  it('shows the winner when a team reaches the target', () => {
    const winner = resolveWinner({
      players: [player('a', 1)],
      teams: [team('t', 10)],
      winCondition: 10,
      endingCondition: 'points',
      isGameOver: false,
    });
    expect(winner.showWinUI).toBe(true);
    expect(winner.kind).toBe('team');
    expect(winner.name).toBe('Team t');
  });

  it('prefers the team over the player when both play', () => {
    const winner = resolveWinner({
      players: [player('a', 20)],
      teams: [team('t', 5)],
      winCondition: 10,
      endingCondition: 'points',
      isGameOver: true,
    });
    expect(winner.kind).toBe('team');
    expect(winner.name).toBe('Team t');
  });

  it('ignores the score when the game does not end on points', () => {
    const winner = resolveWinner({
      players: [player('a', 99)],
      teams: [],
      winCondition: 10,
      endingCondition: 'rounds',
      isGameOver: false,
    });
    expect(winner.showWinUI).toBe(false);
  });
});

describe('the points of the round', () => {
  const answers: PlayerAnswer[] = [
    { playerId: 'a', answer: 'right', isCorrect: true, pointsAwarded: 3 },
    { playerId: 'b', answer: 'wrong', isCorrect: false, pointsAwarded: 0 },
  ];

  it('counts the points of the player', () => {
    expect(pointsOfRound(answers, 'a')).toBe(3);
  });

  it('counts no points for a player without an answer', () => {
    expect(pointsOfRound(answers, 'c')).toBe(0);
  });
});
