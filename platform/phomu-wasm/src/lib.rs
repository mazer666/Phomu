//! The WebAssembly bridge of Phomu.
//!
//! WHAT: the exported surface of the base for the web shell, as a
//! `wasm-bindgen` module.
//!
//! WHY the module exists: the web shell is a static export and has no
//! server that could host the core. WebAssembly is the only way for the
//! shell to use the same rules without owning a second implementation
//! (docs/design/BUILD-CONTRACT.md § 2.4, rule B-7).
//!
//! WHY the values cross as JSON: the browser holds the values of the
//! module, and the format is the same as the one of the C-ABI bridge, so
//! that the two profiles of the wire model agree (BRIDGE-110).
//!
//! WHY this crate is not in the application yet: the migration of the web
//! shell onto the shared base is a separate step
//! (docs/design/PLATFORM-ARCHITECTURE.md § 5.3). The crate is the
//! foundation of that step.
//!
//! EXAMPLE:
//!
//! ```text
//! wasm-pack build platform/phomu-wasm --target web
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod catalogue;
pub mod config;
pub mod json;
pub mod session;

use std::cell::RefCell;
use std::collections::HashMap;

use phomu_core::facade::Session;
use wasm_bindgen::prelude::*;

/// The registry of the module: the sessions and the catalogues.
#[derive(Default)]
pub struct Registry {
    /// The sessions of the shells.
    pub sessions: HashMap<u64, SessionEntry>,
    /// The catalogues of the shells.
    pub catalogues: HashMap<u64, Vec<phomu_catalog::Song>>,
    /// The identifier of the next entry.
    pub next_id: u64,
}

/// A session of the registry, with the catalogue it draws from.
pub struct SessionEntry {
    /// The session of the base.
    pub session: Session,
    /// The identifier of the catalogue the session draws from.
    pub catalogue_id: Option<u64>,
}

/// Take the next free identifier of the registry.
fn take_id(registry: &mut Registry) -> u64 {
    registry.next_id += 1;
    registry.next_id
}

thread_local! {
    static REGISTRY: RefCell<Registry> = RefCell::new(Registry::default());
}

/// The failure of the bridge, as the browser sees it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeError {
    /// The stable numeric code of the failure.
    pub code: u16,
    /// The i18n message key of the failure.
    pub message_key: String,
    /// The context of the failure.
    pub context: HashMap<String, String>,
}

impl From<&phomu_errors::PhomuError> for BridgeError {
    fn from(failure: &phomu_errors::PhomuError) -> Self {
        Self {
            code: failure.code().code(),
            message_key: failure.message_key().to_string(),
            context: failure
                .context()
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
        }
    }
}

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

/// Open a catalogue and return its handle.
///
/// # Errors
/// Returns the failure of the base when the artefact cannot be read.
pub fn phomu_catalog_open(source: &str) -> Result<u64, BridgeError> {
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

/// The songs of an open catalogue.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn phomu_catalog_songs(handle: u64) -> Result<Vec<serde_json::Value>, BridgeError> {
    REGISTRY.with(|registry| {
        let registry = registry.borrow();
        let Some(catalogue) = registry.catalogues.get(&handle) else {
            return Err(BridgeError {
                code: 1001,
                message_key: "errors.invalidConfiguration".to_string(),
                context: HashMap::from([("catalogue".to_string(), handle.to_string())]),
            });
        };
        Ok(catalogue.iter().map(catalogue::summary_of).collect())
    })
}

/// The packs of an open catalogue.
///
/// # Errors
/// Returns the failure of the base when the handle is unknown.
pub fn phomu_catalog_packs(handle: u64) -> Result<Vec<serde_json::Value>, BridgeError> {
    session::packs(handle)
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
            return Err(BridgeError {
                code: 1001,
                message_key: "errors.invalidConfiguration".to_string(),
                context: HashMap::from([("session".to_string(), handle.to_string())]),
            });
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
        Ok(json::media_plan(&plan))
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
