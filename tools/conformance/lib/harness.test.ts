/**
 * Tests for the TypeScript conformance harness.
 *
 * WHAT: the harness replays the vectors against the web shell
 * (`tools/conformance/lib/harness.ts`). These tests pin the property that
 * makes the replay a measurement: **every vector observes its own
 * situation**.
 *
 * WHY: the harness kept the song of the round in a module variable that was
 * never reset. Every vector after the first one therefore observed the song
 * of the first vector — 40 of the 64 portable vectors deviated, and the
 * deviation was reported as a difference between the shell and the Rust
 * base, although the base was right. The song of the round belongs to the
 * store: the harness reads it from the question of the store now.
 *
 * EXAMPLE: a vector that draws a song observes that song; the vector that
 * follows it, which draws none, observes `null`.
 */
import { describe, expect, it } from 'vitest';

import { runVector } from './harness';
import type { Observation, Vector } from './types';

/**
 * The observation of a vector that asserts nothing.
 *
 * WHY: the harness needs the complete expectation of a vector, but these
 * tests read the observation and not the expectation.
 *
 * @returns {Observation}
 */
function emptyObservation(): Observation {
  return {
    phases: [],
    currentRound: 1,
    currentMode: 'timeline',
    currentSongId: null,
    currentSongSource: null,
    autoDrawIntent: false,
    playerScores: {},
    teamScores: {},
    playerTeams: {},
    teamMembers: {},
    turnOrder: [],
    currentTurnIndex: 0,
    winnerId: null,
    isGameOver: false,
    timelineYears: [],
    playedSongIds: [],
    answers: [],
    roundCount: 0,
    totalXP: 0,
    censorHint: null,
    filteredSongIds: null,
    error: null,
  };
}

/**
 * A vector of the corpus, reduced to the situation that the test needs.
 *
 * @param id - the identifier of the vector
 * @param currentSong - the song of the round, `null` for a round without one
 * @returns {Vector}
 */
function vectorOf(id: string, currentSong: string | null): Vector {
  return {
    schemaVersion: 1,
    id,
    area: 'test',
    title: id,
    portable: true,
    given: {
      config: { selectedModes: ['timeline'] },
      players: [{ id: 'p1', name: 'Ada' }],
      turnOrder: ['p1'],
      currentRound: 1,
      roundPhase: 'question',
      currentMode: 'timeline',
      currentSong,
      songs: {
        's-a': {
          id: 's-a',
          title: 'Example Song',
          artist: 'The Example',
          year: 1985,
        },
      },
    },
    when: [],
    then: emptyObservation(),
  };
}

describe('the song of the round in the harness', () => {
  it('observes the song that the vector draws', () => {
    const observation = runVector(vectorOf('test/with-song', 's-a'));

    expect(observation.currentSongId).toBe('s-a');
  });

  it('observes no song in a vector that draws none', () => {
    const observation = runVector(vectorOf('test/without-song', null));

    expect(observation.currentSongId).toBeNull();
  });

  it('does not carry the song of the previous vector into the next one', () => {
    // WHY: the regression of the harness — the song of the round leaked from
    // one vector into the next one and made 40 vectors deviate.
    runVector(vectorOf('test/first', 's-a'));

    const observation = runVector(vectorOf('test/second', null));

    expect(observation.currentSongId).toBeNull();
  });

  it('observes the song of the vector and not the song of the one before', () => {
    runVector(vectorOf('test/first', 's-a'));

    const observation = runVector(vectorOf('test/second', 's-a'));

    expect(observation.currentSongId).toBe('s-a');
  });
});
