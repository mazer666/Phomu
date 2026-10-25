//! The exported data types of the bridge.
//!
//! WHAT: the records and the enumerations that the generated Kotlin and
//! Swift bindings carry. They are the wire model of the bridge: one-to-one
//! mirrors of the view models of the base.
//!
//! WHY the bridge owns them: a foreign function interface needs types that
//! its generator can describe. The base is a pure Rust library and does not
//! know the generator; the bridge is the place where the two meet. The
//! conversion between the two is in [`crate::core_api`] and nowhere else.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::dto::PhomuPlayer;
//!
//! let player = PhomuPlayer {
//!     id: "p1".to_string(),
//!     name: "Ada".to_string(),
//!     team_id: None,
//!     is_spectator: false,
//!     is_pilot: true,
//!     color: None,
//!     avatar: None,
//! };
//! assert_eq!(player.id, "p1");
//! ```

/// The handle of a running session.
///
/// WHY a number and not an object: a handle is an identifier into the
/// registry of the base. No Rust reference, no pointer and no borrowed data
/// crosses the boundary (docs/design/BUILD-CONTRACT.md § 2.4, rule B-1).
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub struct PhomuSessionHandle {
    /// The identifier of the session in the registry of the base.
    #[serde(default)]
    pub id: u64,
}

/// The handle of an open catalogue.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub struct PhomuCatalogHandle {
    /// The identifier of the catalogue in the registry of the base.
    #[serde(default)]
    pub id: u64,
}

/// What the shell can do.
///
/// WHY the shell fills it: the base reads the capabilities and adapts its
/// behaviour — a shell that cannot embed a player gets the preview audio
/// (docs/design/PLATFORM-ARCHITECTURE.md § 7).
#[derive(
    Debug, Clone, Default, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub struct PhomuCapabilities {
    /// Whether the shell can play a preview audio file.
    #[serde(default)]
    pub can_play_preview_audio: bool,
    /// Whether the shell can embed a YouTube player.
    #[serde(default)]
    pub can_embed_youtube: bool,
    /// Whether the shell can embed a Spotify player.
    #[serde(default)]
    pub can_embed_spotify: bool,
    /// Whether the shell can embed an Amazon player.
    #[serde(default)]
    pub can_embed_amazon: bool,
    /// Whether the shell can open a deep link.
    #[serde(default)]
    pub can_open_deep_links: bool,
    /// Whether the shell can play in the background.
    #[serde(default)]
    pub can_play_in_background: bool,
}

/// The configuration of a session.
///
/// WHY the values are numbers and not constants: the configuration is the
/// input of a session; the rules read it and never change it
/// (docs/design/BUILD-CONTRACT.md § 5.1, rule K-4).
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PhomuGameConfig {
    /// The identifiers of the modes that are active, for example
    /// `"timeline"`.
    pub selected_modes: Vec<String>,
    /// The identifiers of the packs the session draws from.
    pub selected_packs: Vec<String>,
    /// How the players are grouped: `individual`, `fixed` or `shifting`.
    pub team_mode: String,
    /// How the game is played: `pass-the-phone` or `multi-device`.
    pub device_mode: String,
    /// What ends the game: `points`, `rounds` or `time`.
    pub ending_condition: String,
    /// The score that ends the game.
    pub target_points: i64,
    /// The number of rounds per player or per team.
    pub target_rounds: u32,
    /// The number of minutes the game lasts.
    pub target_time_minutes: u32,
    /// The upper bound of a question round, in seconds.
    pub time_limit_seconds: Option<u32>,
    /// The difficulty the songs have to have: `all`, `easy`, `medium` or
    /// `hard`.
    pub difficulty: String,
    /// The maximum number of points in the Timeline mode.
    pub timeline_max_points: u32,
    /// Whether the time decay is active.
    pub time_decay_enabled: bool,
    /// The number of seconds after which the first decay step applies.
    pub time_decay_grace_seconds: u32,
    /// The width of one decay step, in seconds.
    pub time_decay_step_seconds: u32,
    /// The number of points deducted per decay step.
    pub time_decay_step_points: u32,
    /// The lower bound of the points of a correct answer.
    pub min_points_per_correct: u32,
    /// Who may perform the override actions: `host`, `co-host` or
    /// `majority`.
    pub override_governance: String,
    /// How the hints are published: `auto-publish` or `manual-review`.
    pub hint_release_policy: String,
    /// What happens when the hint service is blocked: `queue-retry` or
    /// `fail-fast`.
    pub ai_queue_strategy: String,
    /// Whether the chips mechanic is active.
    pub chips_enabled: bool,
    /// Whether the cheat buttons are hidden.
    pub no_cheat_mode: bool,
    /// Whether only songs with a physical card may be drawn.
    pub only_qr_compatible: bool,
    /// Who leaves the game: `none` or `below-score:<threshold>`.
    pub elimination_rule: String,
    /// The provider the players prefer.
    pub preferred_music_provider: String,
}

/// A participant of a session.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuPlayer {
    /// The unique identifier of the player.
    #[serde(default)]
    pub id: String,
    /// The display name of the player.
    #[serde(default)]
    pub name: String,
    /// The identifier of the team the player belongs to.
    #[serde(default)]
    pub team_id: Option<String>,
    /// Whether the player watches instead of playing.
    #[serde(default)]
    pub is_spectator: bool,
    /// Whether the player is the pilot of the lobby.
    #[serde(default)]
    pub is_pilot: bool,
    /// The colour of the player, as a hex string.
    #[serde(default)]
    pub color: Option<String>,
    /// The avatar of the player, as an emoji.
    #[serde(default)]
    pub avatar: Option<String>,
}

/// A team of a session.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuTeam {
    /// The unique identifier of the team.
    #[serde(default)]
    pub id: String,
    /// The display name of the team.
    #[serde(default)]
    pub name: String,
    /// The identifiers of the members of the team.
    #[serde(default)]
    pub player_ids: Vec<String>,
    /// The colour of the team, as a hex string.
    #[serde(default)]
    pub color: Option<String>,
}

/// The score of one player.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuPlayerScore {
    /// The unique identifier of the player.
    #[serde(default)]
    pub id: String,
    /// The display name of the player.
    #[serde(default)]
    pub name: String,
    /// The score of the player.
    #[serde(default)]
    pub score: i64,
    /// The identifier of the team the player belongs to.
    #[serde(default)]
    pub team_id: Option<String>,
    /// Whether the player has been eliminated.
    #[serde(default)]
    pub is_eliminated: bool,
    /// Whether the player watches instead of playing.
    #[serde(default)]
    pub is_spectator: bool,
}

/// The state of a session at a point in time.
///
/// WHY there is no song in the snapshot: the song is not part of the
/// persistable set of a session (C-4,
/// docs/design/PLATFORM-ARCHITECTURE.md § 10.2).
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuSessionSnapshot {
    /// The phase the session is in.
    #[serde(default)]
    pub phase: String,
    /// The number of the current round.
    #[serde(default)]
    pub round_number: u32,
    /// The identifier of the current mode.
    #[serde(default)]
    pub current_mode: String,
    /// The number of points the current round is worth.
    #[serde(default)]
    pub points_possible: u32,
    /// The number of rounds that have been played.
    #[serde(default)]
    pub round_count: u32,
    /// The scores of the players.
    #[serde(default)]
    pub players: Vec<PhomuPlayerScore>,
    /// The identifiers of the teams, with their scores.
    #[serde(default)]
    pub team_scores: Vec<PhomuTeamScore>,
    /// Whether the game is over.
    #[serde(default)]
    pub is_game_over: bool,
    /// The identifier of the winner, if the ending condition named one.
    #[serde(default)]
    pub winner_id: Option<String>,
}

/// The score of one team.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuTeamScore {
    /// The unique identifier of the team.
    #[serde(default)]
    pub id: String,
    /// The score of the team.
    #[serde(default)]
    pub score: i64,
}

/// The answer of one player in one round.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuPlayerAnswer {
    /// The identifier of the player who answered. It is empty when the round
    /// has no active player.
    #[serde(default)]
    pub player_id: Option<String>,
    /// Whether the answer was correct.
    #[serde(default)]
    pub is_correct: bool,
    /// The number of points the answer is worth.
    #[serde(default)]
    pub points_awarded: u32,
    /// The time the answer took, if the mode measures it.
    #[serde(default)]
    pub answered_in_seconds: Option<u32>,
}

/// The scores after the answers of a round.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuScoreSnapshot {
    /// The number of the round.
    #[serde(default)]
    pub round_number: u32,
    /// The identifier of the mode of the round.
    #[serde(default)]
    pub mode: String,
    /// The answers of the round.
    #[serde(default)]
    pub answers: Vec<PhomuPlayerAnswer>,
    /// The scores of the players after the round.
    #[serde(default)]
    pub players: Vec<PhomuPlayerScore>,
}

/// The state of the game at its end.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuGameOverSnapshot {
    /// The identifier of the winner, if there is one.
    #[serde(default)]
    pub winner_id: Option<String>,
    /// The number of rounds that were played.
    #[serde(default)]
    pub round_count: u32,
    /// The final scores of the players.
    #[serde(default)]
    pub players: Vec<PhomuPlayerScore>,
    /// The final scores of the teams.
    #[serde(default)]
    pub team_scores: Vec<PhomuTeamScore>,
}

/// One source the shell may play.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuMediaCandidate {
    /// The identifier of the source, for example `youtube-primary`.
    #[serde(default)]
    pub source: String,
    /// The kind of the source: `embed`, `preview-audio` or `deep-link`.
    #[serde(default)]
    pub kind: String,
    /// The location the shell has to open.
    #[serde(default)]
    pub location: String,
}

/// The plan of the base for the media of the current round.
///
/// WHY the shell receives a plan and not a decision: the base decides *what*
/// is played and in which order, the shell decides *how*
/// (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuMediaPlan {
    /// The sources, in the order they have to be tried.
    #[serde(default)]
    pub candidates: Vec<PhomuMediaCandidate>,
    /// The offset in seconds at which the playback starts.
    #[serde(default)]
    pub start_seconds: u32,
    /// The offset in seconds at which the playback stops.
    #[serde(default)]
    pub end_seconds: Option<u32>,
}

/// One pack of the catalogue.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuPackInfo {
    /// The unique identifier of the pack.
    #[serde(default)]
    pub id: String,
    /// The display name of the pack.
    #[serde(default)]
    pub name: String,
    /// The i18n key of the tagline of the pack.
    #[serde(default)]
    pub tagline_key: String,
    /// The number of songs in the pack.
    #[serde(default)]
    pub song_count: u32,
}

/// The summary of one song of the catalogue.
///
/// WHY there is no title, no artist and no year: the summary is what a shell
/// shows before the reveal. The identity of the song is not part of it
/// (docs/design/BUILD-CONTRACT.md § 2.3).
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuSongSummary {
    /// The unique identifier of the song.
    #[serde(default)]
    pub id: String,
    /// The difficulty of the song.
    #[serde(default)]
    pub difficulty: String,
    /// The identifiers of the packs the song belongs to.
    #[serde(default)]
    pub packs: Vec<String>,
    /// The identifiers of the modes the song supports.
    #[serde(default)]
    pub supported_modes: Vec<String>,
    /// Whether the song is on the physical card deck.
    #[serde(default)]
    pub is_qr_compatible: bool,
    /// Whether the song carries lyric data.
    #[serde(default)]
    pub has_lyrics: bool,
}
