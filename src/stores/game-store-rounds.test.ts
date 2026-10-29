/**
 * Tests for the round log of the game store.
 *
 * WHAT: the rules that decide whether a finished round is written into the
 * round history of the store — `src/stores/game-store-rounds.ts`.
 *
 * WHY: the rule is the requirement GAME-005 — "a round with a drawn song is
 * written into the history, a round without a drawn song is not"
 * (docs/design/GAME-CONTRACT.md § 6.3). The store used to log a round only
 * when a **reveal** existed; the Rust base logs it when a **song** is drawn
 * (`core/phomu-core/src/session/rounds.rs:43-57`). The two disagreed, and
 * the disagreement was found by the conformance gate
 * (`core/phomu-conformance/vectors/web-shell/round-next-round-logs-history.json`).
 *
 * WHY the identity may be missing: the store holds no song — the question of
 * the round carries only the identifier of it. The identity of a round is
 * known when the reveal has been released; a round that was ended without a
 * reveal is logged without an identity.
 *
 * EXAMPLE: a round whose question was drawn but whose reveal was never
 * released is logged with `identity: null`.
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '@/stores/game-store';
import type { RoundQuestion, RoundReveal } from '@/core/types';

/**
 * A question of a round, as the store expects it.
 *
 * @param songId - the identifier of the drawn song
 * @returns {RoundQuestion}
 */
function questionOf(songId: string): RoundQuestion {
  return {
    phase: 'question',
    roundNumber: 1,
    mode: 'timeline',
    hints: ['', '', '', '', ''],
    options: [],
    identity: null,
    pointsPossible: 5,
    answersLocked: false,
    songId,
    media: {
      youtube: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      youtubeAlternatives: [],
      spotify: null,
      spotifyFreePreview: null,
      amazonMusic: null,
      amazonPrimePreview: null,
      coverLink: null,
      startSeconds: 0,
      endSeconds: 0,
    },
    context: {
      timelineYears: [],
      timelineSlots: [],
      genre: 'Rock',
      pack: null,
    },
  };
}

/**
 * The reveal of a round, as the store expects it.
 *
 * @returns {RoundReveal}
 */
function revealOf(): RoundReveal {
  return {
    phase: 'reveal',
    roundNumber: 1,
    mode: 'timeline',
    title: 'Example Song',
    artist: 'The Example',
    year: 1985,
    isCorrect: true,
    pointsAwarded: 5,
    timelineYears: [],
    song: null,
  };
}

/**
 * Puts the store into the state of a running round with one player.
 */
function startRound(): void {
  const store = useGameStore.getState();
  store.initSession();
  useGameStore.setState({
    players: [
      {
        id: 'p1',
        name: 'Ada',
        score: 0,
        teamId: undefined,
        isEliminated: false,
        isSpectator: false,
        isPilot: false,
      },
    ],
    turnOrder: ['p1'],
    currentTurnIndex: 0,
    currentRound: 1,
    roundPhase: 'question',
  });
}

describe('the round log of the store', () => {
  beforeEach(() => {
    startRound();
  });

  it('writes a round with a drawn song into the history', () => {
    useGameStore.getState().setQuestion(questionOf('s-a'), 'random');

    useGameStore.getState().nextRound();

    const history = useGameStore.getState().roundHistory;
    expect(history).toHaveLength(1);
    expect(history[0]?.roundNumber).toBe(1);
    expect(history[0]?.mode).toBe('timeline');
  });

  it('does not write a round without a drawn song into the history', () => {
    useGameStore.getState().nextRound();

    expect(useGameStore.getState().roundHistory).toHaveLength(0);
  });

  it('writes the identity of the reveal into the log entry', () => {
    useGameStore.getState().setQuestion(questionOf('s-a'), 'random');
    useGameStore.getState().setReveal(revealOf());

    useGameStore.getState().nextRound();

    const entry = useGameStore.getState().roundHistory[0];
    expect(entry?.identity).toEqual({
      title: 'Example Song',
      artist: 'The Example',
      year: 1985,
    });
  });

  it('writes a round without a reveal without an identity', () => {
    useGameStore.getState().setQuestion(questionOf('s-a'), 'random');

    useGameStore.getState().nextRound();

    expect(useGameStore.getState().roundHistory[0]?.identity).toBeNull();
  });

  it('clears the question of the round, so that the next round shows no song', () => {
    useGameStore.getState().setQuestion(questionOf('s-a'), 'random');

    useGameStore.getState().nextRound();

    // WHY: the next round must not show the song of the round before — the
    // anti-spoiler guarantee of the product (docs/qa/QA-02-SPOILER-FREENESS.md).
    expect(useGameStore.getState().currentQuestion).toBeNull();
    expect(useGameStore.getState().currentReveal).toBeNull();
  });

  it('takes the timeline of the round from the core', () => {
    const question = questionOf('s-a');
    question.context.timelineYears = [1970, 1980, 1990];

    useGameStore.getState().setQuestion(question, 'random');

    // WHY: the core owns the rule of the timeline — it builds the slots of
    // the round from it. The years it hands over with the question are the
    // truth; the timeline of the shell is the picture of it.
    expect(useGameStore.getState().timelineYears).toEqual([1970, 1980, 1990]);
  });
});
