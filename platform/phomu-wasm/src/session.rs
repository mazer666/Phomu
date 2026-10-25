//! The session functions of the WebAssembly bridge.
//!
//! WHAT: the commands a shell sends to the base and the answers it gets.
//!
//! WHY the values cross as JSON: the browser holds the values of the module,
//! and the format is the same as the one of the C-ABI bridge, so that the
//! two profiles of the wire model agree (BRIDGE-110).

use phomu_core::facade::{ModeAnswer, Session, SongSource, select_song};
use serde_json::Value;
use std::collections::HashMap;

use crate::json::{round_view, score_snapshot, session_snapshot};
use crate::{BridgeError, SessionEntry, take_id};

/// The failure of a session the registry does not know.
fn unknown_session(handle: u64) -> BridgeError {
    BridgeError {
        code: 1001,
        message_key: "errors.invalidConfiguration".to_string(),
        context: HashMap::from([("session".to_string(), handle.to_string())]),
    }
}

/// The failure of a catalogue the registry does not know.
fn unknown_catalogue(handle: u64) -> BridgeError {
    BridgeError {
        code: 1001,
        message_key: "errors.invalidConfiguration".to_string(),
        context: HashMap::from([("catalogue".to_string(), handle.to_string())]),
    }
}

/// Create a session and return its handle.
///
/// # Errors
/// Returns the failure of the base when the configuration is not one the
/// base knows.
pub fn new_session(
    config: &Value,
    players: &[Value],
    teams: &[Value],
    catalogue: Option<u64>,
    seed: u64,
    now_ms: u64,
) -> Result<u64, BridgeError> {
    let core_config = crate::config::to_core_config(config)?;
    let core_players = players
        .iter()
        .map(|player| phomu_core::facade::Player {
            id: player
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            name: player
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            score: 0,
            team_id: player
                .get("teamId")
                .and_then(Value::as_str)
                .map(str::to_string),
            is_eliminated: false,
            is_spectator: player
                .get("isSpectator")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            is_pilot: player
                .get("isPilot")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            color: None,
            avatar: None,
        })
        .collect();
    let core_teams = teams
        .iter()
        .map(|team| phomu_core::facade::Team {
            id: team
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            name: team
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            player_ids: Vec::new(),
            score: 0,
            color: None,
        })
        .collect();

    let session = Session::new(
        core_config,
        core_players,
        core_teams,
        Vec::new(),
        seed,
        now_ms,
    )
    .map_err(|failure| BridgeError::from(&failure))?;

    Ok(crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let id = take_id(&mut registry);
        registry.sessions.insert(
            id,
            SessionEntry {
                session,
                catalogue_id: catalogue,
            },
        );
        id
    }))
}

/// Start the game.
///
/// # Errors
/// Returns the failure of the base when the game cannot start.
pub fn start_game(handle: u64, now_ms: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .start_game(now_ms)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_view(&view))
    })
}

/// Draw a song and open the question phase.
///
/// # Errors
/// Returns the failure of the base when the round cannot draw a song.
pub fn draw_song(handle: u64, source: &str) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let (catalogue_id, criteria, draw) = {
            let Some(entry) = registry.sessions.get(&handle) else {
                return Err(unknown_session(handle));
            };
            let state = entry.session.state();
            let criteria = phomu_core::facade::SelectionCriteria {
                played_ids: state.played_song_ids.clone(),
                selected_packs: state.config.selected_packs.clone(),
                difficulty: None,
                only_qr_compatible: state.config.only_qr_compatible,
                mode_id: Some(state.round.mode.as_str().to_string()),
            };
            (entry.catalogue_id, criteria, entry.session.rng_state())
        };
        let Some(catalogue_id) = catalogue_id else {
            return Err(BridgeError {
                code: 1201,
                message_key: "errors.catalogueEmpty".to_string(),
                context: HashMap::new(),
            });
        };
        let Some(songs) = registry.catalogues.get(&catalogue_id) else {
            return Err(unknown_catalogue(catalogue_id));
        };
        let Some(selection) = select_song(songs, &criteria, draw) else {
            return Err(BridgeError {
                code: 1201,
                message_key: "errors.catalogueEmpty".to_string(),
                context: HashMap::new(),
            });
        };
        let song = selection.song;
        let core_source = match source {
            "qr" => SongSource::Qr,
            _ => SongSource::Random,
        };
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .draw_song(song, core_source)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_view(&view))
    })
}

/// Submit the answer of the active player.
///
/// # Errors
/// Returns the failure of the base when the answer does not fit the round.
pub fn submit_answer(
    handle: u64,
    answer: &ModeAnswer,
    answered_in_seconds: Option<u32>,
) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let snapshot = entry
            .session
            .submit_answer(answer, answered_in_seconds)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(score_snapshot(&snapshot))
    })
}

/// Release the solution of the round.
///
/// # Errors
/// Returns the failure of the base when the answers are not locked in.
pub fn reveal(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .reveal()
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_view(&view))
    })
}

/// Close the round and prepare the next one.
///
/// # Errors
/// Returns the failure of the base when the round cannot be closed.
pub fn next_round(handle: u64, now_ms: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .next_round(now_ms)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_view(&view))
    })
}

/// End the game.
///
/// # Errors
/// Returns the failure of the base when the game cannot end.
pub fn end_game(handle: u64, winner_id: Option<String>) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .end_game(winner_id)
            .map_err(|failure| BridgeError::from(&failure))?;
        let snapshot = entry.session.snapshot();
        Ok(session_snapshot(&snapshot))
    })
}

/// The state of a session.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn snapshot(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(entry) = registry.sessions.get(&handle) else {
            return Err(unknown_session(handle));
        };
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// The packs of a catalogue.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn packs(handle: u64) -> Result<Vec<Value>, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(unknown_catalogue(handle));
        };
        Ok(crate::catalogue::packs_of(catalogue)
            .into_iter()
            .map(|pack| {
                serde_json::json!({
                    "id": pack.id,
                    "name": pack.name,
                    "taglineKey": pack.tagline_key,
                })
            })
            .collect())
    })
}
