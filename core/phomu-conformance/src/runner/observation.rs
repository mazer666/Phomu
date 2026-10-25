//! The observation of a run and the reading of a session.
//!
//! WHAT: the observation of a run ([`Observation`]), the recorded answers
//! ([`AnswerRecord`]), the error of the vector level ([`ObservedError`]) and
//! the reading of the state of a session ([`observe`]).
//!
//! WHY: the observation is the **shared result format** — the common
//! denominator of the comparison. The TypeScript runner
//! (`tools/conformance/lib/types.ts`) and the Rust runner write the same
//! structure, so that the comparison can read both field by field. The
//! format is fixed here; a change on one side has to be made on the other
//! side in the same commit.
//!
//! The observation lives in its own module because it is the largest part of
//! the result format: the format of the result is one concern, the replay of
//! a vector another one (QA-09 backlog item 2.9).

use std::collections::BTreeMap;

use phomu_core::facade::{AnswerValue, PlayerAnswer, Session};
use serde::{Deserialize, Serialize};

/// The observation of a run.
///
/// WHY: this is the **shared result format** — the common denominator of the
/// comparison. The TypeScript runner (`tools/conformance/lib/types.ts`) and
/// this runner write the same structure, so that the comparison can read
/// both field by field. The format is fixed here; a change on one side has
/// to be made on the other side in the same commit.
///
/// The fields and their types:
///
/// | Field | Type | Meaning |
/// |---|---|---|
/// | `phases` | `string[]` | the phase after every input, in order |
/// | `currentRound` | `number` | the number of the round that is played |
/// | `currentMode` | `string` | the mode of the round |
/// | `currentSongId` | `string \| null` | the identifier of the drawn song |
/// | `currentSongSource` | `"random" \| "qr" \| null` | where the song came from |
/// | `autoDrawIntent` | `boolean` | whether the drawing phase draws automatically |
/// | `playerScores` | `{ [playerId: string]: number }` | the score of every player |
/// | `teamScores` | `{ [teamId: string]: number }` | the score of every team |
/// | `playerTeams` | `{ [playerId: string]: string \| null }` | the team of every player |
/// | `teamMembers` | `{ [teamId: string]: string[] }` | the members of every team |
/// | `turnOrder` | `string[]` | the order in which the turns are played |
/// | `currentTurnIndex` | `number` | the index of the turn that is played |
/// | `winnerId` | `string \| null` | the winner of the game |
/// | `isGameOver` | `boolean` | whether the game has ended |
/// | `timelineYears` | `number[]` | the years of the shared timeline |
/// | `playedSongIds` | `string[]` | the songs that have been played |
/// | `answers` | `ObservedAnswer[]` | the answers of the round |
/// | `roundCount` | `number` | the number of logged rounds |
/// | `totalXP` | `number` | the experience points of the session |
/// | `censorHint` | `string \| null` | the result of the last censoring probe |
/// | `filteredSongIds` | `string[] \| null` | the result of the last filter probe |
/// | `error` | `{ code: string, message: string } \| null` | the error situation of the last refused input |
///
/// ## The two namespaces of the error
///
/// The field `error` carries the error situation that the implementation
/// produced. There are two namespaces, and they are distinguished by the
/// code:
///
/// | Namespace | `code` | `message` | Meaning |
/// |---|---|---|---|
/// | the **vector layer** | the name of the failure, e.g. `"UNKNOWN_SONG"` | a human-readable text | the input could not be executed at all |
/// | the **core** | the stable numeric code of the failure, e.g. `"1004"` | the i18n message key, e.g. `"errors.unknownPlayer"` | the input was executed and refused by the rules |
///
/// WHY: the base never assembles a sentence — it names the key and the shell
/// resolves the text in its own locale files
/// ([`../../docs/design/BUILD-CONTRACT.md`](../../docs/design/BUILD-CONTRACT.md)
/// § 6.1, rule L-7). The numeric code is the stable identifier that the
/// bridges export (`platform/phomu-ffi/src/error.rs`), so the observation
/// names the same identifier a shell would receive. The two identifiers
/// that the core owns — the numeric code and the message key — are used
/// as they are; no third name is invented for them
/// (CORE-104: every constant has exactly one home).
///
/// The typed errors of the core are part of the contract
/// ([`../../docs/spec/REQUIREMENTS-PLATFORM.md`](../../docs/spec/REQUIREMENTS-PLATFORM.md),
/// CORE-111) and the promise of the same named error situations
/// ([`../../docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md)
/// § 1.4) is only checkable when the observation carries them. A runner that
/// discarded them would make the promise unfalsifiable.
///
/// EXAMPLE: the JSON of one vector of the result file.
///
/// ```json
/// {
///   "runner": "rust",
///   "schemaVersion": 1,
///   "results": [
///     {
///       "id": "phase/question-to-reveal",
///       "area": "phase-machine",
///       "portable": true,
///       "observation": {
///         "phases": ["question"],
///         "currentRound": 1,
///         "currentMode": "timeline",
///         "currentSongId": "s-a",
///         "currentSongSource": "random",
///         "autoDrawIntent": false,
///         "playerScores": { "p1": 0 },
///         "teamScores": {},
///         "playerTeams": { "p1": null },
///         "teamMembers": {},
///         "turnOrder": ["p1"],
///         "currentTurnIndex": 0,
///         "winnerId": null,
///         "isGameOver": false,
///         "timelineYears": [],
///         "playedSongIds": ["s-a"],
///         "answers": [],
///         "roundCount": 0,
///         "totalXP": 0,
///         "censorHint": null,
///         "filteredSongIds": null,
///         "error": null
///       }
///     }
///   ]
/// }
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Observation {
    /// The phase after every input that succeeded.
    pub phases: Vec<String>,
    /// The number of the round.
    pub current_round: u32,
    /// The mode of the round.
    pub current_mode: String,
    /// The song of the round.
    pub current_song_id: Option<String>,
    /// Where the song came from.
    pub current_song_source: Option<String>,
    /// Whether the drawing phase draws automatically.
    pub auto_draw_intent: bool,
    /// The score of every player.
    pub player_scores: BTreeMap<String, i64>,
    /// The score of every team.
    pub team_scores: BTreeMap<String, i64>,
    /// The team of every player.
    pub player_teams: BTreeMap<String, Option<String>>,
    /// The members of every team.
    pub team_members: BTreeMap<String, Vec<String>>,
    /// The order of the turns.
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    pub current_turn_index: usize,
    /// The winner of the game.
    pub winner_id: Option<String>,
    /// Whether the game has ended.
    pub is_game_over: bool,
    /// The years of the timeline.
    pub timeline_years: Vec<i32>,
    /// The identifiers of the songs that have been played.
    pub played_song_ids: Vec<String>,
    /// The answers that were recorded.
    pub answers: Vec<AnswerRecord>,
    /// The number of logged rounds.
    pub round_count: usize,
    /// The experience points of the session.
    #[serde(rename = "totalXP")]
    pub total_xp: i64,
    /// The result of the censoring probe.
    pub censor_hint: Option<String>,
    /// The result of the filter probe.
    pub filtered_song_ids: Option<Vec<String>>,
    /// The error of the vector level.
    pub error: Option<ObservedError>,
}

/// One recorded answer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRecord {
    /// The player who answered.
    pub player_id: String,
    /// The stored label of the answer.
    pub answer: String,
    /// The class of the result — "correct" or "incorrect".
    pub outcome: String,
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The points of the answer.
    pub points_awarded: u32,
    /// The time the answer took.
    pub answered_in_seconds: Option<u32>,
}

/// The error of the vector level.
///
/// WHY: the error has a code and a message — the code is the stable part
/// that the comparison reports, the message is the human-readable part.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedError {
    /// The stable code of the error.
    pub code: String,
    /// The human-readable message.
    pub message: String,
}

/// Reads the observation of a session.
///
/// WHY: the observation is written **after** the replay, so that it carries
/// the final state of the session and not the state of an intermediate step.
pub(crate) fn observe(session: &Session, observation: &mut Observation) {
    let state = session.state();
    observation.current_round = state.current_round;
    observation.current_mode = state.round.mode.as_str().to_string();
    observation.current_song_id = state.round.song.as_ref().map(|song| song.id.clone());
    observation.current_song_source = state
        .round
        .song_source
        .map(|source| source.as_str().to_string());
    observation.auto_draw_intent = state.auto_draw_intent;
    observation.player_scores = state
        .players
        .iter()
        .map(|player| (player.id.clone(), player.score))
        .collect();
    observation.team_scores = state
        .teams
        .iter()
        .map(|team| (team.id.clone(), team.score))
        .collect();
    observation.player_teams = state
        .players
        .iter()
        .map(|player| (player.id.clone(), player.team_id.clone()))
        .collect();
    observation.team_members = state
        .teams
        .iter()
        .map(|team| (team.id.clone(), team.player_ids.clone()))
        .collect();
    observation.turn_order = state.turn_order.clone();
    observation.current_turn_index = state.current_turn_index;
    observation.winner_id = state.winner_id.clone();
    observation.is_game_over = state.is_game_over;
    observation.timeline_years = state.timeline_years.clone();
    observation.played_song_ids = state.played_song_ids.clone();
    observation.answers = state
        .round
        .answers
        .iter()
        .map(|answer: &PlayerAnswer| AnswerRecord {
            player_id: answer.player_id.clone(),
            answer: label_of(&answer.answer),
            outcome: if answer.is_correct {
                "correct".to_string()
            } else {
                "incorrect".to_string()
            },
            is_correct: answer.is_correct,
            points_awarded: answer.points_awarded,
            answered_in_seconds: answer.answered_in_seconds,
        })
        .collect();
    observation.round_count = state.round_history.len();
    observation.total_xp = state.total_xp;
}

/// The stored label of an answer.
fn label_of(answer: &AnswerValue) -> String {
    match answer {
        AnswerValue::Correct => "correct".to_string(),
        AnswerValue::Incorrect => "incorrect".to_string(),
        AnswerValue::OverrideCorrect => "override-correct".to_string(),
        AnswerValue::Text(text) => text.clone(),
        AnswerValue::Number(number) => number.to_string(),
        AnswerValue::Flag(flag) => flag.to_string(),
    }
}
