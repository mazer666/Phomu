//! The commands of the running round, as the WebAssembly bridge forwards them.
//!
//! WHAT: the cheats of the round, the timeline of the round and the
//! disclosure of the identity of the song.
//!
//! WHY the base decides: the cheats need the song — the decade hint needs
//! the year, the option halving needs the correct mood, the joker needs the
//! slots of the timeline. Only the base has them.
//!
//! WHY the identity leaves the base on an explicit command: the question
//! view model has no field for the solution
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).

use phomu_core::facade::Cheat;
use serde_json::Value;
use std::collections::HashMap;

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
            })
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
/// WHY the shell picks the years: the years come from the catalogue, and
/// the catalogue lives in the base. The shell asks for the scale and hands
/// the three years over; the base owns the rule of the timeline.
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
