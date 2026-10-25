//! The data model of a session.
//!
//! WHAT: the players, the teams, the answers and the round history.
//!
//! WHY: the model is the contract between the session and the view models.
//! The scoreboard has to agree on every device, therefore a player has
//! exactly one score and a team has exactly one score
//! (`docs/design/PLATFORM-ARCHITECTURE.md` § 4.1).

use phomu_catalog::Song;

use crate::modes::GameMode;
use crate::session::config::GameConfig;
use crate::session::round::RoundState;

/// The complete state of a session.
///
/// WHY: the state is persisted on every platform and rehydrated after a
/// crash; a state without a version cannot be migrated
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-103). The state carries the
/// song of the running round — it therefore never leaves the core and never
/// reaches the disk (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-4).
///
/// EXAMPLE: a new state has the schema version 1 and no player.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionState {
    /// The version of the state schema.
    pub schema_version: u32,
    /// The identifier of the session.
    pub session_id: String,
    /// The players of the session.
    pub players: Vec<Player>,
    /// The teams of the session.
    pub teams: Vec<Team>,
    /// The identifiers of the players or teams, in the order of their turns.
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    pub current_turn_index: usize,
    /// The configuration of the session.
    pub config: GameConfig,
    /// The number of the round that is played.
    pub current_round: u32,
    /// The state of the running round.
    pub round: RoundState,
    /// The rounds that have been played.
    pub round_history: Vec<RoundRecord>,
    /// The identifiers of the songs that have been played.
    pub played_song_ids: Vec<String>,
    /// Whether the game has ended.
    pub is_game_over: bool,
    /// The winner, if the ending condition named one.
    pub winner_id: Option<String>,
    /// The experience points of the session.
    pub total_xp: i64,
    /// The years of the shared timeline.
    pub timeline_years: Vec<i32>,
    /// The moment the game started, in milliseconds since the epoch.
    pub game_start_ms: Option<u64>,
    /// The seed of the generator.
    pub seed: u64,
    /// The state of the generator, so that a reloaded session continues with
    /// the same sequence.
    pub rng_state: u64,
    /// The artists of the catalogue, used by the Cover Confusion mode.
    pub artist_pool: Vec<String>,
    /// Whether the drawing phase has to draw automatically — the flag of a
    /// skipped song (`src/stores/game-store.ts:415`).
    pub auto_draw_intent: bool,
}

/// A participant of a session.
///
/// WHY: the scoreboard has to agree on every device, therefore a player has
/// exactly one score (`docs/design/PLATFORM-ARCHITECTURE.md` § 4.1).
///
/// EXAMPLE: the player with the identifier `p1` has the score zero in a
/// new session.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Player {
    /// The unique identifier of the player.
    pub id: String,
    /// The display name of the player.
    pub name: String,
    /// The score of the player in the session.
    pub score: i64,
    /// The team the player belongs to, if any.
    pub team_id: Option<String>,
    /// Whether the player has been eliminated.
    pub is_eliminated: bool,
    /// Whether the player watches instead of playing.
    pub is_spectator: bool,
    /// Whether the player is the pilot of the lobby.
    pub is_pilot: bool,
    /// The colour of the player, as a hex string.
    pub color: Option<String>,
    /// The avatar of the player, as an emoji.
    pub avatar: Option<String>,
}

impl Player {
    /// Builds a player with the default values of a lobby entry.
    ///
    /// WHY: the lobby collects the name and the identifier; every other
    /// value starts at its default.
    ///
    /// EXAMPLE: `Player::new("p1", "Alex")` has the score zero.
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            score: 0,
            team_id: None,
            is_eliminated: false,
            is_spectator: false,
            is_pilot: false,
            color: None,
            avatar: None,
        }
    }
}

/// A team of a session.
///
/// WHY: the team carries the sum of the points of its members (GAME-007);
/// the relation has to hold at every moment of the game.
///
/// EXAMPLE: the team with the identifier `t0` has the score zero in a new
/// session.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Team {
    /// The unique identifier of the team.
    pub id: String,
    /// The display name of the team.
    pub name: String,
    /// The identifiers of the members of the team.
    pub player_ids: Vec<String>,
    /// The score of the team.
    pub score: i64,
    /// The colour of the team, as a hex string.
    pub color: Option<String>,
}

impl Team {
    /// Builds an empty team.
    ///
    /// WHY: the lobby collects the name and the identifier; the members
    /// join later.
    ///
    /// EXAMPLE: `Team::new("t1", "Die Band")` has the score zero.
    pub fn new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            player_ids: Vec::new(),
            score: 0,
            color: None,
        }
    }
}

/// The value of an answer, normalised over the modes.
///
/// WHY: the round log stores what the player answered; the normalisation
/// keeps the log comparable over the six modes.
///
/// EXAMPLE: `AnswerValue::Correct` is the answer of a correct round.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnswerValue {
    /// The answer was correct.
    Correct,
    /// The answer was wrong.
    Incorrect,
    /// The answer was corrected by the power user.
    OverrideCorrect,
    /// A textual answer, for example a mood.
    Text(String),
    /// A numeric answer, for example a slot of the timeline.
    Number(i64),
    /// A yes-or-no answer, for example "one-hit wonder".
    Flag(bool),
}

/// The answer of one player in one round.
///
/// WHY: the round log needs the answer together with its value and its
/// time; the time is the input of the time decay (GAME-038).
///
/// EXAMPLE: the answer of the pilot carries the points that were awarded
/// and the time the answer took.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerAnswer {
    /// The player who answered.
    pub player_id: String,
    /// The value of the answer.
    pub answer: AnswerValue,
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The number of points the answer is worth.
    pub points_awarded: u32,
    /// The time the answer took, if the mode measures it.
    pub answered_in_seconds: Option<u32>,
}

/// The record of a finished round.
///
/// WHY: the record carries the song and therefore the solution; it is
/// never persisted (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-4).
///
/// EXAMPLE: the record of the first round carries the round number 1 and
/// the song of the round.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoundRecord {
    /// The number of the round.
    pub round_number: u32,
    /// The mode of the round.
    pub mode: GameMode,
    /// The song of the round. The record contains the solution — it is
    /// therefore never persisted.
    pub song: Song,
    /// The answers of the round.
    pub answers: Vec<PlayerAnswer>,
    /// The moment the round was finished, in milliseconds since the epoch.
    pub completed_at_ms: u64,
}

/// Where the song of a round comes from.
///
/// WHY: the source decides whether a broken song is drawn again
/// automatically or the pilot scans again (GAME-013).
///
/// EXAMPLE: `SongSource::Qr` is the song of a scanned physical card.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SongSource {
    /// The song was drawn from the catalogue.
    Random,
    /// The song was scanned from a physical card.
    Qr,
}

impl SongSource {
    /// The identifier of the source.
    ///
    /// WHY: the identifier decides whether a broken song is drawn again
    /// automatically or the pilot scans again (GAME-013).
    ///
    /// EXAMPLE: `SongSource::Qr.as_str()` is `"qr"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            SongSource::Random => "random",
            SongSource::Qr => "qr",
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{Player, SongSource, Team};

    #[test]
    fn a_new_player_has_the_default_values() {
        let player = Player::new("p1", "Alex");
        assert_eq!(player.score, 0);
        assert!(!player.is_eliminated);
        assert!(!player.is_spectator);
        assert!(player.team_id.is_none());
    }

    #[test]
    fn a_new_team_is_empty() {
        let team = Team::new("t1", "Die Band");
        assert!(team.player_ids.is_empty());
        assert_eq!(team.score, 0);
    }

    #[test]
    fn the_source_identifiers_are_stable() {
        assert_eq!(SongSource::Random.as_str(), "random");
        assert_eq!(SongSource::Qr.as_str(), "qr");
    }
}
