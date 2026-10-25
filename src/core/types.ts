/**
 * The view models of the core.
 *
 * WHAT: the types the Rust base hands over to the shell — the question of a
 * round, the reveal of a round and the feedback of an answer.
 *
 * WHY the question has no field for the solution: the anti-spoiler
 * guarantee is structural, not a rendering rule. The type of the question
 * has no title, no artist and no year, so a shell cannot render them even
 * if it wanted to (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001;
 * `core/phomu-core/tests/anti_spoiler.rs`).
 *
 * EXAMPLE: the Lyrics Labyrinth receives four option texts. None of them
 * says which one was the invented line — the base decides that when the
 * player answers.
 */
import type { GameMode } from '@/config/game-config';

/**
 * The identity of a song.
 *
 * WHY a separate type: it is the shape of the solution. A type that carries
 * it cannot be mistaken for the question.
 */
export interface SongIdentity {
  /** The title of the song. */
  title: string;
  /** The artist of the song. */
  artist: string;
  /** The year of the release. */
  year: number;
}

/**
 * The media of the running round.
 *
 * WHY the links are part of the question: the player has to hear the song
 * before he can answer. The links name no title and no artist.
 */
export interface RoundMedia {
  /** The YouTube link of the song. */
  youtube: string;
  /** The alternative YouTube links, in the order of the fallback. */
  youtubeAlternatives: string[];
  /** The Spotify link, if the catalogue has one. */
  spotify: string | null;
  /** The Spotify preview link, if the catalogue has one. */
  spotifyFreePreview: string | null;
  /** The Amazon Music link, if the catalogue has one. */
  amazonMusic: string | null;
  /** The Amazon Prime preview link, if the catalogue has one. */
  amazonPrimePreview: string | null;
  /** The YouTube link of the cover version, if the catalogue has one. */
  coverLink: string | null;
  /** The second at which the playback starts. */
  startSeconds: number;
  /** The second at which the playback stops. */
  endSeconds: number;
}

/**
 * The context of the mode, as the shell needs it to draw the question.
 *
 * WHY the slots of the timeline travel with the question: the Timeline mode
 * places the song between the years that are already on the timeline. The
 * slots depend on the year of the song — the base computes them.
 */
export interface RoundContext {
  /** The years that are already on the timeline. */
  timelineYears: number[];
  /** The slots in which the song of the round may be placed. */
  timelineSlots: number[];
  /** The genre of the song. */
  genre: string;
  /** The pack the song belongs to. */
  pack: string | null;
}

/**
 * The question of a round.
 *
 * WHY there is no title, no artist and no year: the question phase must not
 * be able to carry the solution. The base builds this view model and the
 * bridge hands it over unchanged.
 */
export interface RoundQuestion {
  /** The phase of the round. */
  phase: 'question';
  /** The number of the round. */
  roundNumber: number;
  /** The mode of the round. */
  mode: GameMode;
  /** The censored hints of the song. */
  hints: string[];
  /** The options the mode offers. */
  options: string[];
  /**
   * The identity of the song — only in the modes that declare that they
   * disclose it (the Vibe-Check asks for the mood of a visible song).
   */
  identity: SongIdentity | null;
  /** The number of points the round is worth. */
  pointsPossible: number;
  /** Whether the answers of the round are locked in. */
  answersLocked: boolean;
  /** The identifier of the song — an opaque handle, not an answer. */
  songId: string;
  /** The media of the round. */
  media: RoundMedia;
  /** The context of the mode. */
  context: RoundContext;
}

/**
 * The drawing phase — it knows nothing about the song.
 */
export interface RoundDrawing {
  /** The phase of the round. */
  phase: 'drawing';
  /** The number of the round. */
  roundNumber: number;
  /** The mode of the round. */
  mode: GameMode;
  /** Whether the drawing happens automatically. */
  autoDraw: boolean;
}

/**
 * The scoring phase — the end of the game.
 */
export interface RoundScoring {
  /** The phase of the round. */
  phase: 'scoring';
  /** The number of the round. */
  roundNumber: number;
  /** The winner of the game, if the ending condition named one. */
  winnerId: string | null;
}

/**
 * The entry of a song, as the reveal phase needs it.
 *
 * WHY the reveal carries the whole entry: the reveal is the phase that
 * releases the solution. The question phase never sees it.
 */
export interface RevealSong {
  /** The identifier of the song. */
  id: string;
  /** The title of the song. */
  title: string;
  /** The artist of the song. */
  artist: string;
  /** The year of the release. */
  year: number;
  /** The genre of the song. */
  genre: string;
  /** The mood tags of the song. */
  mood: string[];
  /** The hints of the song. */
  hints: string[];
  /** The lyric lines of the song — with the invented ones. */
  lyrics: { real: string[]; fake: string[] } | null;
  /** Whether the artist is a one-hit wonder. */
  isOneHitWonder: boolean;
  /** The streaming links of the song. */
  links: {
    youtube: string;
    coverLink?: string | null;
    spotify?: string | null;
    spotifyFreePreview?: string | null;
    appleMusic?: string | null;
    amazonMusic?: string | null;
    amazonPrimePreview?: string | null;
  };
}

/**
 * The reveal of a round.
 *
 * WHY the reveal carries the solution: it is the phase that releases it. The
 * question phase never carries it.
 */
export interface RoundReveal {
  /** The phase of the round. */
  phase: 'reveal';
  /** The number of the round. */
  roundNumber: number;
  /** The mode of the round. */
  mode: GameMode;
  /** The title of the song. */
  title: string;
  /** The artist of the song. */
  artist: string;
  /** The year of the release. */
  year: number;
  /** Whether the answer of the pilot was correct. */
  isCorrect: boolean;
  /** The number of points that were awarded. */
  pointsAwarded: number;
  /** The years that are on the timeline. */
  timelineYears: number[];
  /** The whole entry of the song, as the reveal needs it. */
  song: RevealSong | null;
}

/**
 * The view of the running round, whatever phase it is in.
 */
export type RoundView = RoundDrawing | RoundQuestion | RoundReveal | RoundScoring;

/**
 * The detail of the feedback, as the mode needs it.
 *
 * WHY the fields are optional: every mode has its own detail, and a mode
 * that has none carries an empty object.
 */
export interface AnswerDetail {
  /** The year of the song (Timeline). */
  year?: number;
  /** The slot the song belongs to (Timeline). */
  slot?: number;
  /** Whether the year is already on the timeline (Timeline). */
  isDuplicate?: boolean;
  /** Whether the player may remove a year (Timeline). */
  removalOffered?: boolean;
  /** The invented line of the round (Lyrics Labyrinth). */
  inventedLine?: string;
  /** The correct mood of the song (Vibe-Check). */
  correctMood?: string;
  /** Whether the artist is a one-hit wonder (Survivor). */
  isOneHitWonder?: boolean;
}

/**
 * The feedback of a submitted answer.
 *
 * WHY the feedback carries the identity: the answer of the player is in, so
 * the round may show what it was worth and what the song was.
 */
export interface AnswerFeedback {
  /** The identity of the song. */
  identity: SongIdentity | null;
  /** The genre of the song. */
  genre: string;
  /** The detail of the mode. */
  detail: AnswerDetail;
}

/**
 * The score of a submitted answer.
 */
export interface AnswerScore {
  /** The number of the round. */
  roundNumber: number;
  /** Whether the answer was correct. */
  isCorrect: boolean;
  /** The number of points that were awarded. */
  pointsAwarded: number;
  /** The score of the player. */
  playerScore: number;
  /** The score of the team. */
  teamScore: number | null;
  /** The phase of the round after the answer. */
  phase: string;
}

/**
 * The result of a submitted answer.
 */
export interface AnswerResult {
  /** The score of the answer. */
  score: AnswerScore;
  /** The feedback of the round. */
  feedback: AnswerFeedback;
}

/**
 * The choice of a player, as the bridge maps it to the answer of the base.
 *
 * WHY the choice and not the answer: the Lyrics Labyrinth asks for the line
 * the player picked. Only the bridge may know which line was the invented
 * one (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
 */
export type AnswerChoice =
  | { kind: 'timeline'; slot: number }
  | { kind: 'hint-master'; level: number; knew: 'both' | 'artist' | 'title' | 'none' }
  | { kind: 'lyrics'; line: string }
  | { kind: 'lyrics-bonus'; claimed: boolean }
  | { kind: 'vibe-check'; mood: string; cheatUsed: boolean }
  | { kind: 'survivor'; guessedOneHit: boolean }
  | {
      kind: 'cover-confusion';
      hintsUsed: number;
      pickedArtist?: string | null;
      selfAssess?: boolean | null;
    }
  | { kind: 'cover-confusion-variation'; guessCover: boolean };

/**
 * The cheats of the round.
 *
 * WHY the base decides what a cheat shows: the decade hint needs the year of
 * the song, the option halving needs the correct mood, the joker needs the
 * slots of the timeline. Only the base has them.
 */
export type CheatKind =
  | 'timeline-decade-hint'
  | 'timeline-joker'
  | 'hint-master-music'
  | 'survivor-artist'
  | 'vibe-check-options';

/**
 * The outcome of a cheat.
 */
export interface CheatOutcome {
  /** The points the cheat costs. */
  penalty: number;
  /** The decade of the song (the Timeline mode). */
  decadeHint: number | null;
  /** The slot the joker removes (the Timeline mode). */
  jokerSlot: number | null;
  /** The halved options (the Vibe-Check). */
  options: string[];
  /** The identity of the song (the Survivor). */
  identity: SongIdentity | null;
}
