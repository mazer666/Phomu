/**
 * Mode rules — the pure game logic of the six modes
 *
 * WHY: the rules of a mode (which answer is correct, how many points it is
 * worth) lived inside the React components of `src/components/game/modes/`.
 * A rule that is only reachable through a component cannot be replayed by a
 * second implementation (the Rust core) and cannot be compared with it.
 * This module holds the rules as pure functions; the components call them,
 * so the component and the conformance runner execute the *same* code.
 *
 * The extraction is behaviour-preserving: the functions below are the
 * expressions that were previously inline in the components, with the
 * literals named. See `docs/acceptance/P0-ACCEPTANCE.md` § 2 for the list of
 * the touched files.
 *
 * WHAT: every function here is pure — no store access, no React, no I/O.
 */
import { PHOMU_CONFIG } from '@/config/game-config';
import type { GameMode } from '@/config/game-config';
import type { GameConfig } from '@/types/game-state';

/** Points for a correctly identified fake lyric line (Lyrics Labyrinth). */
export const LYRICS_POINTS = 4;

/** Points for the Lyrics Labyrinth bonus round (no lyrics in the catalogue). */
export const LYRICS_BONUS_POINTS = 2;

/** Points for a correct Survivor answer. */
export const SURVIVOR_POINTS = 3;

/** Points for a correct Vibe-Check answer, and the reduced amount after the cheat. */
export const VIBE_CHECK_POINTS = 2;
export const VIBE_CHECK_POINTS_CHEATED = 1;

/** Points for the Cover Confusion variation "cover or original?". */
export const COVER_CONFUSION_VARIATION_POINTS = 3;

/** Cover Confusion points by the number of hints used (index = hints used). */
export const COVER_CONFUSION_POINTS_BY_HINTS = [5, 4, 3, 2] as const;

/** Penalty for the timeline decade hint (cheat). */
export const CHEAT_PENALTY_TIMELINE_DECADE = -2;

/** Penalty for the timeline joker (cheat). */
export const CHEAT_PENALTY_TIMELINE_JOKER = -1;

/** Penalty for the Hint-Master music cheat. */
export const CHEAT_PENALTY_HINT_MASTER_MUSIC = -2;

/** Penalty for the Survivor cheat (artist revealed early). */
export const CHEAT_PENALTY_SURVIVOR = -1;

/** From this number of years on the timeline the player may remove one. */
export const TIMELINE_REMOVAL_THRESHOLD = 10;

// ─── Timeline ──────────────────────────────────────────────────────

/**
 * Returns all accepted slot indexes for a song year.
 *
 * WHY: the canonical slot is the first index whose year is greater than the
 * song year. If the year already occurs on the timeline, the slot before and
 * after the duplicate are accepted as well.
 */
export function timelineValidSlots(
  songYear: number,
  sortedYears: number[]
): Set<number> {
  const slots = new Set<number>();

  let canonical = sortedYears.length;
  for (let i = 0; i < sortedYears.length; i++) {
    if (songYear < sortedYears[i]!) {
      canonical = i;
      break;
    }
  }
  slots.add(canonical);

  for (let i = 0; i < sortedYears.length; i++) {
    if (sortedYears[i] === songYear) {
      slots.add(i);
      slots.add(i + 1);
    }
  }

  return slots;
}

/**
 * The canonical slot of a song year — the slot the timeline highlights.
 *
 * EXAMPLE: years [1970, 1980, 1990], song year 1985 → 1.
 */
export function timelineCanonicalSlot(
  songYear: number,
  sortedYears: number[]
): number {
  for (let i = 0; i < sortedYears.length; i++) {
    if (songYear < sortedYears[i]!) return i;
  }
  return sortedYears.length;
}

/**
 * Timeline points: the longer the timeline, the more points — capped.
 *
 * EXAMPLE: 3 years on the timeline, maximum 5 → 4 points.
 */
export function timelinePoints(yearCount: number, maxPoints: number): number {
  return Math.min(yearCount + 1, maxPoints);
}

/**
 * The effect of a correct timeline answer on the timeline itself.
 *
 * WHY: a duplicate year is added and removed again immediately; from more
 * than ten years on the player is offered the removal of one year.
 */
export function timelineAnswerEffect(
  years: number[],
  songYear: number
): { isDuplicate: boolean; removalOffered: boolean } {
  const isDuplicate = years.includes(songYear);
  return {
    isDuplicate,
    removalOffered:
      !isDuplicate && years.length + 1 > TIMELINE_REMOVAL_THRESHOLD,
  };
}

// ─── Hint-Master ───────────────────────────────────────────────────

/**
 * The point value of a hint level (1 → 5 points, 5 → 1 point).
 *
 * EXAMPLE: level 3 → 3 points.
 */
export function hintMasterPoints(level: number): number {
  return PHOMU_CONFIG.HINT_MASTER_POINTS[level - 1] ?? 1;
}

/**
 * The result of the Hint-Master self-assessment.
 *
 * WHY: "both" gives the full amount, "artist" and "title" half (rounded up),
 * "nothing" gives nothing.
 *
 * EXAMPLE: level 4, "artist" → { isCorrect: true, points: 1 }.
 */
export function hintMasterAward(
  level: number,
  knew: 'both' | 'artist' | 'title' | 'none'
): { isCorrect: boolean; points: number } {
  const points = hintMasterPoints(level);
  return {
    isCorrect: knew !== 'none',
    points:
      knew === 'both' ? points : knew === 'none' ? 0 : Math.ceil(points / 2),
  };
}

// ─── Lyrics Labyrinth ───────────────────────────────────────────────

/**
 * The result of the Lyrics Labyrinth answer.
 *
 * EXAMPLE: the fake line was picked → { isCorrect: true, points: 4 }.
 */
export function lyricsAward(isFake: boolean): {
  isCorrect: boolean;
  points: number;
} {
  return { isCorrect: isFake, points: isFake ? LYRICS_POINTS : 0 };
}

/**
 * The result of the Lyrics Labyrinth bonus round (song without lyrics).
 *
 * EXAMPLE: claimed → { isCorrect: true, points: 2 }.
 */
export function lyricsBonusAward(claimed: boolean): {
  isCorrect: boolean;
  points: number;
} {
  return { isCorrect: claimed, points: claimed ? LYRICS_BONUS_POINTS : 0 };
}

// ─── Vibe-Check ─────────────────────────────────────────────────────

/**
 * The result of a Vibe-Check answer.
 *
 * EXAMPLE: mood "Dance Floor" is not in the song's moods → 0 points.
 */
export function vibeCheckAward(
  songMoods: string[],
  mood: string,
  cheatUsed: boolean
): { isCorrect: boolean; points: number } {
  const isCorrect = songMoods.includes(mood);
  return {
    isCorrect,
    points: isCorrect
      ? cheatUsed
        ? VIBE_CHECK_POINTS_CHEATED
        : VIBE_CHECK_POINTS
      : 0,
  };
}

// ─── Survivor ──────────────────────────────────────────────────────

/**
 * The result of a Survivor answer.
 *
 * EXAMPLE: guessed "one-hit wonder", the song is not one → 0 points.
 */
export function survivorAward(
  isOneHitWonder: boolean,
  guessedOneHit: boolean
): { isCorrect: boolean; points: number } {
  const isCorrect = guessedOneHit === isOneHitWonder;
  return { isCorrect, points: isCorrect ? SURVIVOR_POINTS : 0 };
}

// ─── Cover Confusion ────────────────────────────────────────────────

/**
 * The point value of the Cover Confusion mode by the number of hints used.
 *
 * EXAMPLE: two hints used → 3 points.
 */
export function coverConfusionPoints(hintsUsed: number): number {
  return COVER_CONFUSION_POINTS_BY_HINTS[
    Math.min(hintsUsed, COVER_CONFUSION_POINTS_BY_HINTS.length - 1)
  ]!;
}

/**
 * The result of a Cover Confusion answer (self-assessment or artist choice).
 *
 * EXAMPLE: three hints used and correct → { isCorrect: true, points: 2 }.
 */
export function coverConfusionAward(
  hintsUsed: number,
  correct: boolean
): { isCorrect: boolean; points: number } {
  return {
    isCorrect: correct,
    points: correct ? coverConfusionPoints(hintsUsed) : 0,
  };
}

/**
 * The result of the Cover Confusion variation "cover or original?".
 *
 * EXAMPLE: the song has a cover link and the player answered "cover" → 3 points.
 */
export function coverConfusionVariationAward(
  guessCover: boolean,
  actuallyCover: boolean
): { isCorrect: boolean; points: number } {
  const isCorrect = guessCover === actuallyCover;
  return {
    isCorrect,
    points: isCorrect ? COVER_CONFUSION_VARIATION_POINTS : 0,
  };
}

// ─── Central scoring ───────────────────────────────────────────────

/** The label that is stored with an answer. */
export function answerLabel(isCorrect: boolean): string {
  return isCorrect ? 'correct' : 'incorrect';
}

/**
 * The time decay of the point value.
 *
 * WHY: a late correct answer is worth less — but never less than
 * `minPointsPerCorrect`.
 *
 * EXAMPLE: 5 points base, 20 s, grace 5 s, step 5 s/point, minimum 1 → 3 points.
 */
export function resolveAnswerPoints(
  basePoints: number,
  isCorrect: boolean,
  answeredInSeconds: number | undefined,
  config: Pick<
    GameConfig,
    | 'timeDecayEnabled'
    | 'timeDecayGraceSeconds'
    | 'timeDecayStepSeconds'
    | 'timeDecayStepPoints'
    | 'minPointsPerCorrect'
  >
): number {
  if (
    !isCorrect ||
    !config.timeDecayEnabled ||
    typeof answeredInSeconds !== 'number'
  ) {
    return basePoints;
  }

  const overtime = Math.max(
    0,
    answeredInSeconds - config.timeDecayGraceSeconds
  );
  const decaySteps = Math.floor(
    overtime / Math.max(1, config.timeDecayStepSeconds)
  );
  const decayPoints = decaySteps * config.timeDecayStepPoints;
  return Math.max(config.minPointsPerCorrect, basePoints - decayPoints);
}

// ─── The mode registry ─────────────────────────────────────────────

/** The song properties a mode rule may read. */
export interface ModeSong {
  id: string;
  year: number;
  mood: string[];
  isOneHitWonder: boolean;
  artist: string;
  links: { coverLink?: string };
}

/** The state a mode rule may read besides the song. */
export interface ModeContext {
  timelineYears: number[];
  config: GameConfig;
}

/** The answer of a player, normalised across the six modes. */
export type ModeAnswer =
  | { kind: 'timeline'; slot: number }
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

/**
 * Evaluates one answer of one mode — the single entry point of the rules.
 *
 * WHY: the conformance runner needs one addressable rule per mode; the
 * components call the same per-mode functions.
 *
 * EXAMPLE: mode "vibe-check", mood "Chill" on a song whose moods are ["Chill"]
 *          → { isCorrect: true, points: 2 }.
 */
export function evaluateModeAnswer(
  mode: GameMode | string,
  answer: ModeAnswer,
  song: ModeSong,
  context: ModeContext
): { isCorrect: boolean; points: number } {
  switch (answer.kind) {
    case 'timeline': {
      const slots = timelineValidSlots(song.year, context.timelineYears);
      const isCorrect = slots.has(answer.slot);
      return {
        isCorrect,
        points: isCorrect
          ? timelinePoints(
              context.timelineYears.length,
              context.config.timelineMaxPoints
            )
          : 0,
      };
    }
    case 'hint-master':
      return hintMasterAward(answer.level, answer.knew);
    case 'lyrics':
      return lyricsAward(answer.picked === 'fake');
    case 'lyrics-bonus':
      return lyricsBonusAward(answer.claimed);
    case 'vibe-check':
      return vibeCheckAward(song.mood, answer.mood, answer.cheatUsed ?? false);
    case 'survivor':
      return survivorAward(song.isOneHitWonder, answer.guessedOneHit);
    case 'cover-confusion': {
      const correct =
        answer.pickedArtist !== undefined
          ? answer.pickedArtist === song.artist
          : (answer.selfAssess ?? false);
      return coverConfusionAward(answer.hintsUsed, correct);
    }
    case 'cover-confusion-variation':
      return coverConfusionVariationAward(
        answer.guessCover,
        Boolean(song.links.coverLink)
      );
    default: {
      // The mode parameter is part of the signature for the callers that
      // dispatch by mode; an unknown answer kind is a programming error.
      const exhaustive: never = answer;
      throw new Error(
        `unknown mode answer: ${JSON.stringify(exhaustive)} (mode ${mode})`
      );
    }
  }
}
