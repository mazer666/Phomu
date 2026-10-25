//! The constants of the media policy.
//!
//! WHAT: the lengths of the previews, the timeouts of the playback and the
//! limits of the reports about missing links.
//!
//! WHY: the media policy is a rule and the player surface is not
//! (docs/design/PLATFORM-ARCHITECTURE.md § 8). A native shell cannot reuse
//! the timeouts of the browser player without knowing them, therefore they
//! live in the base.

/// The countdown before the music starts, in seconds
/// (`src/config/game-config.ts:81`).
///
/// The constant exists in the reference implementation but is not used
/// there; the base uses it as the documented value of the autoplay
/// workaround.
///
/// EXAMPLE: the countdown lasts three seconds.
pub const COUNTDOWN_SECONDS: u32 = 3;

/// The length of a Spotify Free preview, in seconds
/// (`src/config/game-config.ts:82`).
///
/// EXAMPLE: the Spotify preview plays thirty seconds.
pub const SPOTIFY_PREVIEW_DURATION: u32 = 30;

/// The length of the Hint-Master audio hint, in seconds
/// (`src/components/game/modes/HintMasterMode.tsx:175`).
///
/// EXAMPLE: the audio hint of level 1 lasts thirty seconds.
pub const HINT_MASTER_AUDIO_HINT_SECONDS: u32 = 30;

/// The length of the Hint-Master audio from level 5 or after the reveal, in
/// seconds (`src/components/game/modes/HintMasterMode.tsx:174`).
///
/// EXAMPLE: the audio of level 5 lasts 180 seconds.
pub const HINT_MASTER_AUDIO_FULL_SECONDS: u32 = 180;

/// The length of the Vibe-Check playback after the answer, in seconds
/// (`src/components/game/modes/VibeCheckMode.tsx:370`).
///
/// EXAMPLE: the Vibe-Check plays two minutes after the answer.
pub const VIBE_CHECK_PLAYBACK_SECONDS: u32 = 120;

/// The countdown before a broken song is skipped automatically, in seconds
/// (`src/components/game/MusicPlayer.tsx:240`).
///
/// EXAMPLE: a broken song is skipped after ten seconds.
pub const MEDIA_AUTO_SKIP_COUNTDOWN_SECONDS: u32 = 10;

/// The time the player waits for the video to start, in milliseconds
/// (`src/components/game/MusicPlayer.tsx:340`).
///
/// EXAMPLE: a video that does not start within six seconds is a failure.
pub const MEDIA_START_TIMEOUT_MS: u64 = 6_000;

/// The interval of the end-offset check, in milliseconds
/// (`src/components/game/MusicPlayer.tsx:326`).
///
/// EXAMPLE: the end offset is checked twice a second.
pub const MEDIA_END_OFFSET_CHECK_INTERVAL_MS: u64 = 500;

/// The number of "missing link" reports per hour and device
/// (`src/components/game/MusicPlayer.tsx:177`).
///
/// EXAMPLE: a device may report five missing links per hour.
pub const MEDIA_MAX_REPORTS_PER_HOUR: u32 = 5;

/// The number of previously played songs that stay excluded when the draw
/// pool is exhausted (`src/utils/song-picker.ts:77`).
///
/// EXAMPLE: the last five played songs may be drawn again.
pub const CATALOGUE_RECENTLY_PLAYED_EXCLUSION: usize = 5;
