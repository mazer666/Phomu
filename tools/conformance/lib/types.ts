/**
 * Conformance vector — the shared data model
 *
 * WHY: the TypeScript runner and the Rust runner must read the same vectors
 * and produce the same observation. The types in this file are the contract
 * between them; the JSON schema of the same shape lives in
 * `core/phomu-conformance/vectors/schema.json`.
 *
 * EXAMPLE: a vector is a situation (given), a list of inputs (when) and the
 *          expected result (then).
 */

// ─── Song fixtures ─────────────────────────────────────────────────

/** The song properties a mode rule or a filter may read. */
export interface VectorSong {
  id: string;
  title?: string;
  artist?: string;
  year: number;
  country?: string;
  genre?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mood?: string[];
  packs?: string[];
  hints?: string[];
  lyrics?: { real: string[]; fake: string | string[] } | null;
  isOneHitWonder?: boolean;
  supportedModes?: string[];
  isQRCompatible?: boolean;
  links?: { youtube?: string; coverLink?: string };
}

// ─── The situation ─────────────────────────────────────────────────

export interface VectorPlayer {
  id: string;
  name?: string;
  score?: number;
  teamId?: string | null;
  isEliminated?: boolean;
  isSpectator?: boolean;
  isPilot?: boolean;
}

export interface VectorTeam {
  id: string;
  name?: string;
  playerIds?: string[];
  score?: number;
  color?: string;
}

/** The state the vector starts from. Every field is optional. */
export interface VectorGiven {
  config?: Record<string, unknown>;
  players?: VectorPlayer[];
  teams?: VectorTeam[];
  turnOrder?: string[];
  currentTurnIndex?: number;
  currentRound?: number;
  roundPhase?: string;
  currentMode?: string;
  currentSong?: string | null;
  timelineYears?: number[];
  playedSongIds?: string[];
  currentSongSource?: 'random' | 'qr' | null;
  autoDrawIntent?: boolean;
  gameStartTime?: number | null;
  totalXP?: number;
  isGameOver?: boolean;
  winnerId?: string | null;
  /** The songs this vector may draw — keyed by song id. */
  songs?: Record<string, VectorSong>;
  /** The catalogue a `filterSongs` probe runs against. */
  catalogue?: VectorSong[];
}

// ─── The inputs ────────────────────────────────────────────────────

/** The answer of a player, normalised across the six modes. */
export type VectorAnswer =
  | { kind: 'timeline'; slot: number | null }
  | {
      kind: 'hint-master';
      level: number;
      knew: 'both' | 'artist' | 'title' | 'none';
    }
  | { kind: 'lyrics'; picked: 'fake' | 'real' }
  | { kind: 'lyrics-bonus'; claimed: boolean }
  | { kind: 'vibe-check'; mood: string; cheatUsed?: boolean }
  | { kind: 'survivor'; guessedOneHit: boolean }
  | {
      kind: 'cover-confusion';
      hintsUsed: number;
      pickedArtist?: string;
      selfAssess?: boolean;
    }
  | { kind: 'cover-confusion-variation'; guessCover: boolean };

export type VectorOp =
  | { op: 'startGame' }
  | { op: 'drawSong'; songId: string; source?: 'random' | 'qr' }
  | { op: 'advancePhase'; phase: string }
  | {
      op: 'submitAnswer';
      playerId: string;
      answer: string;
      isCorrect: boolean;
      pointsAwarded: number;
      answeredInSeconds?: number;
    }
  | { op: 'awardPoints'; entityId: string; points: number }
  | { op: 'nextRound' }
  | { op: 'endGame'; winnerId?: string | null }
  | { op: 'skipBrokenSong' }
  | { op: 'initTimeline'; years: number[] }
  | { op: 'addTimelineYear'; year: number }
  | { op: 'removeTimelineYear'; year: number }
  | { op: 'assignPlayerToTeam'; playerId: string; teamId: string | null }
  | { op: 'removeTeam'; teamId: string }
  | { op: 'resetScores' }
  | { op: 'setConfig'; config: Record<string, unknown> }
  | { op: 'cheat'; cheat: string }
  | { op: 'setNow'; ms: number }
  | {
      op: 'answer';
      mode: string;
      answer: VectorAnswer;
      answeredInSeconds?: number;
    }
  | { op: 'censorHint'; hint: string; artist: string; title: string }
  | {
      op: 'filterSongs';
      options: {
        selectedPacks?: string[];
        difficulty?: string;
        onlyQRCompatible?: boolean;
        currentMode?: string;
      };
    };

// ─── The observation ───────────────────────────────────────────────

export interface ObservedAnswer {
  playerId: string;
  /** The label of the answer as the implementation stores it. */
  answer: string;
  /** The outcome class of the answer — "correct" or "incorrect". */
  outcome: string;
  isCorrect: boolean;
  pointsAwarded: number;
  answeredInSeconds: number | null;
}

/**
 * What a runner observes after the inputs of a vector.
 *
 * Every field is deterministic: nothing here depends on a clock, a random
 * number generator or a generated identifier.
 */
export interface Observation {
  /** The phase after every input, in order. */
  phases: string[];
  currentRound: number;
  currentMode: string;
  currentSongId: string | null;
  currentSongSource: string | null;
  autoDrawIntent: boolean;
  playerScores: Record<string, number>;
  teamScores: Record<string, number>;
  /** The team of every player. */
  playerTeams: Record<string, string | null>;
  /** The members of every team. */
  teamMembers: Record<string, string[]>;
  /** The order in which the players resp. the teams take their turn. */
  turnOrder: string[];
  currentTurnIndex: number;
  winnerId: string | null;
  isGameOver: boolean;
  timelineYears: number[];
  playedSongIds: string[];
  answers: ObservedAnswer[];
  /** The number of logged rounds. */
  roundCount: number;
  totalXP: number;
  /** The result of the last `censorHint` probe, if the vector had one. */
  censorHint: string | null;
  /** The result of the last `filterSongs` probe, if the vector had one. */
  filteredSongIds: string[] | null;
  /**
   * The error situation of the last refused input.
   *
   * Two namespaces share this field and are told apart by the code:
   *
   * - the **vector layer** names its failures (`"UNKNOWN_SONG"`,
   *   `"NO_CURRENT_SONG"`): the input could not be executed at all and the
   *   replay ends;
   * - the **core** carries the numeric code of its error (`"1102"` with the
   *   message key `"errors.answersNotLocked"`): the input was executed and
   *   the rules refused it — a behaviour of the implementation and therefore
   *   part of the comparison.
   *
   * The reference implementation has no typed errors of its own: it ignores
   * an unknown player or an unknown year silently
   * (`src/stores/game-store.ts:463`, `:611`). It therefore reports `null`
   * where the Rust base reports a refusal — a documented divergence, not a
   * gap in the proof.
   */
  error: { code: string; message: string } | null;
}

// ─── The vector ────────────────────────────────────────────────────

export interface Vector {
  schemaVersion: number;
  id: string;
  area: string;
  title: string;
  /** Where the behaviour is documented in the TypeScript reference. */
  reference?: string;
  /**
   * `true` — both implementations must produce the same observation.
   * `false` — the vector documents a known divergence; it is reported
   * separately and does not fail the gate.
   */
  portable: boolean;
  /** Why the vector is not portable — required when `portable` is `false`. */
  portabilityNote?: string;
  given: VectorGiven;
  when: VectorOp[];
  then: Observation;
}

/** The index of the corpus — the ordered list of the vector files. */
export interface VectorIndex {
  schemaVersion: number;
  vectors: {
    id: string;
    file: string;
    area: string;
    title: string;
    portable: boolean;
  }[];
}

/** The result file of a runner. */
export interface RunnerResult {
  runner: string;
  schemaVersion: number;
  results: {
    id: string;
    area: string;
    portable: boolean;
    observation: Observation;
  }[];
}
