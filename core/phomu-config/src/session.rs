//! The constants of the lobby and of the session.
//!
//! WHAT: the limits of the lobby, the defaults of a session and the presets
//! the lobby offers.
//!
//! WHY: the lobby is the only place where a session is configured; the
//! numbers belong here so that the lobby of every platform shows the same
//! limits (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).

/// The score a player needs to win a game (`src/config/game-config.ts:54`).
///
/// EXAMPLE: a player with 10 points has won a game with the target 10.
pub const DEFAULT_WIN_SCORE: u32 = 10;

/// The maximum number of players in one session (`src/config/game-config.ts:55`).
///
/// EXAMPLE: a lobby with 25 players is refused.
pub const MAX_PLAYERS: usize = 24;

/// The minimum number of players in one session (`src/config/game-config.ts:56`).
///
/// EXAMPLE: a lobby with one player is allowed.
pub const MIN_PLAYERS: usize = 1;

/// The default number of rounds per player or team
/// (`src/config/game-config.ts:60`).
///
/// EXAMPLE: a new session ends after ten rounds per player.
pub const DEFAULT_ROUNDS_TO_PLAY: u32 = 10;

/// The lower bound of the rounds selection (`src/config/game-config.ts:61`).
///
/// The lobby offers fewer rounds than this bound
/// (`src/app/lobby/page.tsx:346`), so the bound is not enforced anywhere in
/// the reference implementation — see the deviation list in the delivery
/// report.
///
/// EXAMPLE: the preset of five rounds is below this bound.
pub const MIN_ROUNDS_TO_PLAY: u32 = 10;

/// The upper bound of the rounds selection (`src/config/game-config.ts:62`).
///
/// EXAMPLE: the preset of thirty rounds is the upper bound.
pub const MAX_ROUNDS_TO_PLAY: u32 = 30;

/// The default target score of the `points` ending condition.
///
/// The reference implementation carries two values for the same thing: the
/// store sets `targetPoints` to 100 (`src/stores/game-store.ts:47`) and
/// `winCondition` to `DEFAULT_WIN_SCORE` (`:50`), while the lobby keeps both
/// in sync (`src/app/lobby/page.tsx:337`). The base has exactly one target
/// per ending condition.
///
/// EXAMPLE: a game with the condition `points` ends at 100 points.
pub const DEFAULT_TARGET_POINTS: u32 = 100;

/// The default target duration of the `time` ending condition, in minutes
/// (`src/stores/game-store.ts:49`).
///
/// EXAMPLE: a game with the condition `time` ends after 60 minutes.
pub const DEFAULT_TARGET_TIME_MINUTES: u32 = 60;

/// The default upper bound of a question round, in seconds.
///
/// `null` in the reference implementation (`src/stores/game-store.ts:51`),
/// which means "no limit".
///
/// EXAMPLE: `DEFAULT_TIME_LIMIT_SECONDS` is `None` — a round has no limit.
pub const DEFAULT_TIME_LIMIT_SECONDS: Option<u32> = None;

/// The target score presets of the lobby (`src/app/lobby/page.tsx:426`).
///
/// EXAMPLE: the first preset of the lobby is 50 points.
pub const LOBBY_TARGET_POINTS_PRESETS: [u32; 4] = [50, 100, 200, 500];

/// The round presets of the lobby (`src/app/lobby/page.tsx:441`).
///
/// The first preset is below `MIN_ROUNDS_TO_PLAY`; the reference
/// implementation offers it nevertheless.
///
/// EXAMPLE: the first preset of the lobby is 5 rounds.
pub const LOBBY_ROUNDS_PRESETS: [u32; 4] = [5, 10, 15, 20];

/// The duration presets of the lobby, in minutes (`src/app/lobby/page.tsx:455`).
///
/// EXAMPLE: the first preset of the lobby is 30 minutes.
pub const LOBBY_MINUTES_PRESETS: [u32; 8] = [30, 60, 90, 120, 150, 180, 210, 240];
