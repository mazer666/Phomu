//! The runner of the conformance vectors.
//!
//! WHAT: the replay of a vector against the core ([`run_vector`]), the
//! observation of the result ([`Observation`]) and the comparison with the
//! expectation of the vector.
//!
//! WHY: the runner is the evidence. A vector that produces the expected
//! observation proves that the base behaves as the contract says; a shell
//! that replays the same vectors through its bridge proves that the shell
//! behaves the same (docs/design/PLATFORM-ARCHITECTURE.md § 1.3).

use std::collections::BTreeMap;

use phomu_core::facade::{
    AnswerValue, GameConfig, PhomuError, Player, PlayerAnswer, RoundPhase, RoundState, Session,
    SessionState, SongSource, Team,
};
use serde::{Deserialize, Serialize};

use crate::vector::{Given, Op, Vector, VectorError};

/// The error codes of the vector level.
const ERROR_UNKNOWN_SONG: &str = "UNKNOWN_SONG";
const ERROR_NO_CURRENT_SONG: &str = "NO_CURRENT_SONG";

/// The version of the result format of a runner.
///
/// WHY: the format is the common denominator of the comparison — the
/// TypeScript runner and the Rust runner write the same structure, so that
/// the comparison can read both field by field.
pub const RESULT_SCHEMA_VERSION: u32 = 1;

/// The result of the replay of a vector.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VectorOutcome {
    /// The identifier of the vector.
    pub id: String,
    /// Whether the vector is portable.
    pub portable: bool,
    /// The observation of the run.
    pub observation: Observation,
    /// The differences to the expectation of the vector.
    pub differences: Vec<String>,
}

impl VectorOutcome {
    /// Whether the vector produced the expected observation.
    pub fn passed(&self) -> bool {
        self.differences.is_empty()
    }

    /// The report of the run, one line per difference.
    pub fn report(&self) -> String {
        if self.passed() {
            return format!("{}: ok", self.id);
        }
        let mut report = format!("{}: {} difference(s)", self.id, self.differences.len());
        for difference in &self.differences {
            report.push_str("\n  - ");
            report.push_str(difference);
        }
        report
    }
}

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

/// The result file of a runner.
///
/// WHY: the two runners write the same file — the comparison reads both and
/// decides vector by vector whether the implementations behave identically.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerResult {
    /// The name of the runner — "rust" or "typescript".
    pub runner: String,
    /// The version of the format.
    pub schema_version: u32,
    /// The observation of every vector.
    pub results: Vec<VectorResult>,
}

/// The observation of one vector.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorResult {
    /// The identifier of the vector.
    pub id: String,
    /// The behaviour area the vector belongs to.
    pub area: String,
    /// Whether both implementations have to produce the same observation.
    pub portable: bool,
    /// The observation.
    pub observation: Observation,
}

/// Replays the corpus of the web shell against the core.
///
/// WHY: the corpus of the web shell documents the behaviour of the
/// TypeScript reference implementation. The core implements the *specified*
/// rules, and the two differ where the reference implementation has a
/// defect. The runner therefore reports the differences instead of hiding
/// them: the list of the known differences is
/// [`KNOWN_DIVERGENCES`](crate::KNOWN_DIVERGENCES).
///
/// EXAMPLE: the report names every vector of the corpus that differs.
pub fn run_web_shell_corpus() -> Vec<VectorOutcome> {
    let mut outcomes = Vec::new();
    for (id, text) in crate::vector::WEB_SHELL_VECTOR_FILES {
        let vector = match Vector::from_json(id, text) {
            Ok(vector) => vector,
            Err(_) => continue,
        };
        if let Ok(outcome) = run_vector(&vector) {
            outcomes.push(outcome);
        }
    }
    outcomes
}

/// Replays a corpus against the core and reports it in the shared format.
///
/// WHY: the comparison reads the result file of both runners. This function
/// is the Rust side of that file: the same structure, the same field names
/// and the same types as the TypeScript runner writes.
///
/// EXAMPLE: the result of a corpus of two vectors has two entries.
pub fn run_corpus(vectors: &[Vector]) -> Vec<VectorResult> {
    vectors
        .iter()
        .map(|vector| {
            let outcome = run_vector(vector).unwrap_or_else(|error| VectorOutcome {
                id: vector.id.clone(),
                portable: vector.portable,
                observation: Observation {
                    error: Some(ObservedError {
                        code: "VECTOR_NOT_READABLE".to_string(),
                        message: error.reason.clone(),
                    }),
                    ..Observation::default()
                },
                differences: Vec::new(),
            });
            VectorResult {
                id: outcome.id,
                area: vector.area.clone(),
                portable: outcome.portable,
                observation: outcome.observation,
            }
        })
        .collect()
}

/// Replays a vector against the core and compares the result.
///
/// WHY: the observation protocol is the one of the TypeScript runner — the
/// phase is recorded after **every** input, also after an input that the
/// core refused; an input that the vector layer cannot execute at all ends
/// the replay. Only a protocol that both sides share makes the phases
/// comparable.
///
/// EXAMPLE: a vector that ends with a reveal produces the phases
/// `["drawing", "question", "locked-in", "reveal"]`.
///
/// # Errors
/// Returns the error `VectorError` when the vector itself is malformed and
/// cannot be replayed at all.
pub fn run_vector(vector: &Vector) -> Result<VectorOutcome, VectorError> {
    let mut session = build_session(vector)?;
    let mut now_ms: u64 = 0;
    let mut observation = Observation::default();

    for op in &vector.when {
        match execute(&mut session, vector, op, &mut now_ms, &mut observation) {
            Ok(()) => {}
            Err(failure) => {
                // A refusal of the rules is an error situation of the
                // implementation and is part of the observation. The replay
                // continues: the phase is still recorded after the refused
                // input, and the next input is still executed.
                if let Some(error) = failure.core_error {
                    observation.error = Some(error);
                }
                if let Some(error) = failure.vector_error {
                    observation.error = Some(error);
                    break;
                }
            }
        }
        observation
            .phases
            .push(session.phase().as_str().to_string());
    }

    observe(&session, &mut observation);

    let mut outcome = VectorOutcome {
        id: vector.id.clone(),
        portable: vector.portable,
        observation,
        differences: Vec::new(),
    };
    outcome.differences = compare(vector, &outcome.observation);
    Ok(outcome)
}

/// Builds the session of a vector from its situation.
fn build_session(vector: &Vector) -> Result<Session, VectorError> {
    let given: &Given = &vector.given;
    let config = build_config(given)?;
    let players: Vec<Player> = given
        .players
        .iter()
        .map(|player| {
            let mut built = Player::new(player.id.clone(), player.name.clone());
            built.score = player.score;
            built.team_id = player.team_id.clone();
            built.is_eliminated = player.is_eliminated;
            built.is_spectator = player.is_spectator;
            built.is_pilot = player.is_pilot;
            built
        })
        .collect();
    let teams: Vec<Team> = given
        .teams
        .iter()
        .map(|team| Team {
            id: team.id.clone(),
            name: team.name.clone(),
            player_ids: team.player_ids.clone(),
            score: team.score,
            color: team.color.clone(),
        })
        .collect();

    let song = given.current_song.as_ref().and_then(|id| vector.song(id));
    // A song that is the current song has been drawn: the source is the
    // random draw and the song counts as played.
    let song_source = given
        .current_song_source
        .as_deref()
        .and_then(parse_source)
        .or_else(|| given.current_song.as_ref().map(|_| SongSource::Random));
    let mut played_song_ids = given.played_song_ids.clone();
    if let Some(song) = given.current_song.as_ref() {
        if !played_song_ids.contains(song) {
            played_song_ids.push(song.clone());
        }
    }
    let phase = given
        .round_phase
        .as_deref()
        .and_then(parse_phase)
        .unwrap_or(RoundPhase::Drawing);
    let mode = given
        .current_mode
        .as_deref()
        .and_then(parse_mode)
        .unwrap_or(phomu_core::facade::GameMode::Timeline);

    let state = SessionState {
        schema_version: phomu_core::facade::SCHEMA_VERSION,
        session_id: format!("vector-{}", vector.id),
        players,
        teams,
        turn_order: given.turn_order.clone(),
        current_turn_index: given.current_turn_index,
        config,
        current_round: given.current_round,
        round: RoundState {
            phase,
            song,
            mode,
            answers: Vec::new(),
            answers_locked: false,
            song_source,
            progress: Default::default(),
        },
        round_history: Vec::new(),
        played_song_ids,
        is_game_over: given.is_game_over,
        winner_id: given.winner_id.clone(),
        total_xp: given.total_xp,
        timeline_years: given.timeline_years.clone(),
        game_start_ms: given.game_start_time,
        seed: 0,
        rng_state: 0,
        artist_pool: Vec::new(),
        auto_draw_intent: given.auto_draw_intent,
    };
    Session::from_state(state, 0).map_err(|error| VectorError {
        id: vector.id.clone(),
        reason: error.to_string(),
    })
}

/// Builds the configuration of a vector.
fn build_config(given: &Given) -> Result<GameConfig, VectorError> {
    let partial = &given.config;
    let mut config = GameConfig::default();
    if !partial.selected_modes.is_empty() {
        let mut modes = Vec::new();
        for mode in &partial.selected_modes {
            let parsed = parse_mode(mode).ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the mode {mode} does not exist"),
            })?;
            modes.push(parsed);
        }
        config.selected_modes = modes;
    }
    if let Some(team_mode) = partial.team_mode.as_deref() {
        config.team_mode =
            phomu_core::facade::TeamMode::from_str(team_mode).ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the team mode {team_mode} does not exist"),
            })?;
    }
    if let Some(condition) = partial.ending_condition.as_deref() {
        config.ending_condition = phomu_core::facade::EndingCondition::from_str(condition)
            .ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the ending condition {condition} does not exist"),
            })?;
    }
    if let Some(points) = partial.target_points {
        config.target_points = points;
    }
    if let Some(rounds) = partial.target_rounds {
        config.target_rounds = rounds;
    }
    if let Some(minutes) = partial.target_time_minutes {
        config.target_time_minutes = minutes;
    }
    if let Some(enabled) = partial.time_decay_enabled {
        config.time_decay.enabled = enabled;
    }
    if let Some(seconds) = partial.time_decay_grace_seconds {
        config.time_decay.grace_seconds = seconds;
    }
    if let Some(seconds) = partial.time_decay_step_seconds {
        config.time_decay.step_seconds = seconds;
    }
    if let Some(points) = partial.time_decay_step_points {
        config.time_decay.step_points = points;
    }
    if let Some(points) = partial.min_points_per_correct {
        config.time_decay.min_points_per_correct = points;
    }
    if let Some(points) = partial.timeline_max_points {
        config.timeline_max_points = points;
    }
    if let Some(disabled) = partial.no_cheat_mode {
        config.no_cheat_mode = disabled;
    }
    Ok(config)
}

/// The failure of an input.
///
/// WHY: a failure of the core and a failure of the vector layer are two
/// different things. The failure of the core is a rule of the game — the
/// replay continues and the phase is recorded. The failure of the vector
/// layer means that the input cannot be executed at all — the replay ends.
struct Failure {
    /// The error of the vector level, if the failure is one.
    vector_error: Option<ObservedError>,
    /// The typed error of the core, if the input was refused by the rules.
    core_error: Option<ObservedError>,
}

impl Failure {
    /// A failure that carries no error — the input was not executed and no
    /// error situation was produced.
    const fn silent() -> Self {
        Failure {
            vector_error: None,
            core_error: None,
        }
    }
}

/// Executes one input of a vector.
fn execute(
    session: &mut Session,
    vector: &Vector,
    op: &Op,
    now_ms: &mut u64,
    observation: &mut Observation,
) -> Result<(), Failure> {
    match op {
        Op::StartGame => {
            session.start_game(*now_ms).map_err(core_failure)?;
        }
        Op::DrawSong { song_id, source } => {
            let Some(song) = vector.song(song_id) else {
                return Err(Failure {
                    vector_error: Some(ObservedError {
                        code: ERROR_UNKNOWN_SONG.to_string(),
                        message: format!("the vector has no song {song_id:?}"),
                    }),
                    core_error: None,
                });
            };
            let source = source
                .as_deref()
                .and_then(parse_source)
                .unwrap_or(SongSource::Random);
            session.draw_song(song, source).map_err(core_failure)?;
        }
        Op::AdvancePhase { phase } => {
            let Some(phase) = parse_phase(phase) else {
                return Err(Failure::silent());
            };
            session.advance_phase(phase).map_err(core_failure)?;
        }
        Op::SubmitAnswer {
            player_id,
            answer,
            is_correct,
            points_awarded,
            answered_in_seconds,
        } => {
            session
                .submit_answer_raw(
                    player_id,
                    answer,
                    *is_correct,
                    *points_awarded,
                    *answered_in_seconds,
                )
                .map_err(core_failure)?;
        }
        Op::AwardPoints { entity_id, points } => {
            session
                .award_points(entity_id, *points)
                .map_err(core_failure)?;
        }
        Op::NextRound => {
            session.next_round(*now_ms).map_err(core_failure)?;
        }
        Op::EndGame { winner_id } => {
            session.end_game(winner_id.clone()).map_err(core_failure)?;
        }
        Op::SkipBrokenSong => {
            session.skip_broken_song().map_err(core_failure)?;
        }
        Op::InitTimeline { years } => {
            session.init_timeline(years.clone()).map_err(core_failure)?;
        }
        Op::AddTimelineYear { year } => {
            session.add_timeline_year(*year).map_err(core_failure)?;
        }
        Op::RemoveTimelineYear { year } => {
            session.remove_timeline_year(*year).map_err(core_failure)?;
        }
        Op::AssignPlayerToTeam { player_id, team_id } => {
            session
                .assign_player_to_team(player_id, team_id.as_deref())
                .map_err(core_failure)?;
        }
        Op::RemoveTeam { team_id } => {
            session.remove_team(team_id).map_err(core_failure)?;
        }
        Op::ResetScores => {
            session.reset_scores();
        }
        Op::SetConfig { config } => {
            let config = build_config(&Given {
                config: config.clone(),
                ..Given::default()
            })
            .map_err(|_| Failure::silent())?;
            session.set_config(config);
        }
        Op::SetNow { ms } => {
            *now_ms = *ms;
        }
        Op::Answer {
            mode: _mode,
            answer,
            answered_in_seconds,
        } => {
            if session.state().round.song.is_none() {
                return Err(Failure {
                    vector_error: Some(ObservedError {
                        code: ERROR_NO_CURRENT_SONG.to_string(),
                        message: "the answer input needs a drawn song".to_string(),
                    }),
                    core_error: None,
                });
            }
            if let crate::vector::VectorAnswer::Timeline { slot } = answer {
                if slot.is_none() {
                    // Without a selection the mode does nothing — the
                    // reference implementation aborts the reveal
                    // (`src/components/game/modes/TimelineMode.tsx:175`).
                    return Ok(());
                }
            }
            let answer = Vector::mode_answer(answer).map_err(|_| Failure::silent())?;
            session
                .submit_answer(&answer, *answered_in_seconds)
                .map_err(core_failure)?;
        }
        Op::Cheat { cheat } => {
            let Some(cheat) = Vector::cheat(cheat) else {
                return Err(Failure::silent());
            };
            session.use_cheat(cheat).map_err(core_failure)?;
        }
        Op::CensorHint {
            hint,
            artist,
            title,
        } => {
            observation.censor_hint = Some(phomu_core::facade::censor_hint(hint, artist, title));
        }
        Op::FilterSongs { options } => {
            observation.filtered_song_ids = Some(filter_songs(vector, options));
        }
    }
    Ok(())
}

/// The songs that survive the filters of a probe.
///
/// WHY: the probe uses the filter of the catalogue and not a second
/// implementation, so that the probe and the draw cannot drift apart.
fn filter_songs(vector: &Vector, options: &crate::vector::FilterOptions) -> Vec<String> {
    let catalogue = vector.catalogue();
    let difficulty = options
        .difficulty
        .as_deref()
        .and_then(phomu_core::facade::Difficulty::from_str);
    let criteria = phomu_core::facade::SelectionCriteria {
        played_ids: Vec::new(),
        selected_packs: options.selected_packs.clone(),
        difficulty,
        only_qr_compatible: options.only_qr_compatible,
        mode_id: options.current_mode.clone(),
    };
    let (pool, _fallbacks) = phomu_core::facade::filter_pool(&catalogue, &criteria);
    pool.iter().map(|song| song.id.clone()).collect()
}

/// Reads the observation of a session.
fn observe(session: &Session, observation: &mut Observation) {
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

/// Compares the observation with the expectation of the vector.
fn compare(vector: &Vector, observation: &Observation) -> Vec<String> {
    let expected = &vector.then;
    let mut differences = Vec::new();

    if expected.phases != observation.phases {
        differences.push(format!(
            "the phases differ: expected {:?}, got {:?}",
            expected.phases, observation.phases
        ));
    }
    if expected.current_round != observation.current_round {
        differences.push(format!(
            "the round differs: expected {}, got {}",
            expected.current_round, observation.current_round
        ));
    }
    if expected.current_mode != observation.current_mode {
        differences.push(format!(
            "the mode differs: expected {}, got {}",
            expected.current_mode, observation.current_mode
        ));
    }
    if expected.current_song_id != observation.current_song_id {
        differences.push(format!(
            "the song differs: expected {:?}, got {:?}",
            expected.current_song_id, observation.current_song_id
        ));
    }
    if expected.current_song_source != observation.current_song_source {
        differences.push(format!(
            "the source of the song differs: expected {:?}, got {:?}",
            expected.current_song_source, observation.current_song_source
        ));
    }
    if expected.auto_draw_intent != observation.auto_draw_intent {
        differences.push(format!(
            "the auto-draw flag differs: expected {}, got {}",
            expected.auto_draw_intent, observation.auto_draw_intent
        ));
    }
    compare_map(
        "the player scores",
        &expected.player_scores,
        &observation.player_scores,
        &mut differences,
    );
    compare_map(
        "the team scores",
        &expected.team_scores,
        &observation.team_scores,
        &mut differences,
    );
    compare_map(
        "the player teams",
        &expected.player_teams,
        &observation.player_teams,
        &mut differences,
    );
    compare_map(
        "the team members",
        &expected.team_members,
        &observation.team_members,
        &mut differences,
    );
    if expected.turn_order != observation.turn_order {
        differences.push(format!(
            "the turn order differs: expected {:?}, got {:?}",
            expected.turn_order, observation.turn_order
        ));
    }
    if expected.current_turn_index != observation.current_turn_index {
        differences.push(format!(
            "the turn index differs: expected {}, got {}",
            expected.current_turn_index, observation.current_turn_index
        ));
    }
    if expected.winner_id != observation.winner_id {
        differences.push(format!(
            "the winner differs: expected {:?}, got {:?}",
            expected.winner_id, observation.winner_id
        ));
    }
    if expected.is_game_over != observation.is_game_over {
        differences.push(format!(
            "the game-over flag differs: expected {}, got {}",
            expected.is_game_over, observation.is_game_over
        ));
    }
    if expected.timeline_years != observation.timeline_years {
        differences.push(format!(
            "the timeline differs: expected {:?}, got {:?}",
            expected.timeline_years, observation.timeline_years
        ));
    }
    if expected.played_song_ids != observation.played_song_ids {
        differences.push(format!(
            "the played songs differ: expected {:?}, got {:?}",
            expected.played_song_ids, observation.played_song_ids
        ));
    }
    if expected.answers.len() != observation.answers.len() {
        differences.push(format!(
            "the number of answers differs: expected {}, got {}",
            expected.answers.len(),
            observation.answers.len()
        ));
    } else {
        for (expected_answer, answer) in expected.answers.iter().zip(observation.answers.iter()) {
            if expected_answer.player_id != answer.player_id
                || expected_answer.answer != answer.answer
                || expected_answer.is_correct != answer.is_correct
                || expected_answer.points_awarded != answer.points_awarded
                || expected_answer.answered_in_seconds != answer.answered_in_seconds
            {
                differences.push(format!(
                    "the answer of {} differs: expected {expected_answer:?}, got {answer:?}",
                    expected_answer.player_id
                ));
            }
        }
    }
    if expected.round_count != observation.round_count {
        differences.push(format!(
            "the number of logged rounds differs: expected {}, got {}",
            expected.round_count, observation.round_count
        ));
    }
    if expected.total_xp != observation.total_xp {
        differences.push(format!(
            "the experience points differ: expected {}, got {}",
            expected.total_xp, observation.total_xp
        ));
    }
    if expected.censor_hint != observation.censor_hint {
        differences.push(format!(
            "the censored hint differs: expected {:?}, got {:?}",
            expected.censor_hint, observation.censor_hint
        ));
    }
    if expected.filtered_song_ids != observation.filtered_song_ids {
        differences.push(format!(
            "the filtered songs differ: expected {:?}, got {:?}",
            expected.filtered_song_ids, observation.filtered_song_ids
        ));
    }
    let expected_error = expected.error.as_ref().map(|error| ObservedError {
        code: error.code.clone(),
        message: error.message.clone(),
    });
    if expected_error != observation.error {
        differences.push(format!(
            "the error differs: expected {expected_error:?}, got {:?}",
            observation.error
        ));
    }
    differences
}

/// Compares two maps field by field.
fn compare_map<T: PartialEq + std::fmt::Debug>(
    what: &str,
    expected: &BTreeMap<String, T>,
    actual: &BTreeMap<String, T>,
    differences: &mut Vec<String>,
) {
    for (key, value) in expected {
        match actual.get(key) {
            Some(other) if other == value => {}
            Some(other) => differences.push(format!(
                "{what} of {key} differ: expected {value:?}, got {other:?}"
            )),
            None => differences.push(format!("{what} of {key} are missing")),
        }
    }
}

/// Turns a typed error of the core into the error situation of the
/// observation.
///
/// WHY: the refusal of the core is a part of its contract — the errors are
/// typed and exhaustive (CORE-111) and the promise of the same named error
/// situations on every platform
/// ([`../../docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md)
/// § 1.4) is only checkable when the observation carries the refusal. The
/// identifiers that are used are the two that the core already owns: the
/// numeric code and the i18n message key.
///
/// EXAMPLE: the refusal of an unknown player becomes the error
/// `{ code: "1004", message: "errors.unknownPlayer" }`.
fn core_failure(error: PhomuError) -> Failure {
    Failure {
        vector_error: None,
        core_error: Some(ObservedError {
            code: error.code().code().to_string(),
            message: error.message_key().to_string(),
        }),
    }
}

/// Reads a phase.
fn parse_phase(name: &str) -> Option<RoundPhase> {
    match name {
        "drawing" => Some(RoundPhase::Drawing),
        "question" => Some(RoundPhase::Question),
        "locked-in" => Some(RoundPhase::LockedIn),
        "reveal" => Some(RoundPhase::Reveal),
        "scoring" => Some(RoundPhase::Scoring),
        _ => None,
    }
}

/// Reads a mode.
fn parse_mode(name: &str) -> Option<phomu_core::facade::GameMode> {
    phomu_core::facade::GameMode::from_str(name)
}

/// Reads the source of a song.
fn parse_source(name: &str) -> Option<SongSource> {
    match name {
        "random" => Some(SongSource::Random),
        "qr" => Some(SongSource::Qr),
        _ => None,
    }
}
