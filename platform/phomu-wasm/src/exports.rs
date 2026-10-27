//! The exported surface of the WebAssembly bridge.
//!
//! WHAT: the functions a shell calls, as the `wasm-bindgen` exports of the
//! module.
//!
//! WHY the exports live in their own module: the crate root holds the
//! registry and the failure of the bridge, this module holds the surface
//! itself. The split keeps both files below the size limit of the
//! repository and makes the surface readable on its own
//! (docs/design/BUILD-CONTRACT.md § 2.1).
//!
//! WHY every value crosses as JSON: the browser holds the values of the
//! module, and the format is the same as the one of the C-ABI bridge, so that
//! the two profiles of the wire model agree (BRIDGE-110).
//!
//! WHY the surface is declared as data: the list of the exported symbols is
//! the contract with the shell. It lives in [`crate::surface`], and the test
//! of the surface compares it with the export section of the built module —
//! a symbol that is missing from the module fails the build
//! (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
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
use crate::{BridgeError, REGISTRY, broken_document, unknown_session};

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

/// Whether the version of the base lies inside the bracket of the shell.
///
/// WHY the check is closed: a shell that runs against a base it was not
/// written for has to stop at start-up and not in the middle of a round
/// (docs/design/BUILD-CONTRACT.md § 3.2).
#[wasm_bindgen]
pub fn phomu_abi_accepts(
    min_major: u16,
    min_minor: u16,
    min_patch: u16,
    max_major: u16,
    max_minor: u16,
    max_patch: u16,
) -> bool {
    let bracket = phomu_core::facade::VersionBracket::new(
        (min_major, min_minor, min_patch),
        (max_major, max_minor, max_patch),
    );
    bracket.accepts_current()
}

/// The state of a session.
///
/// WHY the snapshot crosses as a document: the shell reads the state of the
/// session as one value, and the wire format of the bridge is JSON
/// (BRIDGE-110).
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
#[wasm_bindgen]
pub fn phomu_session_snapshot(handle: u64) -> Result<String, BridgeError> {
    let snapshot = session::snapshot(handle)?;
    serde_json::to_string(&snapshot).map_err(|reason| broken_document(reason.to_string()))
}

/// The JSON of the plan of the media of the running round.
///
/// # Errors
/// Returns the failure of the base when no song is drawn.
#[wasm_bindgen]
pub fn phomu_media_plan(handle: u64) -> Result<String, BridgeError> {
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
        let plan = media_plan(&plan);
        serde_json::to_string(&plan).map_err(|reason| broken_document(reason.to_string()))
    })
}

/// The i18n key of a game event.
///
/// WHY the identifier is the wire name and not the name of the variant: the
/// two bridges have to answer with the same key for the same event
/// (docs/qa/QA-11-RUST-BASE.md, QA-RST-004).
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
