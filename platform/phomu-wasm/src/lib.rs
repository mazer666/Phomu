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
//! WHY the crate is in the application now: the web shell runs on the base
//! since the remediation of the answer key
//! (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.1). The shell loads the
//! module as a static asset and plays every round through it.
//!
//! EXAMPLE:
//!
//! ```text
//! node scripts/build-wasm.mjs
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod answer;
pub mod catalogue;
pub mod catalogue_exports;
pub mod catalogue_view;
pub mod config;
pub mod exports;
pub mod exports_session;
pub mod json;
pub mod round;
pub mod session;
pub mod session_admin;
pub mod session_answers;
pub mod session_commands;
pub mod surface;
pub mod wasm_module;

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
pub(crate) fn take_id(registry: &mut Registry) -> u64 {
    registry.next_id += 1;
    registry.next_id
}

thread_local! {
    pub(crate) static REGISTRY: RefCell<Registry> = RefCell::new(Registry::default());
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

impl From<BridgeError> for JsValue {
    /// The failure as the browser sees it.
    ///
    /// WHY a JSON document: the wire format of the bridge is JSON
    /// (BRIDGE-110). The browser therefore reads the code, the key and the
    /// context of the failure out of the document.
    fn from(failure: BridgeError) -> Self {
        let document = serde_json::to_string(&failure).unwrap_or_default();
        JsValue::from_str(&document)
    }
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

/// The failure of a document that is not JSON.
pub(crate) fn broken_document(reason: String) -> BridgeError {
    BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: HashMap::from([("reason".to_string(), reason)]),
    }
}

/// The list of a JSON document.
pub(crate) fn list_of(source: &str, field: &str) -> Result<Vec<serde_json::Value>, BridgeError> {
    let value: serde_json::Value =
        serde_json::from_str(source).map_err(|reason| broken_document(reason.to_string()))?;
    Ok(value
        .get(field)
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default())
}

/// The document of a JSON text.
pub(crate) fn document_of(source: &str) -> Result<serde_json::Value, BridgeError> {
    serde_json::from_str(source).map_err(|reason| broken_document(reason.to_string()))
}

/// The failure of a session the registry does not know.
pub(crate) fn unknown_session(handle: u64) -> BridgeError {
    BridgeError {
        code: 1001,
        message_key: "errors.invalidConfiguration".to_string(),
        context: HashMap::from([("session".to_string(), handle.to_string())]),
    }
}

/// The failure of a catalogue the registry does not know.
pub(crate) fn unknown_catalogue(handle: u64) -> BridgeError {
    BridgeError {
        code: 1001,
        message_key: "errors.invalidConfiguration".to_string(),
        context: HashMap::from([("catalogue".to_string(), handle.to_string())]),
    }
}
