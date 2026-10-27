//! The commands of the lobby and of the power user, as the WebAssembly
//! bridge forwards them.
//!
//! WHAT: the administration of the teams, the reset of the scores, the
//! change of the configuration, the crediting of points and the correction
//! of an answer.
//!
//! WHY the rules stay in the base: the lobby and the power-user menu of the
//! shell change the state of the session; the *rules* of that change — which
//! team a player belongs to, whether a score may become negative, which
//! answers a round accepts — belong to the base
//! (docs/design/BUILD-CONTRACT.md § 2.4).
//!
//! EXAMPLE: the power user credits five points to a player and the base
//! keeps the score of the team in step with the score of the player.

use phomu_core::facade::RoundPhase;
use serde_json::Value;

use crate::json::session_snapshot;
use crate::{BridgeError, unknown_session};

/// Credits points to a player or to a team.
///
/// WHY the base decides: a score never becomes negative (GAME-006) and the
/// score of the team follows the score of its player.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session knows neither a player nor a team with that identifier.
pub fn award_points(handle: u64, entity_id: &str, points: i64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .award_points(entity_id, points)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Records an answer without the evaluation of a mode.
///
/// WHY the command exists: the power user can correct an answer after the
/// fact. The recording of the answer and the evaluation of a mode are two
/// different things, and the correction does not evaluate a mode.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// round does not accept answers, or when its answers are already locked
/// in.
pub fn submit_answer_raw(
    handle: u64,
    player_id: &str,
    answer: &str,
    is_correct: bool,
    points_awarded: i64,
    answered_in_seconds: Option<u32>,
) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .submit_answer_raw(
                player_id,
                answer,
                is_correct,
                points_awarded,
                answered_in_seconds,
            )
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Assigns a player to a team.
///
/// WHY the base decides: the membership of the team and the team of the
/// player have to stay in step, otherwise the points flow to the wrong team.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session does not know the player.
pub fn assign_player_to_team(
    handle: u64,
    player_id: &str,
    team_id: Option<&str>,
) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .assign_player_to_team(player_id, team_id)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Removes a team and clears the memberships.
///
/// WHY the base decides: a player without a team plays for himself.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// session does not know the team.
pub fn remove_team(handle: u64, team_id: &str) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .remove_team(team_id)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Resets the scores of the session.
///
/// WHY the base decides: the reset clears the scores, the round history, the
/// played songs and the timeline, but keeps the experience points and the
/// configuration.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn reset_scores(handle: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry.session.reset_scores();
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Replaces the configuration of the session.
///
/// WHY the base decides: the configuration is read-only during a game and
/// is changed in the lobby (docs/design/BUILD-CONTRACT.md § 5.1, rule K-4).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown or when the
/// configuration is not one the base knows.
pub fn set_config(handle: u64, config: &Value) -> Result<Value, BridgeError> {
    let core_config = crate::config::to_core_config(config)?;
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry.session.set_config(core_config);
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Moves the round into another phase.
///
/// WHY the base decides: the transition table of the automaton decides which
/// phases may follow each other, and the reveal lock refuses the transition
/// until the answers of the round are locked in (GAME-002). A shell that
/// sets the phase by hand therefore cannot release the solution of a round
/// whose answers are not locked in.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// automaton does not allow the transition, and when the answers of the
/// round are not locked in.
pub fn advance_phase(handle: u64, phase: &str) -> Result<Value, BridgeError> {
    let Some(phase) = RoundPhase::from_str(phase) else {
        return Err(BridgeError {
            code: 1001,
            message_key: "errors.invalidConfiguration".to_string(),
            context: std::collections::HashMap::from([("phase".to_string(), phase.to_string())]),
        });
    };
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .advance_phase(phase)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Adds a year to the timeline.
///
/// WHY the base decides: the years are added in the ascending order, so that
/// the slot of the Timeline mode stays comparable with the year of the song.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn add_timeline_year(handle: u64, year: i32) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry
            .session
            .add_timeline_year(year)
            .map_err(|failure| BridgeError::from(&failure))?;
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}

/// Restores the state of the generator of the session.
///
/// WHY the base decides: a reloaded session has to continue with the same
/// sequence, otherwise the same seed would produce a different game after a
/// crash (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn restore_rng_state(handle: u64, state: u64) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        entry.session.restore_rng_state(state);
        Ok(session_snapshot(&entry.session.snapshot()))
    })
}
