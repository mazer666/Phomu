//! The catalogue exports of the WebAssembly bridge.
//!
//! WHAT: the functions with which a shell opens the catalogue of the base
//! and reads the views it needs from it.
//!
//! WHY the catalogue has its own module of exports: the catalogue is the
//! answer key of the game. Everything that leaves the base through this
//! module is a deliberate, named request — never a side effect of a round
//! (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).

use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use crate::catalogue;
use crate::catalogue_view;
use crate::{BridgeError, REGISTRY, take_id, unknown_catalogue};

/// Open a catalogue and return its handle.
///
/// WHY the bytes are compressed: the catalogue is the answer key of the
/// game. A shell that holds it in plain text can solve every round offline
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001). The bridge inflates the
/// artefact and hands the songs to the base — the shell never sees a title,
/// an artist or a lyric line.
///
/// EXAMPLE: the bytes of `public/data/catalogue.json.gz` become a
/// catalogue of the session.
///
/// # Errors
/// Returns the failure of the base when the artefact cannot be read.
#[wasm_bindgen]
pub fn phomu_catalog_open(compressed: &[u8]) -> Result<u64, BridgeError> {
    let songs = catalogue::read_catalogue(compressed)?;
    Ok(REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let id = take_id(&mut registry);
        registry.catalogues.insert(id, songs);
        id
    }))
}

/// Open a catalogue from a JSON document and return its handle.
///
/// WHY this exists next to [`phomu_catalog_open`]: the other bridges hand
/// the catalogue over as a document
/// (docs/design/BUILD-CONTRACT.md § 1.2, rule 1). The web shell uses the
/// compressed artefact instead.
///
/// # Errors
/// Returns the failure of the base when the artefact cannot be read.
pub fn phomu_catalog_open_json(source: &str) -> Result<u64, BridgeError> {
    let value: serde_json::Value = serde_json::from_str(source).map_err(|reason| BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason.to_string())]),
    })?;
    let songs = value
        .get("songs")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut parsed = Vec::with_capacity(songs.len());
    for song in &songs {
        parsed.push(catalogue::read_song(song)?);
    }
    Ok(REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        let id = take_id(&mut registry);
        registry.catalogues.insert(id, parsed);
        id
    }))
}

/// The entries of a catalogue, as the catalogue browser needs them.
///
/// WHY a JSON document and not a list of values: the browser reads the
/// entries as one document, and the wire format of the bridge is JSON
/// (BRIDGE-110).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_catalog_browse(handle: u64) -> Result<String, BridgeError> {
    let entries = catalogue_view::browse(handle)?;
    serde_json::to_string(&entries).map_err(|reason| BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason.to_string())]),
    })
}

/// The records of a catalogue, as the administrative surfaces need them.
///
/// WHY the records leave the base: the administrative surfaces edit the
/// hints and the lyric lines of the songs — they are the only surfaces that
/// may see the answers. They ask the base for them; the base hands them out
/// and never as part of a question
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_catalog_records(handle: u64) -> Result<String, BridgeError> {
    let records = catalogue_view::records(handle)?;
    serde_json::to_string(&records).map_err(|reason| BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason.to_string())]),
    })
}

/// The years of a catalogue, as the Timeline mode needs them.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_catalog_year_scale(handle: u64) -> Result<String, BridgeError> {
    let years = catalogue_view::year_scale(handle)?;
    serde_json::to_string(&years).map_err(|reason| BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason.to_string())]),
    })
}

/// The songs of an open catalogue.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn phomu_catalog_songs(handle: u64) -> Result<Vec<serde_json::Value>, BridgeError> {
    REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(unknown_catalogue(handle));
        };
        Ok(catalogue.iter().map(catalogue::summary_of).collect())
    })
}

/// The packs of an open catalogue.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_catalog_packs(handle: u64) -> Result<String, BridgeError> {
    let packs = catalogue_view::packs(handle)?;
    serde_json::to_string(&packs).map_err(|reason| BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason.to_string())]),
    })
}
