/**
 * The session of the core.
 *
 * WHAT: the round of the game, as the base plays it — the session is
 * created, the songs are drawn, the answers are evaluated and the solution
 * is released.
 *
 * WHY the base owns the round: the anti-spoiler guarantee is structural. The
 * base draws the song, builds the question and hands over a view model that
 * has no field for the solution. The shell never holds the catalogue and
 * never sees an answer before the player has answered
 * (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * EXAMPLE: `drawRandom` returns the question of a round — the censored
 * hints, the options of the mode and the media. No title, no artist, no
 * year.
 */
'use client';

import {
  applyCheat as applyCheatInBase,
  createSession,
  discloseIdentity,
  drawRound,
  drawRoundById,
  endGame,
  initTimeline,
  addTimelineYear as addTimelineYearInBase,
  nextRound,
  removeTimelineYear,
  revealRound,
  startGame,
  submitChoice,
  timeoutRound,
} from './phomu-core';
import { catalogueYearScaleOfBase, openCatalogue } from './catalogue-service';
import type {
  AnswerChoice,
  AnswerResult,
  CheatKind,
  CheatOutcome,
  RoundDrawing,
  RoundQuestion,
  RoundReveal,
  RoundView,
  SongIdentity,
} from './types';

/** The configuration of the lobby, as the base reads it. */
export type CoreConfig = Record<string, unknown>;

/** The player of the session, as the base reads it. */
export interface CorePlayer {
  id: string;
  name: string;
  teamId?: string;
  isPilot?: boolean;
  isSpectator?: boolean;
}

/** The team of the session, as the base reads it. */
export interface CoreTeam {
  id: string;
  name: string;
  playerIds: string[];
}

/** The handle of the session in the base. */
let session: bigint | null = null;

/**
 * Creates the session of the game in the base.
 *
 * WHY a new session per game: the base draws the modes and the songs from
 * its own generator, and the generator starts with the seed of the game.
 *
 * @param config - The configuration of the lobby.
 * @param players - The players of the game.
 * @param teams - The teams of the game.
 * @returns The handle of the session.
 */
export async function openSession(
  config: CoreConfig,
  players: CorePlayer[],
  teams: CoreTeam[]
): Promise<RoundDrawing> {
  const handle = await openCatalogue();
  const seed = Math.floor(Math.random() * 0xffffffff);
  session = createSession(config, players, teams, handle, seed, Date.now());
  // The base draws the mode of the first round — the shell only shows it.
  return startGame(session, Date.now());
}

/**
 * The handle of the running session.
 *
 * @returns The handle, or `null` when no game is running.
 */
export function currentSession(): bigint | null {
  return session;
}

/**
 * Draws a song and opens the question phase.
 *
 * @returns The question of the round — without the solution.
 */
export async function drawRandom(): Promise<RoundQuestion> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return drawRound(session, 'random');
}

/**
 * Draws a song by its identifier — the flow of a scanned card.
 *
 * @param songId - The identifier of the song.
 * @returns The question of the round — without the solution.
 */
export async function drawById(songId: string): Promise<RoundQuestion> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return drawRoundById(session, songId);
}

/**
 * Submits the choice of a player and evaluates it in the base.
 *
 * @param choice - What the player chose.
 * @param answeredInSeconds - How long the player needed, if the mode
 *   measures the time.
 * @returns The score of the answer and the feedback of the round.
 */
export async function submit(
  choice: AnswerChoice,
  answeredInSeconds?: number
): Promise<AnswerResult> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return submitChoice(session, choice, answeredInSeconds);
}

/**
 * The years of the catalogue — the scale of the Timeline mode.
 */
export async function yearScale(): Promise<number[]> {
  const catalogue = await openCatalogue();
  return catalogueYearScaleOfBase(catalogue);
}

/**
 * Starts the timeline of the round with the given years.
 *
 * @param years - The three years the timeline starts with.
 * @returns The years of the timeline.
 */
export async function startTimeline(years: number[]): Promise<number[]> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return initTimeline(session, years);
}

/**
 * Removes a year from the timeline of the round.
 *
 * @param year - The year the player removes.
 * @returns The years of the timeline.
 */
export async function dropTimelineYear(year: number): Promise<number[]> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return removeTimelineYear(session, year);
}

/**
 * Adds a year to the timeline of the round.
 *
 * WHY the command exists: the core adds the year of a correct answer on its
 * own. The shell adds a year in one case only — when the player takes a
 * year away and puts it back. The core has to learn about it, otherwise the
 * two timelines drift apart.
 *
 * @param year - The year that is added.
 * @returns The years of the timeline.
 */
export async function addTimelineYear(year: number): Promise<number[]> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return addTimelineYearInBase(session, year);
}

/**
 * Uses a cheat of the round.
 *
 * @param kind - The cheat the player uses.
 * @returns What the shell has to draw.
 */
export async function applyCheat(kind: CheatKind): Promise<CheatOutcome> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return applyCheatInBase(session, kind);
}

/**
 * Asks the base for the identity of the song of the round.
 *
 * WHY the modes ask for it: the question view model has no field for the
 * solution. The Hint-Master lets the pilot show the solution before the
 * table answers, and the Survivor sells the name of the artist.
 *
 * @returns The identity of the song, or `null` when there is none.
 */
export async function disclose(): Promise<SongIdentity | null> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return discloseIdentity(session);
}

/**
 * Releases the solution of the round.
 *
 * @returns The reveal of the round.
 */
export async function reveal(): Promise<RoundReveal> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return revealRound(session);
}

/**
 * Ends the question round without an answer — the timeout.
 *
 * WHY the command exists: the core refuses to release the solution while the
 * answers are not locked in (C-3). A round that nobody answered — because
 * the round timed out, because the table skipped the answer or because a
 * card was mis-scanned — still has to be closed. The timeout locks the round
 * and releases the solution in one go.
 *
 * @returns The reveal of the round.
 */
export async function timeout(): Promise<RoundReveal> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return timeoutRound(session);
}

/**
 * Closes the round and prepares the next one.
 *
 * @returns The view of the next round.
 */
export async function advance(): Promise<RoundView> {
  if (session === null) {
    throw new Error('no game is running');
  }
  return nextRound(session, Date.now());
}

/**
 * Ends the game in the base.
 *
 * @param winnerId - The winner of the game, if there is one.
 */
export async function finish(winnerId?: string): Promise<void> {
  if (session === null) {
    return;
  }
  endGame(session, winnerId);
  session = null;
}
