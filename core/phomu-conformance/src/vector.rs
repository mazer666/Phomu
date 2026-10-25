//! The model of a conformance vector.
//!
//! WHAT: the JSON model of a vector — the situation (`given`), the inputs
//! (`when`) and the expected observation (`then`).
//!
//! WHY: the format is the one of the corpus in `vectors/`; it is described
//! by `vectors/schema.json` and by `vectors/README.md`. The model of this
//! module is the Rust reading of that schema, so that the Rust runner and
//! the TypeScript runner read the same files.
//!
//! The corpus is the property of the conformance worker; this crate is the
//! runner that replays it against the core.
//!
//! The model is split into four concerns, one module each: the songs of a
//! vector (`vector/song.rs`), the inputs of a vector (`vector/op.rs`), the
//! expectation of a vector (`vector/expectation.rs`) and the conversion into
//! the model of the core (`vector/convert.rs`). This module is the facade
//! that ties them together (QA-09 backlog item 2.9).

mod convert;
mod expectation;
mod op;
mod song;

pub use expectation::{Observation, VectorErrorValue};
pub use op::{FilterOptions, Op, VectorAnswer};
pub use song::VectorSong;

use std::collections::BTreeMap;

use serde::Deserialize;

include!(concat!(env!("OUT_DIR"), "/vectors_generated.rs"));

/// The reason why a vector could not be read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VectorError {
    /// The identifier of the vector.
    pub id: String,
    /// What went wrong.
    pub reason: String,
}

impl std::fmt::Display for VectorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "the vector {} is invalid: {}", self.id, self.reason)
    }
}

impl std::error::Error for VectorError {}

/// A conformance vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vector {
    /// The version of the format.
    pub schema_version: u32,
    /// The identifier of the vector.
    pub id: String,
    /// The behaviour area.
    pub area: String,
    /// What the vector proves.
    pub title: String,
    /// Where the behaviour is documented in the reference implementation.
    #[serde(default)]
    pub reference: String,
    /// Whether both implementations have to produce the same observation.
    pub portable: bool,
    /// Why the vector is not portable.
    #[serde(default)]
    pub portability_note: String,
    /// The situation the vector starts from.
    #[serde(default)]
    pub given: Given,
    /// The inputs, in the order in which they are executed.
    #[serde(default)]
    pub when: Vec<Op>,
    /// The expected observation.
    pub then: Observation,
}

/// The situation a vector starts from.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Given {
    /// The partial configuration of the session.
    #[serde(default)]
    pub config: VectorConfig,
    /// The players of the session.
    #[serde(default)]
    pub players: Vec<VectorPlayer>,
    /// The teams of the session.
    #[serde(default)]
    pub teams: Vec<VectorTeam>,
    /// The order of the turns.
    #[serde(default)]
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    #[serde(default)]
    pub current_turn_index: usize,
    /// The number of the round.
    #[serde(default)]
    pub current_round: u32,
    /// The phase of the round.
    #[serde(default)]
    pub round_phase: Option<String>,
    /// The mode of the round.
    #[serde(default)]
    pub current_mode: Option<String>,
    /// The identifier of the song of the round.
    #[serde(default)]
    pub current_song: Option<String>,
    /// The years of the timeline.
    #[serde(default)]
    pub timeline_years: Vec<i32>,
    /// The identifiers of the songs that have been played.
    #[serde(default)]
    pub played_song_ids: Vec<String>,
    /// Where the song of the round came from.
    #[serde(default)]
    pub current_song_source: Option<String>,
    /// Whether the drawing phase draws automatically.
    #[serde(default)]
    pub auto_draw_intent: bool,
    /// The moment the game started.
    #[serde(default)]
    pub game_start_time: Option<u64>,
    /// The experience points of the session.
    #[serde(default, rename = "totalXP")]
    pub total_xp: i64,
    /// Whether the game has ended.
    #[serde(default)]
    pub is_game_over: bool,
    /// The winner of the game.
    #[serde(default)]
    pub winner_id: Option<String>,
    /// The song fixtures of the vector.
    #[serde(default)]
    pub songs: BTreeMap<String, VectorSong>,
    /// The catalogue a `filterSongs` probe runs against.
    #[serde(default)]
    pub catalogue: Vec<VectorSong>,
}

/// A player of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorPlayer {
    /// The identifier of the player.
    pub id: String,
    /// The name of the player.
    #[serde(default)]
    pub name: String,
    /// The score of the player.
    #[serde(default)]
    pub score: i64,
    /// The team of the player.
    #[serde(default)]
    pub team_id: Option<String>,
    /// Whether the player has been eliminated.
    #[serde(default)]
    pub is_eliminated: bool,
    /// Whether the player watches instead of playing.
    #[serde(default)]
    pub is_spectator: bool,
    /// Whether the player is the pilot.
    #[serde(default)]
    pub is_pilot: bool,
}

/// A team of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorTeam {
    /// The identifier of the team.
    pub id: String,
    /// The name of the team.
    #[serde(default)]
    pub name: String,
    /// The members of the team.
    #[serde(default)]
    pub player_ids: Vec<String>,
    /// The score of the team.
    #[serde(default)]
    pub score: i64,
    /// The colour of the team.
    #[serde(default)]
    pub color: Option<String>,
}

/// The partial configuration of a vector.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorConfig {
    /// The modes that are active.
    #[serde(default)]
    pub selected_modes: Vec<String>,
    /// The team mode.
    #[serde(default)]
    pub team_mode: Option<String>,
    /// The ending condition.
    #[serde(default)]
    pub ending_condition: Option<String>,
    /// The target score.
    #[serde(default)]
    pub target_points: Option<i64>,
    /// The number of rounds per player or per team.
    #[serde(default)]
    pub target_rounds: Option<u32>,
    /// The number of minutes.
    #[serde(default)]
    pub target_time_minutes: Option<u32>,
    /// Whether the time decay is active.
    #[serde(default)]
    pub time_decay_enabled: Option<bool>,
    /// The number of seconds after which the first decay step applies.
    #[serde(default)]
    pub time_decay_grace_seconds: Option<u32>,
    /// The width of one decay step in seconds.
    #[serde(default)]
    pub time_decay_step_seconds: Option<u32>,
    /// The number of points deducted per decay step.
    #[serde(default)]
    pub time_decay_step_points: Option<u32>,
    /// The lower bound of the points of a correct answer.
    #[serde(default)]
    pub min_points_per_correct: Option<u32>,
    /// The maximum number of points of the Timeline mode.
    #[serde(default)]
    pub timeline_max_points: Option<u32>,
    /// Whether the cheats are hidden.
    #[serde(default)]
    pub no_cheat_mode: Option<bool>,
    /// The difficulty filter.
    #[serde(default)]
    pub difficulty: Option<String>,
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{VECTOR_FILES, Vector};

    #[test]
    fn every_vector_is_valid_json() {
        assert!(!VECTOR_FILES.is_empty());
        for (id, text) in VECTOR_FILES {
            let vector = Vector::from_json(id, text).expect("the vector is valid");
            assert_eq!(&vector.id, id);
        }
    }
}
