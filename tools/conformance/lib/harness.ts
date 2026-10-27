/**
 * The TypeScript conformance harness
 *
 * WHY: the game rules of the reference live in a Zustand store
 * (`src/stores/game-store.ts`) and in pure mode rules
 * (`src/utils/mode-rules.ts`). Both can be called without React. The
 * harness therefore drives the **real** store actions of the reference — it
 * does not re-implement a single rule.
 *
 * WHAT: the harness
 *   1. installs a deterministic environment (a memory-only `localStorage`,
 *      a controllable clock — nothing else in the reference depends on the
 *      wall clock or on a random number generator in the covered rules),
 *   2. builds the situation of the vector (`given`) in the store,
 *   3. executes the inputs of the vector (`when`) through the store actions
 *      and the extracted mode rules,
 *   4. observes the resulting state (`then`).
 *
 * EXAMPLE: `runVector(vector)` returns the observation of one vector.
 */
import './environment';
import { resetClock, setClock } from './environment';
import { useGameStore } from '@/stores/game-store';
import type {
  GameConfig,
  GameState,
  PlayerAnswer,
  RoundPhase,
} from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import type { PhomuSong } from '@/types/song';
import type { RoundQuestion } from '@/core/types';
import { censorHint } from '@/utils/censor-utils';
import { buildSituation, buildSong, toModeSong } from './situation';
import { currentSong, setSongFixtures } from './song';
import { filterSongs } from '@/utils/song-picker';
import {
  answerLabel,
  evaluateModeAnswer,
  resolveAnswerPoints,
  timelineAnswerEffect,
  CHEAT_PENALTY_HINT_MASTER_MUSIC,
  CHEAT_PENALTY_SURVIVOR,
  CHEAT_PENALTY_TIMELINE_DECADE,
  CHEAT_PENALTY_TIMELINE_JOKER,
} from '@/utils/mode-rules';
import type { ModeSong } from '@/utils/mode-rules';
import type {
  Observation,
  ObservedAnswer,
  Vector,
  VectorOp,
  VectorSong,
} from './types';

// ─── The deterministic environment ─────────────────────────────────

/**
 * Installs the deterministic environment of the runner.
 *
 * WHY: the memory-only `localStorage` and the controllable clock are
 * installed by `./environment` — before the store is imported, because the
 * persist middleware resolves its storage when the store is created. The
 * clock is needed for the `time` ending condition
 * (`src/stores/game-store.ts`:317-322).
 */
function installEnvironment(): void {
  // The memory-only `localStorage` is installed by `./environment` at import
  // time — the persist middleware resolves its storage when the store is
  // created. Here only the clock is reset, so that every vector starts from
  // the same instant.
  resetClock();
}

// ─── Song fixtures ─────────────────────────────────────────────────

/** The default hints of a song fixture — the type demands five. */
const DEFAULT_HINTS = ['', '', '', '', ''];

// ─── The situation ─────────────────────────────────────────────────

// ─── The inputs ────────────────────────────────────────────────────

/** The error of a vector that cannot be executed. */
class VectorError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'VectorError';
  }
}

/**
 * Executes one input against the store.
 *
 * @param op - the input of the vector
 * @param vector - the vector the input belongs to
 */
function applyOp(op: VectorOp, vector: Vector): void {
  const store = useGameStore.getState();

  switch (op.op) {
    case 'startGame':
      store.startGame();
      return;
    case 'drawSong': {
      const fixture = vector.given.songs?.[op.songId];
      if (!fixture) {
        throw new VectorError(
          'UNKNOWN_SONG',
          `the vector has no song "${op.songId}"`
        );
      }
      store.setQuestion(questionOf(buildSong(fixture), store.currentMode));
      return;
    }
    case 'advancePhase':
      store.advancePhase(op.phase as RoundPhase);
      return;
    case 'submitAnswer': {
      const answer: PlayerAnswer = {
        playerId: op.playerId,
        answer: op.answer,
        isCorrect: op.isCorrect,
        pointsAwarded: op.pointsAwarded,
        answeredInSeconds: op.answeredInSeconds,
      };
      store.submitAnswer(answer);
      return;
    }
    case 'awardPoints':
      store.awardPoints(op.entityId, op.points);
      return;
    case 'nextRound':
      store.nextRound();
      return;
    case 'endGame':
      store.endGame(op.winnerId ?? undefined);
      return;
    case 'skipBrokenSong':
      store.skipBrokenSong();
      return;
    case 'initTimeline':
      store.initTimeline(op.years);
      return;
    case 'addTimelineYear':
      store.addTimelineYear(op.year);
      return;
    case 'removeTimelineYear':
      store.removeTimelineYear(op.year);
      return;
    case 'assignPlayerToTeam':
      store.assignPlayerToTeam(op.playerId, op.teamId ?? undefined);
      return;
    case 'removeTeam':
      store.removeTeam(op.teamId);
      return;
    case 'resetScores':
      store.resetScores();
      return;
    case 'setConfig':
      store.setConfig(op.config as Partial<GameConfig>);
      return;
    case 'cheat': {
      // The cheat is a component action: it deducts its price from the
      // score of the player whose turn it is (`TimelineMode.tsx`:273).
      const state = useGameStore.getState();
      const playerId = state.turnOrder[state.currentTurnIndex];
      if (!playerId) return;
      const penalty = cheatPenalty(op.cheat);
      state.awardPoints(playerId, penalty);
      return;
    }
    case 'setNow':
      setClock(op.ms);
      return;
    case 'answer':
      applyAnswer(op, vector);
      return;
    case 'censorHint':
    case 'filterSongs':
      // Probes — they are observed, they do not change the store.
      return;
    default: {
      const exhaustive: never = op;
      throw new VectorError(
        'UNKNOWN_OP',
        `unknown operation: ${JSON.stringify(exhaustive)}`
      );
    }
  }
}

/**
 * The price of a cheat — the constants of the reference
 * (`src/utils/mode-rules.ts`).
 *
 * @param cheat - the identifier of the cheat
 * @returns the points the cheat costs
 */
function cheatPenalty(cheat: string): number {
  switch (cheat) {
    case 'timeline-decade-hint':
      return CHEAT_PENALTY_TIMELINE_DECADE;
    case 'timeline-joker':
      return CHEAT_PENALTY_TIMELINE_JOKER;
    case 'hint-master-music':
      return CHEAT_PENALTY_HINT_MASTER_MUSIC;
    case 'survivor-artist':
      return CHEAT_PENALTY_SURVIVOR;
    default:
      throw new VectorError('UNKNOWN_CHEAT', `unknown cheat "${cheat}"`);
  }
}

/**
 * Executes an answer input — the central handling of `src/app/game/page.tsx`.
 *
 * WHY: the page decides which points an answer is worth, applies the time
 * decay, stores the answer and awards the points. The rules it uses live in
 * `src/utils/mode-rules.ts`; the store actions are the reference.
 */
function applyAnswer(
  op: Extract<VectorOp, { op: 'answer' }>,
  vector: Vector
): void {
  const state = useGameStore.getState();

  // The timeline aborts the reveal without a selected slot
  // (`src/components/game/modes/TimelineMode.tsx`: `if (selectedSlot === null …) return`).
  if (op.answer.kind === 'timeline' && op.answer.slot === null) {
    return;
  }

  const song = currentSong();
  if (!song) {
    throw new VectorError(
      'NO_CURRENT_SONG',
      'the answer input needs a drawn song'
    );
  }

  const pilotId = state.turnOrder[state.currentTurnIndex];

  // The mode rule is evaluated even without a current player — the mode
  // component changes its own state (the timeline) independently of the
  // central handling in `src/app/game/page.tsx`.
  const outcome = evaluateModeAnswer(
    op.mode as GameState['currentMode'],
    op.answer as Parameters<typeof evaluateModeAnswer>[1],
    toModeSong(song),
    { timelineYears: state.timelineYears, config: state.config }
  );

  if (pilotId) {
    const pointsAwarded = resolveAnswerPoints(
      outcome.points,
      outcome.isCorrect,
      op.answeredInSeconds,
      state.config
    );

    state.submitAnswer({
      playerId: pilotId,
      answer: answerLabel(outcome.isCorrect),
      isCorrect: outcome.isCorrect,
      pointsAwarded,
      answeredInSeconds: op.answeredInSeconds,
    });

    if (outcome.isCorrect && pointsAwarded > 0) {
      state.awardPoints(pilotId, pointsAwarded);
    }
  }

  // The timeline changes its own state after a correct answer
  // (`src/components/game/modes/TimelineMode.tsx`: `handleReveal`).
  if (op.answer.kind === 'timeline' && outcome.isCorrect) {
    const effect = timelineAnswerEffect(state.timelineYears, song.year);
    state.addTimelineYear(song.year);
    if (effect.isDuplicate) state.removeTimelineYear(song.year);
  }
}

// ─── The observation ───────────────────────────────────────────────

/**
 * Reads the state of the store as an observation.
 *
 * @param phases - the phase after every input
 * @param censor - the result of the last `censorHint` probe
 * @param filtered - the result of the last `filterSongs` probe
 */
function observe(
  phases: string[],
  censor: string | null,
  filtered: string[] | null
): Observation {
  const state = useGameStore.getState();

  const playerScores: Record<string, number> = {};
  const playerTeams: Record<string, string | null> = {};
  for (const player of state.players) {
    playerScores[player.id] = player.score;
    playerTeams[player.id] = player.teamId ?? null;
  }

  const teamScores: Record<string, number> = {};
  const teamMembers: Record<string, string[]> = {};
  for (const team of state.teams) {
    teamScores[team.id] = team.score;
    teamMembers[team.id] = [...team.playerIds];
  }

  const answers: ObservedAnswer[] = state.currentAnswers.map((answer) => ({
    playerId: answer.playerId,
    answer: String(answer.answer),
    outcome: answer.isCorrect ? 'correct' : 'incorrect',
    isCorrect: answer.isCorrect,
    pointsAwarded: answer.pointsAwarded,
    answeredInSeconds: answer.answeredInSeconds ?? null,
  }));

  return {
    phases,
    currentRound: state.currentRound,
    currentMode: state.currentMode,
    currentSongId: currentSong()?.id ?? null,
    currentSongSource: state.currentSongSource,
    autoDrawIntent: state.autoDrawIntent,
    playerScores,
    teamScores,
    playerTeams,
    teamMembers,
    turnOrder: [...state.turnOrder],
    currentTurnIndex: state.currentTurnIndex,
    winnerId: state.winnerId ?? null,
    isGameOver: state.isGameOver,
    timelineYears: state.timelineYears,
    playedSongIds: state.playedSongIds,
    answers,
    roundCount: state.roundHistory.length,
    totalXP: state.totalXP,
    censorHint: censor,
    filteredSongIds: filtered,
    error: null,
  };
}

/**
 * Runs one vector against the TypeScript reference.
 *
 * @param vector - the vector to run
 * @returns the observation of the vector
 */

/**
 * The question of a round, as the store expects it.
 *
 * WHY the harness builds one: the reference implementation replays the
 * vectors without the core. The question carries the identifier of the song
 * and the mode of the round — the rest is not read by the vectors.
 */
function questionOf(song: PhomuSong, mode: GameState['currentMode']): RoundQuestion {
  return {
    phase: 'question',
    roundNumber: 0,
    mode,
    hints: song.hints,
    options: [],
    identity: null,
    pointsPossible: 0,
    answersLocked: false,
    songId: song.id,
    media: {
      youtube: song.links.youtube,
      youtubeAlternatives: song.links.youtubeAlternatives ?? [],
      spotify: song.links.spotify ?? null,
      spotifyFreePreview: song.links.spotifyFreePreview ?? null,
      amazonMusic: song.links.amazonMusic ?? null,
      amazonPrimePreview: song.links.amazonPrimePreview ?? null,
      coverLink: song.links.coverLink ?? null,
      startSeconds: song.previewTimestamp?.start ?? 0,
      endSeconds: song.previewTimestamp?.end ?? 0,
    },
    context: {
      timelineYears: [],
      timelineSlots: [],
      genre: song.genre,
      pack: song.packs[0] ?? null,
    },
  };
}

export function runVector(vector: Vector): Observation {
  installEnvironment();
  // The songs of the vector belong to the vector, not to the runner: the
  // assignment resets the songs of the previous vector — without it, every
  // vector would observe the song of the first one.
  setSongFixtures(buildSituation(vector));

  const phases: string[] = [];
  let censor: string | null = null;
  let filtered: string[] | null = null;

  try {
    for (const op of vector.when) {
      if (op.op === 'censorHint') {
        censor = censorHint(op.hint, op.artist, op.title);
      } else if (op.op === 'filterSongs') {
        const catalogue = (vector.given.catalogue ?? []).map(buildSong);
        filtered = filterSongs(catalogue, {
          selectedPacks: op.options.selectedPacks,
          difficulty: op.options.difficulty as never,
          onlyQRCompatible: op.options.onlyQRCompatible ?? false,
          currentMode: op.options.currentMode as never,
        }).map((song) => song.id);
      }
      applyOp(op, vector);
      phases.push(useGameStore.getState().roundPhase);
    }
  } catch (error) {
    const observation = observe(phases, censor, filtered);
    if (error instanceof VectorError) {
      observation.error = { code: error.code, message: error.message };
      return observation;
    }
    throw error;
  }

  return observe(phases, censor, filtered);
}
