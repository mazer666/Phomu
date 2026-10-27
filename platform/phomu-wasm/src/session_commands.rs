//! The commands of the running round, as the WebAssembly bridge forwards them.
//!
//! WHAT: the cheats of the round, the timeline of the round, the disclosure
//! of the identity of the song and the three commands that close a round.
//!
//! WHY the base decides: the cheats need the song — the decade hint needs
//! the year, the option halving needs the correct mood, the joker needs the
//! slots of the timeline. Only the base has them.
//!
//! WHY the identity leaves the base on an explicit command: the question
//! view model has no field for the solution
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
//!
//! WHY the timeout is a command of the bridge: a round that nobody answered
//! has to be closable. Without the timeout the phase `question` is a dead
//! end — the reveal refuses it, the round cannot be closed and no shell can
//! move the phase (docs/qa/QA-11-RUST-BASE.md, QA-RST-002).

use phomu_core::facade::Cheat;
use serde_json::Value;
use std::collections::HashMap;

use crate::round::round_payload;
use crate::{BridgeError, unknown_session};

/// Uses a cheat of the round and returns what the shell has to draw.
///
/// WHY the base decides: the cheats need the song — the decade hint needs
/// the year, the option halving needs the correct mood, the joker needs the
/// slots of the timeline. Only the base has them.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// cheat is not one the round allows.
pub fn use_cheat(handle: u64, cheat: &str) -> Result<Value, BridgeError> {
    let choice = match cheat {
        "timeline-decade-hint" => Cheat::TimelineDecadeHint,
        "timeline-joker" => Cheat::TimelineJoker,
        "hint-master-music" => Cheat::HintMasterMusic,
        "survivor-artist" => Cheat::SurvivorArtist,
        "vibe-check-options" => Cheat::VibeCheckOptions,
        other => {
            return Err(BridgeError {
                code: 1001,
                message_key: "errors.invalidConfiguration".to_string(),
                context: HashMap::from([("cheat".to_string(), other.to_string())]),
            });
        }
    };
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let penalty = entry
            .session
            .use_cheat(choice)
            .map_err(|failure| BridgeError::from(&failure))?;
        let decade_hint = entry.session.decade_hint();
        let joker_slot = entry.session.state().round.progress.joker_slot;
        let options = if choice == Cheat::VibeCheckOptions {
            entry.session.vibe_options_with_cheat()
        } else {
            Vec::new()
        };
        let identity = entry.session.disclose_identity();
        Ok(serde_json::json!({
            "penalty": penalty,
            "decadeHint": decade_hint,
            "jokerSlot": joker_slot,
            "options": options,
            "identity": identity.map(|identity| serde_json::json!({
                "title": identity.title,
                "artist": identity.artist,
                "year": identity.year,
            })),
        }))
    })
}

/// Starts the timeline with the given years.
///
/// WHY the shell picks the years: the years come from the catalogue, and the
/// catalogue lives in the base. The shell asks for the scale and hands the
/// three years over; the base owns the rule of the timeline.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// years are not three distinct numbers.
pub fn init_timeline(handle: u64, years: &[i32]) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .init_timeline(years.to_vec())
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(serde_json::json!({ "timelineYears": entry.session.state().timeline_years.clone() }))
    })
}

/// Removes a year from the timeline.
///
/// WHY the base decides: the timeline of the round is the timeline of the
/// base. The shell only shows it.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// timeline does not carry the year.
pub fn remove_timeline_year(handle: u64, year: i32) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .remove_timeline_year(year)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(serde_json::json!({ "timelineYears": entry.session.state().timeline_years.clone() }))
    })
}

/// The identity of the song of the round.
///
/// WHY the identity leaves the base on an explicit command: the
/// Hint-Master lets the pilot show the solution before the table answers,
/// and the Survivor lets a player buy the name of the artist. The question
/// view model never carries it (docs/design/PLATFORM-ARCHITECTURE.md § 10.2,
/// rule C-1).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn disclose_identity(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(entry) = registry.sessions.get(&handle) else {
            return Err(unknown_session(handle));
        };
        let identity = entry.session.disclose_identity();
        Ok(serde_json::json!({
            "identity": identity.map(|identity| serde_json::json!({
                "title": identity.title,
                "artist": identity.artist,
                "year": identity.year,
            })),
        }))
    })
}

/// Ends the question round without an answer — the timeout.
///
/// WHY the command exists: a round that nobody answered — because the round
/// timed out, because a player left the table or because a card was
/// mis-scanned — has to be closable. The base locks the round in and
/// reveals it; the round is not scored as wrong
/// (docs/qa/QA-11-RUST-BASE.md, QA-RST-002).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round is not in a phase that a timeout can end, or when the game has
/// already ended.
pub fn timeout(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .force_reveal()
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_payload(&view, &entry.session))
    })
}

/// Locks the answers of the round in.
///
/// WHY the command exists: the round is locked in when the last expected
/// answer arrives. A shell that knows that every device has answered may
/// close the round early — the base still refuses the lock when fewer
/// answers are in than the round expects (GAME-002).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round does not accept answers, or when fewer answers are in than the
/// round expects.
pub fn lock_answers(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .lock_answers()
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(crate::json::session_snapshot(&entry.session.snapshot()))
    })
}

/// Skips the song of the round.
///
/// WHY the command exists: a blocked video must not stop the party. With a
/// drawn song a new song is drawn immediately, with a scanned card the pilot
/// scans again (GAME-013).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// round is not in a phase that can be skipped.
pub fn skip_broken_song(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let view = entry
            .session
            .skip_broken_song()
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(round_payload(&view, &entry.session))
    })
}
