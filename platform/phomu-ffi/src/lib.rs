//! The UniFFI bridge of the Phomu base.
//!
//! WHAT: the exported surface of the base for the Kotlin and the Swift
//! shells. The crate generates the bindings; it does not contain rules.
//!
//! WHY the bridge exists: the base is the shared implementation of the rules
//! of the game, and a shell is a renderer and an input surface
//! (docs/design/PLATFORM-ARCHITECTURE.md § 1.1). The bridge is the only
//! technical contact between the two (BRIDGE-101).
//!
//! ## What the bridge exports
//!
//! The exported functions are listed in [`surface::EXPORTED_FUNCTIONS`], the
//! exported types in [`surface::EXPORTED_TYPES`]. The fingerprint over both
//! lists changes whenever the surface changes, and the test of the surface
//! fails — a change of the surface therefore has to come with a change of
//! the ABI version (docs/adr/ADR-0008-abi-version-and-the-exported-surface.md).
//!
//! ## What the bridge does not export
//!
//! * the internal state of a session — the shell sees the snapshots;
//! * a song with its solution — the question phase has no field for it;
//! * panics, raw pointers, references and `unsafe` types;
//! * callbacks that capture Rust state — the base never calls the shell.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::surface::surface_fingerprint;
//!
//! assert_ne!(surface_fingerprint(), 0);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod abi;
pub mod answer;
pub mod catalogue;
pub mod core_api;
pub mod dto;
pub mod error;
pub mod media;
pub mod registry;
pub mod session;
pub mod surface;
pub mod version;
pub mod view;

pub use abi::VERSION;
pub use error::PhomuError;

// The scaffolding of the foreign function interface. The macro has to be
// called in the crate that owns the exported items.
uniffi::setup_scaffolding!();
