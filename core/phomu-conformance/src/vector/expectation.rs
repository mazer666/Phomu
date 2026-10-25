//! The expectation of a vector.
//!
//! WHAT: the expected observation ([`Observation`]), the expected answer
//! ([`AnswerRecord`]) and the expected error ([`VectorErrorValue`]).
//!
//! WHY: the expectation is the second half of the comparison — the runner
//! writes the observation, the vector carries the expectation. The two live
//! in different modules, because only the observation is written into the
//! result file and only the expectation is read from the corpus
//! (QA-09 backlog item 2.9).

use std::collections::BTreeMap;

use serde::Deserialize;

/// The expected observation of a vector.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Observation {
    /// The phase after every input.
    #[serde(default)]
    pub phases: Vec<String>,
    /// The number of the round.
    #[serde(default)]
    pub current_round: u32,
    /// The mode of the round.
    #[serde(default)]
    pub current_mode: String,
    /// The song of the round.
    #[serde(default)]
    pub current_song_id: Option<String>,
    /// Where the song came from.
    #[serde(default)]
    pub current_song_source: Option<String>,
    /// Whether the drawing phase draws automatically.
    #[serde(default)]
    pub auto_draw_intent: bool,
    /// The score of every player.
    #[serde(default)]
    pub player_scores: BTreeMap<String, i64>,
    /// The score of every team.
    #[serde(default)]
    pub team_scores: BTreeMap<String, i64>,
    /// The team of every player.
    #[serde(default)]
    pub player_teams: BTreeMap<String, Option<String>>,
    /// The members of every team.
    #[serde(default)]
    pub team_members: BTreeMap<String, Vec<String>>,
    /// The order of the turns.
    #[serde(default)]
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    #[serde(default)]
    pub current_turn_index: usize,
    /// The winner of the game.
    #[serde(default)]
    pub winner_id: Option<String>,
    /// Whether the game has ended.
    #[serde(default)]
    pub is_game_over: bool,
    /// The years of the timeline.
    #[serde(default)]
    pub timeline_years: Vec<i32>,
    /// The identifiers of the songs that have been played.
    #[serde(default)]
    pub played_song_ids: Vec<String>,
    /// The answers that were recorded.
    #[serde(default)]
    pub answers: Vec<AnswerRecord>,
    /// The number of logged rounds.
    #[serde(default)]
    pub round_count: usize,
    /// The experience points of the session.
    #[serde(default, rename = "totalXP")]
    pub total_xp: i64,
    /// The result of the censoring probe.
    #[serde(default)]
    pub censor_hint: Option<String>,
    /// The result of the filter probe.
    #[serde(default)]
    pub filtered_song_ids: Option<Vec<String>>,
    /// The error of the vector level.
    #[serde(default)]
    pub error: Option<VectorErrorValue>,
}

/// One recorded answer.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRecord {
    /// The player who answered.
    pub player_id: String,
    /// The stored label of the answer.
    pub answer: String,
    /// The class of the result.
    #[serde(default)]
    pub outcome: Option<String>,
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The points of the answer.
    pub points_awarded: u32,
    /// The time the answer took.
    #[serde(default)]
    pub answered_in_seconds: Option<u32>,
}

/// The error of the vector level.
#[derive(Debug, Clone, Deserialize)]
pub struct VectorErrorValue {
    /// The code of the error.
    pub code: String,
    /// The message of the error.
    #[serde(default)]
    pub message: String,
}
