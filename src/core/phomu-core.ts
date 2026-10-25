/**
 * The bridge to the Rust base.
 *
 * WHAT: the loader of the WebAssembly module and the typed calls into it.
 *
 * WHY the shell talks to the base instead of to the catalogue: the
 * anti-spoiler guarantee is structural. The base draws the song, builds the
 * question and hands over a view model that has no field for the solution —
 * the shell never holds the catalogue and never sees an answer before the
 * round is over (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * EXAMPLE: `drawRound` returns the question of a round. It carries the
 * censored hints, the options and the media — and no title, no artist and
 * no year.
 */
'use client';

import init, {
  phomu_abi_version,
  phomu_session_cheat,
  phomu_session_disclose,
  phomu_session_init_timeline,
  phomu_session_remove_timeline_year,
  phomu_session_draw,
  phomu_session_draw_by_id,
  phomu_session_end,
  phomu_session_new,
  phomu_session_next_round,
  phomu_session_reveal,
  phomu_session_start,
  phomu_session_submit,
} from './generated/phomu_wasm.js';
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

/**
 * The failure of the base, as the shell reads it.
 *
 * WHY the code and the key and not a sentence: the base supplies the keys,
 * the shell supplies the texts (docs/design/BUILD-CONTRACT.md § 6.1).
 */
export class CoreError extends Error {
  /** The stable numeric code of the failure. */
  readonly code: number;
  /** The i18n message key of the failure. */
  readonly messageKey: string;

  constructor(code: number, messageKey: string, reason: string) {
    super(`${messageKey}: ${reason}`);
    this.name = 'CoreError';
    this.code = code;
    this.messageKey = messageKey;
  }
}

/** The document the bridge throws when the base refuses a command. */
interface BridgeFailure {
  code?: number;
  messageKey?: string;
  context?: Record<string, string>;
}

/**
 * Turns the failure of the bridge into a [`CoreError`].
 *
 * WHY the bridge throws a JSON document: the wire format of the bridge is
 * JSON (BRIDGE-110). The shell reads the code and the key out of it.
 */
function toCoreError(failure: unknown): CoreError {
  if (typeof failure === 'string') {
    try {
      const parsed = JSON.parse(failure) as BridgeFailure;
      const context = parsed.context ?? {};
      const reason = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      return new CoreError(
        parsed.code ?? 0,
        parsed.messageKey ?? 'errors.generic',
        reason
      );
    } catch {
      return new CoreError(0, 'errors.generic', failure);
    }
  }
  return new CoreError(0, 'errors.generic', String(failure));
}

/**
 * Runs a call into the base and turns its failure into a [`CoreError`].
 *
 * WHY the helper is exported: every call into the module crosses the same
 * boundary and fails the same way.
 */
export function callBridge<T>(action: () => T): T {
  try {
    return action();
  } catch (failure) {
    throw toCoreError(failure);
  }
}

/**
 * Parses a payload of the bridge.
 *
 * WHY the cast: the bridge marshals the values of the base into JSON. The
 * types of this module describe that wire format.
 */
export function parseBridge<T>(document: string): T {
  return JSON.parse(document) as T;
}

/** The URL of the WebAssembly module. */
function moduleUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}/wasm/phomu_core_bg.wasm`;
}

/**
 * The bracket of the base versions this shell accepts.
 *
 * WHY the bracket: the base and the shell are released independently. A
 * shell that runs against a base it was not written for must fail *closed* —
 * at start-up, not in the middle of a round
 * (docs/design/BUILD-CONTRACT.md § 3.2).
 */
const ABI_BRACKET = { min: '1.0.0', max: '1.99.0' };

/**
 * Compares two versions of the surface.
 *
 * @param left - The first version.
 * @param right - The second version.
 * @returns A negative number when `left` is older, zero when they are
 *   equal and a positive number when `left` is newer.
 */
function compareVersions(left: string, right: string): number {
  const parts = (version: string) =>
    version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const leftParts = parts(left);
  const rightParts = parts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/**
 * Checks the version of the base against the bracket of the shell.
 *
 * WHY the check is a failure and not a warning: a base that the shell does
 * not understand could hand over a payload the shell renders wrongly — and
 * a wrong question is a spoiler.
 *
 * @throws {CoreError} When the version of the base lies outside the bracket.
 */
function assertAcceptedVersion(): void {
  const version = phomu_abi_version();
  if (
    compareVersions(version, ABI_BRACKET.min) < 0 ||
    compareVersions(version, ABI_BRACKET.max) > 0
  ) {
    throw new CoreError(
      0,
      'errors.invalidConfiguration',
      `the base ${version} lies outside the bracket ${ABI_BRACKET.min}..${ABI_BRACKET.max}`
    );
  }
}

/** The promise of the loaded module — the module is loaded once. */
let loading: Promise<void> | null = null;

/**
 * Loads the WebAssembly module of the base.
 *
 * WHY the module is a static asset: the web shell is a static export and
 * has no server that could host the base
 * (docs/design/BUILD-CONTRACT.md § 2.4, rule B-7).
 *
 * EXAMPLE: `await loadCore()` before the first round is drawn.
 */
export function loadCore(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const response = await fetch(moduleUrl());
      if (!response.ok) {
        throw new CoreError(
          1203,
          'errors.invalidSongData',
          `the base could not be loaded (${response.status})`
        );
      }
      const bytes = await response.arrayBuffer();
      await init({ module_or_path: bytes });
      assertAcceptedVersion();
    })();
  }
  return loading;
}

/**
 * Starts the timeline of the round with the given years.
 */
export function initTimeline(handle: bigint, years: number[]): number[] {
  return callBridge(() => {
    const payload = parseBridge<{ timelineYears: number[] }>(
      phomu_session_init_timeline(handle, new Int32Array(years))
    );
    return payload.timelineYears;
  });
}

/**
 * Removes a year from the timeline of the round.
 */
export function removeTimelineYear(handle: bigint, year: number): number[] {
  return callBridge(() => {
    const payload = parseBridge<{ timelineYears: number[] }>(
      phomu_session_remove_timeline_year(handle, year)
    );
    return payload.timelineYears;
  });
}

/**
 * Creates a session in the base.
 *
 * @param config - The configuration of the lobby.
 * @param players - The players of the session.
 * @param teams - The teams of the session.
 * @param catalogue - The handle of the catalogue.
 * @param seed - The seed of the generator.
 * @param nowMs - The time of the session in milliseconds.
 * @returns The handle of the session.
 */
export function createSession(
  config: unknown,
  players: unknown[],
  teams: unknown[],
  catalogue: bigint,
  seed: number,
  nowMs: number
): bigint {
  return callBridge(() =>
    phomu_session_new(
      JSON.stringify(config),
      JSON.stringify({ players }),
      JSON.stringify({ teams }),
      catalogue,
      seed,
      nowMs
    )
  );
}

/**
 * Starts the game in the base.
 */
export function startGame(handle: bigint, nowMs: number): RoundDrawing {
  return callBridge(() => parseBridge<RoundDrawing>(phomu_session_start(handle, nowMs)));
}

/**
 * Draws a song and opens the question phase.
 *
 * WHY the result has no field for the solution: the base builds the question
 * view model and the bridge hands it over unchanged.
 */
export function drawRound(handle: bigint, source: 'random' | 'qr'): RoundQuestion {
  return callBridge(() => parseBridge<RoundQuestion>(phomu_session_draw(handle, source)));
}

/**
 * Draws a song by its identifier — the flow of a scanned card.
 */
export function drawRoundById(handle: bigint, songId: string): RoundQuestion {
  return callBridge(() => parseBridge<RoundQuestion>(phomu_session_draw_by_id(handle, songId)));
}

/**
 * Submits the choice of a player and evaluates it in the base.
 *
 * WHY the choice travels instead of the answer: the Lyrics Labyrinth asks
 * for the line the player picked; only the base may know which line was the
 * invented one (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
 */
export function submitChoice(
  handle: bigint,
  choice: AnswerChoice,
  answeredInSeconds?: number
): AnswerResult {
  return callBridge(() =>
    parseBridge<AnswerResult>(
      phomu_session_submit(handle, JSON.stringify(choice), answeredInSeconds ?? null)
    )
  );
}

/**
 * Uses a cheat of the round.
 *
 * WHY the base decides: the cheats need the song — the decade hint needs
 * the year, the option halving needs the correct mood, the joker needs the
 * slots of the timeline.
 *
 * @param handle - The handle of the session.
 * @param cheat - The cheat the player uses.
 * @returns What the shell has to draw.
 */
export function applyCheat(handle: bigint, cheat: CheatKind): CheatOutcome {
  return callBridge(() => parseBridge<CheatOutcome>(phomu_session_cheat(handle, cheat)));
}

/**
 * Asks the base for the identity of the song of the round.
 *
 * WHY a separate command: the question view model has no field for the
 * solution. The modes that need the identity during the round — the
 * Hint-Master lets the pilot show the solution, the Survivor sells the name
 * of the artist — ask the base for it explicitly.
 *
 * @param handle - The handle of the session.
 * @returns The identity of the song, or `null` when there is none.
 */
export function discloseIdentity(handle: bigint): SongIdentity | null {
  return callBridge(() => {
    const payload = parseBridge<{ identity: SongIdentity | null }>(
      phomu_session_disclose(handle)
    );
    return payload.identity;
  });
}

/**
 * Releases the solution of the round.
 */
export function revealRound(handle: bigint): RoundReveal {
  return callBridge(() => parseBridge<RoundReveal>(phomu_session_reveal(handle)));
}

/**
 * Closes the round and prepares the next one.
 */
export function nextRound(handle: bigint, nowMs: number): RoundView {
  return callBridge(() => parseBridge<RoundView>(phomu_session_next_round(handle, nowMs)));
}

/**
 * Ends the game.
 */
export function endGame(handle: bigint, winnerId?: string): string {
  return callBridge(() => phomu_session_end(handle, winnerId ?? null));
}
