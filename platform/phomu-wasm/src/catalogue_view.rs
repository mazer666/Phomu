//! The catalogue as the shell sees it.
//!
//! WHAT: the entries of the catalogue browser, the records of the
//! administrative surfaces, the packs of the lobby and the year scale of the
//! Timeline mode.
//!
//! WHY the base holds the catalogue: the catalogue is the answer key of the
//! game. Only the base reads it; the shell asks for the view it needs and
//! receives exactly that view (docs/qa/QA-02-SPOILER-FREENESS.md,
//! QA-SPO-001).
//!
//! WHY the records are a separate view: the administrative surfaces edit
//! the hints and the lyric lines of the songs. They are the only surfaces
//! that may see the answers — and they ask for them explicitly, never as
//! part of a question.

use serde_json::Value;

use crate::catalogue;
use crate::{BridgeError, unknown_catalogue};

/// The entries of a catalogue, as the catalogue browser needs them.
///
/// WHY without the hints and the lyrics: the browser shows what a visitor
/// may see. The hints and the lyric lines are the question and the answer of
/// the game and stay in the base (docs/qa/QA-02-SPOILER-FREENESS.md,
/// QA-SPO-001).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn browse(handle: u64) -> Result<Vec<Value>, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(unknown_catalogue(handle));
        };
        Ok(catalogue.iter().map(catalogue::browse_of).collect())
    })
}

/// The records of a catalogue, as the administrative surfaces need them.
///
/// WHY the whole record: the administrative surfaces edit a song — they
/// need every field, including the ones a round does not use. The records
/// leave the base only on this explicit command
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn records(handle: u64) -> Result<Vec<Value>, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(unknown_catalogue(handle));
        };
        Ok(catalogue.iter().map(catalogue::song_to_json).collect())
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

/// The years of a catalogue, as the Timeline mode needs them.
///
/// WHY the scale is not a solution: the scale is the same for every round of
/// a catalogue. It therefore carries no information about the round that is
/// running.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn year_scale(handle: u64) -> Result<Vec<i32>, BridgeError> {
    crate::REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(unknown_catalogue(handle));
        };
        Ok(crate::catalogue::year_scale(catalogue))
    })
}
