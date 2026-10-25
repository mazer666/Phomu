//! The constants of the scoring, of the time decay and of the cheats.
//!
//! WHAT: the point values of the six modes, the parameters of the time
//! decay, the penalties of the cheats and the caps of the modes.
//!
//! WHY: the points are the part of the product a group of friends argues
//! about, so they must not depend on the platform
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-107). Every one of them
//! therefore lives in the base and nowhere else
//! (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).

/// The maximum number of points in the Timeline mode
/// (`src/config/game-config.ts:63`).
///
/// EXAMPLE: a timeline with three years is worth four points.
pub const DEFAULT_TIMELINE_MAX_POINTS: u32 = 5;

/// The lower bound of every score (`src/stores/game-store.ts:457` and `:468`).
///
/// A cheat may not push a player below zero (GAME-006).
///
/// EXAMPLE: a score of 3 that is charged 5 points becomes 0, not −2.
pub const SCORE_FLOOR: i64 = 0;

/// The points of the Hint-Master per hint level
/// (`src/config/game-config.ts:310`).
///
/// Level 1 is worth 5 points, level 5 is worth 1 point.
///
/// EXAMPLE: the level 3 is worth 3 points.
pub const HINT_MASTER_POINTS: [u32; 5] = [5, 4, 3, 2, 1];

/// The points for a correctly identified fake lyric line
/// (`src/components/game/modes/LyricsMode.tsx:21`).
///
/// EXAMPLE: picking the invented line is worth 4 points.
pub const LYRICS_POINTS: u32 = 4;

/// The points of the Lyrics Labyrinth bonus round for a song without lyrics
/// (`src/components/game/modes/LyricsMode.tsx:239`).
///
/// EXAMPLE: claiming a song without lyric data is worth 2 points.
pub const LYRICS_BONUS_POINTS: u32 = 2;

/// The points for a correct Survivor answer
/// (`src/components/game/modes/SurvivorMode.tsx:36`).
///
/// EXAMPLE: guessing "one-hit wonder" correctly is worth 3 points.
pub const SURVIVOR_POINTS: u32 = 3;

/// The points for a correct Vibe-Check answer
/// (`src/components/game/modes/VibeCheckMode.tsx:57`).
///
/// EXAMPLE: naming the mood of the song is worth 2 points.
pub const VIBE_CHECK_POINTS: u32 = 2;

/// The points for a correct Vibe-Check answer after the cheat
/// (`src/components/game/modes/VibeCheckMode.tsx:57`).
///
/// EXAMPLE: naming the mood of the song after the cheat is worth 1 point.
pub const VIBE_CHECK_POINTS_CHEATED: u32 = 1;

/// The points of the Cover Confusion mode by the number of hints used
/// (`src/components/game/modes/CoverConfusionMode.tsx:23`).
///
/// No hint is worth 5 points, one hint 4, two hints 3 and the multiple
/// choice with three artists 2 points.
///
/// EXAMPLE: two hints used are worth 3 points.
pub const COVER_CONFUSION_POINTS_BY_HINTS: [u32; 4] = [5, 4, 3, 2];

/// The points of the Cover Confusion variation "cover or original?"
/// (`src/components/game/modes/CoverConfusionMode.tsx:82`).
///
/// EXAMPLE: the variant is worth 3 points.
pub const COVER_CONFUSION_VARIATION_POINTS: u32 = 3;

/// The number of mood options shown without the cheat
/// (`src/components/game/modes/VibeCheckMode.tsx:62`).
///
/// EXAMPLE: the Vibe-Check offers 6 options.
pub const VIBE_CHECK_OPTION_COUNT: usize = 6;

/// The number of mood options shown after the cheat
/// (`src/components/game/modes/VibeCheckMode.tsx:62`).
///
/// EXAMPLE: the Vibe-Check offers 3 options after the cheat.
pub const VIBE_CHECK_OPTION_COUNT_CHEATED: usize = 3;

/// The number of artists offered in the Cover Confusion multiple choice
/// (`src/components/game/modes/CoverConfusionMode.tsx:67`).
///
/// EXAMPLE: the multiple choice offers 3 artists.
pub const COVER_CONFUSION_CHOICE_COUNT: usize = 3;

/// The number of text hints the Cover Confusion mode offers before the
/// multiple choice (`src/components/game/modes/CoverConfusionMode.tsx:80`).
///
/// EXAMPLE: the mode offers 2 text hints.
pub const COVER_CONFUSION_TEXT_HINT_COUNT: usize = 2;

/// The number of hints of the Hint-Master mode (`src/types/song.ts:85`).
///
/// EXAMPLE: the Hint-Master has 5 levels.
pub const HINT_MASTER_LEVEL_COUNT: usize = 5;

/// The number of real lyric lines in the Lyrics Labyrinth
/// (`src/types/song.ts:99`).
///
/// EXAMPLE: a catalogue entry carries 3 real lyric lines.
pub const LYRICS_REAL_LINE_COUNT: usize = 3;

/// The number of fake lyric lines that are mixed into the options
/// (`src/components/game/modes/LyricsMode.tsx:94`).
///
/// EXAMPLE: the options contain 1 invented line.
pub const LYRICS_FAKE_LINE_COUNT: usize = 1;

/// Whether the time decay is active by default
/// (`src/config/game-config.ts:64`).
///
/// EXAMPLE: a new session has no time decay.
pub const DEFAULT_TIME_DECAY_ENABLED: bool = false;

/// The number of seconds after which the first decay step applies
/// (`src/config/game-config.ts:65`).
///
/// EXAMPLE: an answer in the first five seconds is free.
pub const DEFAULT_TIME_DECAY_GRACE_SECONDS: u32 = 5;

/// The width of one decay step in seconds (`src/config/game-config.ts:66`).
///
/// EXAMPLE: every further five seconds cost one point.
pub const DEFAULT_TIME_DECAY_STEP_SECONDS: u32 = 5;

/// The number of points deducted per decay step
/// (`src/config/game-config.ts:67`).
///
/// EXAMPLE: every decay step costs one point.
pub const DEFAULT_TIME_DECAY_STEP_POINTS: u32 = 1;

/// The lower bound of the points of a correct answer despite the time decay
/// (`src/config/game-config.ts:68`).
///
/// EXAMPLE: a correct answer is always worth at least one point.
pub const DEFAULT_MIN_POINTS_PER_CORRECT: u32 = 1;

/// Whether the cheat buttons are hidden by default
/// (`src/config/game-config.ts:72`).
///
/// EXAMPLE: a new session shows the cheat buttons.
pub const DEFAULT_NO_CHEAT_MODE: bool = false;

/// The penalty of the Timeline decade hint
/// (`src/components/game/modes/TimelineMode.tsx:219`).
///
/// EXAMPLE: the decade hint costs two points.
pub const CHEAT_PENALTY_TIMELINE_DECADE: i64 = -2;

/// The penalty of the Timeline joker
/// (`src/components/game/modes/TimelineMode.tsx:234`).
///
/// EXAMPLE: the joker costs one point.
pub const CHEAT_PENALTY_TIMELINE_JOKER: i64 = -1;

/// The penalty of the Hint-Master music cheat
/// (`src/components/game/modes/HintMasterMode.tsx:62`).
///
/// EXAMPLE: the music cheat costs two points.
pub const CHEAT_PENALTY_HINT_MASTER_MUSIC: i64 = -2;

/// The penalty of the Survivor cheat
/// (`src/components/game/modes/SurvivorMode.tsx:43`).
///
/// EXAMPLE: the artist reveal costs one point.
pub const CHEAT_PENALTY_SURVIVOR: i64 = -1;

/// The smallest number of slots for which the Timeline joker is offered
/// (`src/components/game/modes/TimelineMode.tsx:407`).
///
/// The joker removes one wrong slot; with three slots or fewer the round
/// would lose too much of its structure.
///
/// EXAMPLE: with four slots the joker may be used, with three not.
pub const TIMELINE_JOKER_MIN_SLOTS: usize = 4;

/// The number of year numbers the Timeline starts with
/// (`src/components/game/modes/TimelineMode.tsx:189`).
///
/// EXAMPLE: the timeline starts with three years.
pub const TIMELINE_INITIAL_YEARS: usize = 3;

/// The number of year numbers from which on one may be removed again
/// (`src/components/game/modes/TimelineMode.tsx:247`).
///
/// EXAMPLE: with ten years the player may remove one of them.
pub const TIMELINE_REMOVAL_THRESHOLD: usize = 10;
