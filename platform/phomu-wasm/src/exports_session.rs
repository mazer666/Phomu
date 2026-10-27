//! The session exports of the WebAssembly bridge.
//!
//! WHAT: the commands of the game loop as the shell sends them — the start,
//! the draw, the answers, the lock, the reveal, the timeout, the points, the
//! next round and the end of the game.
//!
//! WHY the whole loop is exported: a shell that loads the module has to be
//! able to play a game with it. A module that offers the version and the
//! catalogue but not the game is a module no shell can play
//! (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
//!
//! WHY the timeout is one of the exports: a round that nobody answered has
//! to be closable. The reveal lock refuses the reveal of a round whose
//! answers are not locked in, and the timeout is the one command that ends
//! such a round (docs/qa/QA-11-RUST-BASE.md, QA-RST-002).
//!
//! WHY the values cross as JSON: the browser holds the values of the module,
//! and the format is the same as the one of the C-ABI bridge, so that the
//! two profiles of the wire model agree (BRIDGE-110).

use wasm_bindgen::prelude::*;

use crate::session;
use crate::session_admin;
use crate::session_answers;
use crate::session_commands;
use crate::{BridgeError, broken_document, document_of, list_of};

/// Create a session and return its handle.
///
/// WHY the values travel as JSON: the wire format of the bridge is JSON
/// (BRIDGE-110), and the browser has no other way to hold a value of the
/// base.
///
/// # Errors
/// Returns the failure of the base when the configuration is not one the
/// base knows.
#[wasm_bindgen]
pub fn phomu_session_new(
    config: &str,
    players: &str,
    teams: &str,
    catalogue: u64,
    seed: f64,
    now_ms: f64,
) -> Result<u64, BridgeError> {
    let core_config = document_of(config)?;
    let core_players = list_of(players, "players")?;
    let core_teams = list_of(teams, "teams")?;
    session::new_session(
        &core_config,
        &core_players,
        &core_teams,
        Some(catalogue),
        seed as u64,
        now_ms as u64,
    )
}

/// Start the game.
///
/// # Errors
/// Returns the failure of the base when the game cannot start.
#[wasm_bindgen]
pub fn phomu_session_start(handle: u64, now_ms: f64) -> Result<String, BridgeError> {
    let view = session::start_game(handle, now_ms as u64)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// Draw a song and open the question phase.
///
/// WHY the payload carries no title and no artist: the question view model
/// of the base has no field for the solution
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// # Errors
/// Returns the failure of the base when the round cannot draw a song.
#[wasm_bindgen]
pub fn phomu_session_draw(handle: u64, source: &str) -> Result<String, BridgeError> {
    let view = session::draw_song(handle, source)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// Draw a song by its identifier and open the question phase.
///
/// # Errors
/// Returns the failure of the base when the catalogue does not know the
/// song.
#[wasm_bindgen]
pub fn phomu_session_draw_by_id(handle: u64, song_id: &str) -> Result<String, BridgeError> {
    let view = session::draw_song_by_id(handle, song_id)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// Submit the choice of a player and evaluate it in the base.
///
/// WHY the choice travels instead of the answer: the Lyrics Labyrinth asks
/// for the line the player picked; only the bridge may know which line was
/// the invented one (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
///
/// # Errors
/// Returns the failure of the base when the round does not accept the
/// answer.
#[wasm_bindgen]
pub fn phomu_session_submit(
    handle: u64,
    choice: &str,
    answered_in_seconds: Option<u32>,
) -> Result<String, BridgeError> {
    let answer =
        session_answers::submit_choice(handle, &document_of(choice)?, answered_in_seconds)?;
    serde_json::to_string(&answer).map_err(|reason| broken_document(reason.to_string()))
}

/// Uses a cheat of the round and returns what the shell has to draw.
///
/// WHY the base decides: the cheats need the song — the decade hint needs
/// the year, the option halving needs the correct mood, the joker needs the
/// slots of the timeline.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// cheat is not one the round allows.
#[wasm_bindgen]
pub fn phomu_session_cheat(handle: u64, cheat: &str) -> Result<String, BridgeError> {
    let outcome = session_commands::use_cheat(handle, cheat)?;
    serde_json::to_string(&outcome).map_err(|reason| broken_document(reason.to_string()))
}

/// Starts the timeline of the round with the given years.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// years are not three distinct numbers.
#[wasm_bindgen]
pub fn phomu_session_init_timeline(handle: u64, years: &[i32]) -> Result<String, BridgeError> {
    let years = session_commands::init_timeline(handle, years)?;
    serde_json::to_string(&years).map_err(|reason| broken_document(reason.to_string()))
}

/// Removes a year from the timeline of the round.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// timeline does not carry the year.
#[wasm_bindgen]
pub fn phomu_session_remove_timeline_year(handle: u64, year: i32) -> Result<String, BridgeError> {
    let years = session_commands::remove_timeline_year(handle, year)?;
    serde_json::to_string(&years).map_err(|reason| broken_document(reason.to_string()))
}

/// Adds a year to the timeline of the round.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_session_add_timeline_year(handle: u64, year: i32) -> Result<String, BridgeError> {
    let years = session_admin::add_timeline_year(handle, year)?;
    serde_json::to_string(&years).map_err(|reason| broken_document(reason.to_string()))
}

/// The identity of the song of the round.
///
/// WHY the identity leaves the base on an explicit command: the question
/// view model has no field for the solution. The modes that need the
/// identity during the round ask the base for it
/// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_session_disclose(handle: u64) -> Result<String, BridgeError> {
    let identity = session_commands::disclose_identity(handle)?;
    serde_json::to_string(&identity).map_err(|reason| broken_document(reason.to_string()))
}

/// Release the solution of the round.
///
/// # Errors
/// Returns the failure of the base when the answers are not locked in.
#[wasm_bindgen]
pub fn phomu_session_reveal(handle: u64) -> Result<String, BridgeError> {
    let view = session::reveal(handle)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// End the question round without an answer — the timeout.
///
/// WHY the command exists: a round that nobody answered — because the round
/// timed out, because a player left the table or because a card was
/// mis-scanned — has to be closable. Without this command every command of
/// the bridge refuses and the game stops
/// (docs/qa/QA-11-RUST-BASE.md, QA-RST-002).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round is not in a phase that a timeout can end, or when the game has
/// already ended.
#[wasm_bindgen]
pub fn phomu_session_timeout(handle: u64) -> Result<String, BridgeError> {
    let view = session_commands::timeout(handle)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// Lock the answers of the round in.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round does not accept answers, or when fewer answers are in than the
/// round expects.
#[wasm_bindgen]
pub fn phomu_session_lock_answers(handle: u64) -> Result<String, BridgeError> {
    let snapshot = session_commands::lock_answers(handle)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Skip the song of the round.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// round is not in a phase that can be skipped.
#[wasm_bindgen]
pub fn phomu_session_skip_broken_song(handle: u64) -> Result<String, BridgeError> {
    let view = session_commands::skip_broken_song(handle)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// Credit points to a player or to a team.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session knows neither a player nor a team with that identifier.
#[wasm_bindgen]
pub fn phomu_session_award_points(
    handle: u64,
    entity_id: &str,
    points: f64,
) -> Result<String, BridgeError> {
    let snapshot = session_admin::award_points(handle, entity_id, points as i64)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Record an answer without the evaluation of a mode.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round does not accept answers, or when its answers are already locked
/// in.
#[wasm_bindgen]
pub fn phomu_session_answer_raw(
    handle: u64,
    player_id: &str,
    answer: &str,
    is_correct: bool,
    points_awarded: f64,
    answered_in_seconds: Option<u32>,
) -> Result<String, BridgeError> {
    let snapshot = session_admin::submit_answer_raw(
        handle,
        player_id,
        answer,
        is_correct,
        points_awarded as i64,
        answered_in_seconds,
    )?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Assign a player to a team.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session does not know the player.
#[wasm_bindgen]
pub fn phomu_session_assign_player_to_team(
    handle: u64,
    player_id: &str,
    team_id: Option<String>,
) -> Result<String, BridgeError> {
    let snapshot = session_admin::assign_player_to_team(handle, player_id, team_id.as_deref())?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Remove a team and clear the memberships.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session does not know the team.
#[wasm_bindgen]
pub fn phomu_session_remove_team(handle: u64, team_id: &str) -> Result<String, BridgeError> {
    let snapshot = session_admin::remove_team(handle, team_id)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Reset the scores of the session.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_session_reset_scores(handle: u64) -> Result<String, BridgeError> {
    let snapshot = session_admin::reset_scores(handle)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Replace the configuration of the session.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// configuration is not one the base knows.
#[wasm_bindgen]
pub fn phomu_session_set_config(handle: u64, config: &str) -> Result<String, BridgeError> {
    let snapshot = session_admin::set_config(handle, &document_of(config)?)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Move the round into another phase.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// automaton does not allow the transition, and when the answers of the
/// round are not locked in.
#[wasm_bindgen]
pub fn phomu_session_advance_phase(handle: u64, phase: &str) -> Result<String, BridgeError> {
    let snapshot = session_admin::advance_phase(handle, phase)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Restore the state of the generator of the session.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_session_restore_rng_state(handle: u64, state: f64) -> Result<String, BridgeError> {
    let snapshot = session_admin::restore_rng_state(handle, state as u64)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// Close the round and prepare the next one.
///
/// # Errors
/// Returns the failure of the base when the round cannot be closed.
#[wasm_bindgen]
pub fn phomu_session_next_round(handle: u64, now_ms: f64) -> Result<String, BridgeError> {
    let view = session::next_round(handle, now_ms as u64)?;
    serde_json::to_string(&view).map_err(|reason| broken_document(reason.to_string()))
}

/// End the game.
///
/// # Errors
/// Returns the failure of the base when the game cannot end.
#[wasm_bindgen]
pub fn phomu_session_end(handle: u64, winner_id: Option<String>) -> Result<String, BridgeError> {
    let snapshot = session::end_game(handle, winner_id)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}
