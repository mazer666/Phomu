//! The exported surface of the WebAssembly bridge.
//!
//! WHAT: the functions a shell calls, as the `wasm-bindgen` exports of the
//! module.
//!
//! WHY the exports live in their own module: the crate root holds the
//! registry and the failure of the bridge, this module holds the surface
//! itself. The split keeps both files below the size limit of the
// repository and makes the surface readable on its own
//! (docs/design/BUILD-CONTRACT.md § 2.1).
//!
//! WHY every value crosses as JSON: the browser holds the values of the
//! module, and the format is the same as the one of the C-ABI bridge, so
//! that the two profiles of the wire model agree (BRIDGE-110).
//!
//! EXAMPLE:
//!
//! ```text
//! wasm-pack build platform/phomu-wasm --target web
//! ```

use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use crate::json::media_plan;
use crate::session;
use crate::session_answers;
use crate::session_commands;
use crate::{
    REGISTRY, BridgeError, broken_document, document_of, list_of, unknown_session,
};

/// The version of the exported surface.
#[wasm_bindgen]
pub fn phomu_abi_version() -> String {
    phomu_core::facade::abi_version()
}

/// Every major version of the surface the base still serves.
#[wasm_bindgen]
pub fn phomu_abi_versions() -> Vec<String> {
    phomu_core::facade::abi_versions()
}

/// The state of a session.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn phomu_session_snapshot(handle: u64) -> Result<serde_json::Value, BridgeError> {
    session::snapshot(handle)
}

/// The JSON of the plan of the media of the running round.
///
/// # Errors
/// Returns the failure of the base when no song is drawn.
pub fn phomu_media_plan(handle: u64) -> Result<serde_json::Value, BridgeError> {
    REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(entry) = registry.sessions.get(&handle) else {
            return Err(unknown_session(handle));
        };
        let state = entry.session.state();
        let Some(song) = state.round.song.as_ref() else {
            return Err(BridgeError {
                code: 1103,
                message_key: "errors.noSongDrawn".to_string(),
                context: HashMap::new(),
            });
        };
        let sources = phomu_core::facade::MediaSources {
            youtube: Some(song.links.youtube.clone()).filter(|link| !link.is_empty()),
            youtube_alternatives: song.links.youtube_alternatives.clone(),
            spotify_embed: song.links.spotify.clone(),
            spotify_preview: song.links.spotify_free_preview.clone(),
            amazon_embed: song.links.amazon_music.clone(),
            amazon_preview: song.links.amazon_prime_preview.clone(),
            apple_music: song.links.apple_music.clone(),
        };
        let plan = phomu_core::facade::MediaPlan::build(
            state.config.preferred_music_provider,
            &sources,
            phomu_core::facade::PlaybackWindow::default(),
        );
        Ok(media_plan(&plan))
    })
}

/// The i18n key of a game event.
#[wasm_bindgen]
pub fn phomu_message_key(event: &str) -> String {
    phomu_core::facade::GameEvent::ALL
        .iter()
        .find(|candidate| format!("{candidate:?}") == event)
        .map(|candidate| {
            phomu_core::facade::message_key(*candidate)
                .as_str()
                .to_string()
        })
        .unwrap_or_default()
}

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
    let answer = session_answers::submit_choice(handle, &document_of(choice)?, answered_in_seconds)?;
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
