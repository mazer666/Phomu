/**
 * Song Types
 *
 * The PhomuSong interface is the core data structure of the entire game.
 * Every physical card and every digital "draw" corresponds to one PhomuSong.
 *
 * Fields are used across different game modes:
 * - year           → Timeline mode (drag & drop)
 * - hints          → Hint-Master mode (5 levels)
 * - lyrics         → Lyrics Labyrinth mode (real vs fake)
 * - mood           → Vibe-Check mode (mood matching)
 * - isOneHitWonder → Survivor mode (career prediction)
 */

/** ISO 3166-1 alpha-2 country code, e.g. 'US', 'DE', 'GB' */
export type CountryCode = string;

/** How well-known the song is — affects which songs appear at each difficulty setting */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * The full data record for one song.
 * Every song must have at least a YouTube link — the other providers are optional.
 */
export interface PhomuSong {
  /** Unique identifier — used in QR code URLs: /play?id=SONG_ID */
  id: string;

  /** Song title as officially released */
  title: string;

  /** Primary artist or band name */
  artist: string;

  /** 4-digit release year, e.g. 1984 */
  year: number;

  /** ISO country code of the artist's origin, e.g. 'US' */
  country: CountryCode;

  /** Musical genre, e.g. 'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'R&B' */
  genre: string;

  /** How recognizable this song is to the average player */
  difficulty: Difficulty;

  /**
   * Mood tags used in Vibe-Check mode.
   * Players pick a mood; correct = matching the majority.
   * Examples: 'Neon Night', 'Road Trip', 'Rainy Day', 'Dance Floor', 'Heartbreak'
   */
  mood: string[];

  /** Which content pack this song belongs to, e.g. 'Global Hits 1950-2026' */
  pack: string;

  /**
   * 5 hint strings for Hint-Master mode, ordered from hardest to easiest.
   * [0] = Level 1 (5 pts) — Historical/contextual clue, most obscure
   * [1] = Level 2 (4 pts) — Musical trivia
   * [2] = Level 3 (3 pts) — Album or era info
   * [3] = Level 4 (2 pts) — Audio snippet description
   * [4] = Level 5 (1 pt)  — Nearly a giveaway
   */
  hints: [string, string, string, string, string];

  /**
   * Lyrics data for Lyrics Labyrinth mode.
   * null = noch nicht eingetragen (wird über Admin-Tool ausgefüllt).
   */
  lyrics: {
    /** Exactly 3 real lyric lines from the actual song */
    real: [string, string, string];
    /** 1 AI-generated fake lyric line that sounds plausible but is wrong */
    fake: string;
  } | null;

  /**
   * For Survivor mode: true if the artist had only 1 major hit (one-hit wonder),
   * false if they had 2 or more Top 40 hits.
   */
  isOneHitWonder: boolean;

  /**
   * Optional: controls which section of the song to play.
   * Useful to skip intros and jump to the recognizable chorus.
   * If omitted, playback starts from the beginning.
   */
  previewTimestamp?: {
    /** Start playback at this many seconds into the song */
    start: number;
    /** Stop playback at this many seconds */
    end: number;
  };

  /** Streaming links — YouTube is required, others are optional */
  links: {
    /** YouTube video ID (11 characters) or full URL */
    youtube: string;
    /** Spotify track URI (spotify:track:xxx) or URL */
    spotify?: string;
    /** Apple Music track URL (future feature) */
    appleMusic?: string;
    /** Amazon Music URL — falls back to YouTube if missing */
    amazonMusic?: string;
  };
}
