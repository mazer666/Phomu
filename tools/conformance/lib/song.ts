/**
 * The song of the running round
 *
 * WHAT: the songs of the vector that is running and the song of the round
 * that the store shows.
 *
 * WHY the harness needs them: the store holds the **question** of the round
 * and not the song — the question view model of the core has no field for
 * the solution (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001). The rules of
 * a mode need the song, therefore the harness keeps the songs of the vector
 * and resolves the song of the round through the question of the store.
 *
 * WHY the song is read from the store and not from a mirror of the harness:
 * the song of the round belongs to the store. A mirror in the harness would
 * survive the actions that clear the song — the skipped song, the next round
 * — and the runner would measure itself instead of the shell. The regression
 * that this module prevents made 40 of the 64 portable vectors deviate.
 *
 * EXAMPLE: `currentSong()` returns `null` after `nextRound`, because the
 * store has cleared the question of the round.
 */
import { useGameStore } from '@/stores/game-store';
import type { PhomuSong } from '@/types/song';

import type { SongFixtures } from './situation';

/**
 * The songs of the vector that is running.
 *
 * WHY they are reset for every vector: the songs belong to the vector. A
 * vector that draws no song must not observe the song of the one before it.
 */
let songsOfVector: SongFixtures = new Map();

/**
 * Sets the songs of the vector that is running.
 *
 * @param fixtures - the songs of the vector, by identifier
 */
export function setSongFixtures(fixtures: SongFixtures): void {
  songsOfVector = fixtures;
}

/**
 * The song of the running round — the song the question of the store names.
 *
 * @returns {PhomuSong|null} the song of the round, `null` when the round has
 *   no song
 */
export function currentSong(): PhomuSong | null {
  const songId = useGameStore.getState().currentQuestion?.songId;
  if (!songId) return null;
  return songsOfVector.get(songId) ?? null;
}
