//! The registry of the bridge.
//!
//! WHAT: the place where the sessions and the catalogues of the shells live.
//!
//! WHY the bridge holds it: the base owns the rules and knows nothing about
//! the shells. The bridge is the composition root — the one place that
//! knows which services exist and hands them to the shell
//! (docs/design/BUILD-CONTRACT.md § 1.1).
//!
//! WHY a number and not a reference: a handle is an identifier; no Rust
//! reference crosses the boundary (docs/design/BUILD-CONTRACT.md § 2.4,
//! rule B-1).
//!
//! EXAMPLE:
//!
//! ```text
//! let handle = phomu_session_new(config, players, teams, catalogue, 42, 0)?;
//! ```

use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard, OnceLock};

use phomu_core::facade::ErrorCode;
use phomu_core::facade::Session;

use crate::error::{PhomuError, failure};

use crate::catalogue::Catalogue;

/// A session of the registry, with the catalogue it draws from.
#[derive(Debug)]
pub struct SessionEntry {
    /// The session of the base.
    pub session: Session,
    /// The catalogue the session draws from, if one was opened.
    pub catalogue_id: Option<u64>,
}

/// The registry of the bridge.
#[derive(Debug, Default)]
pub struct Registry {
    /// The sessions of the shells.
    pub sessions: HashMap<u64, SessionEntry>,
    /// The catalogues of the shells.
    pub catalogues: HashMap<u64, Catalogue>,
    /// The identifier of the next entry.
    pub next_id: u64,
}

impl Registry {
    /// The next free identifier.
    fn take_id(&mut self) -> u64 {
        self.next_id += 1;
        self.next_id
    }
}

/// The registry of the process.
static REGISTRY: OnceLock<Mutex<Registry>> = OnceLock::new();

/// The registry of the process.
fn registry() -> MutexGuard<'static, Registry> {
    let mutex = REGISTRY.get_or_init(|| Mutex::new(Registry::default()));
    match mutex.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

/// The failure of a handle that the registry does not know.
fn unknown_handle(kind: &str, id: u64) -> PhomuError {
    failure(
        ErrorCode::InvalidConfiguration,
        &[("handle", &format!("{kind}:{id}"))],
    )
}

/// Put a session into the registry and return its handle.
pub fn insert_session(entry: SessionEntry) -> u64 {
    let mut registry = registry();
    let id = registry.take_id();
    registry.sessions.insert(id, entry);
    id
}

/// Put a catalogue into the registry and return its handle.
pub fn insert_catalogue(catalogue: Catalogue) -> u64 {
    let mut registry = registry();
    let id = registry.take_id();
    registry.catalogues.insert(id, catalogue);
    id
}

/// The session of a handle.
///
/// # Errors
/// Returns a failure when the registry does not know the handle.
pub fn session_of(id: u64) -> Result<MutexGuard<'static, Registry>, PhomuError> {
    let registry = registry();
    if !registry.sessions.contains_key(&id) {
        return Err(unknown_handle("session", id));
    }
    Ok(registry)
}

/// The catalogue of a handle.
///
/// # Errors
/// Returns a failure when the registry does not know the handle.
pub fn catalogue_of(id: u64) -> Result<MutexGuard<'static, Registry>, PhomuError> {
    let registry = registry();
    if !registry.catalogues.contains_key(&id) {
        return Err(unknown_handle("catalogue", id));
    }
    Ok(registry)
}
