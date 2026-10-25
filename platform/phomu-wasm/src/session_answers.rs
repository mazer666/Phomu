//! The answers of a round, as the WebAssembly bridge forwards them.
//!
//! WHAT: the submission of the answer of a player and of the choice of a
//! player, and the score and the feedback the base answers with.
//!
//! WHY the choice travels instead of the answer: the Lyrics Labyrinth asks
//! for the line the player picked. Only the bridge may know which line was
//! the invented one — the shell must not
//! (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).

use phomu_core::facade::ModeAnswer;
use serde_json::Value;

use crate::json::score_snapshot;
use crate::{BridgeError, unknown_session};

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

/// Submit the choice of a player and evaluate it in the base.
///
/// WHY the choice travels instead of the answer: the Lyrics Labyrinth asks
/// for the line the player picked. Only the bridge may know which line was
/// the invented one — the shell must not (docs/qa/QA-09-REMEDIATION-BACKLOG.md
/// § 1.2).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown, when the
/// choice does not fit the round or when the round does not accept answers.
pub fn submit_choice(
    handle: u64,
    choice: &Value,
    answered_in_seconds: Option<u32>,
) -> Result<Value, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let Some(entry) = registry.sessions.get_mut(&handle) else {
            return Err(unknown_session(handle));
        };
        let invented = entry
            .session
            .state()
            .round
            .song
            .as_ref()
            .and_then(|song| song.lyrics.as_ref())
            .and_then(|lyrics| lyrics.fake.first())
            .cloned();
        let answer = crate::answer::mode_answer(choice, invented.as_deref())?;
        let snapshot = entry
            .session
            .submit_answer(&answer, answered_in_seconds)
            .map_err(|failure| BridgeError::from(&failure))?;
        let mode = entry.session.state().round.mode;
        let feedback = crate::round::feedback_payload(&entry.session, mode);
        Ok(serde_json::json!({
            "score": score_snapshot(&snapshot),
            "feedback": feedback,
        }))
    })
}
