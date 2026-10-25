//! The C-ABI bridge of Phomu.
//!
//! WHAT: the same exported surface as the UniFFI bridge, in the shape of a
//! C API: a `cdylib` with `extern "C"` functions and a generated header.
//!
//! WHY the crate exists: an embedder that is neither Rust nor Kotlin nor
//! Swift needs a stable binary artefact whose version it can check
//! (docs/design/PLATFORM-ARCHITECTURE.md § 6.5).
//!
//! WHY there is no second implementation of the rules: the crate reuses the
//! wire model, the registry and the error mapping of the UniFFI bridge
//! (`phomu-ffi`). The two bridges are two marshalling strategies over one
//! surface and cannot drift apart
//! (docs/design/BUILD-CONTRACT.md § 2.1).
//!
//! ## The shape of the API
//!
//! * Every fallible function returns `0` on success and `1` on a failure and
//!   writes the failure into the `PhomuError` of its last argument.
//! * The complex values cross as JSON. The format is stable within a major
//!   version of the ABI (BRIDGE-110) and is documented in the header.
//! * The strings the library returns belong to the library and stay valid
//!   until the next call of the same thread.
//!
//! EXAMPLE:
//!
//! ```text
//! PhomuError error;
//! uint64_t handle = 0;
//! if (phomu_catalog_open("{\"songs\":[]}", &handle, &error) != PHOMU_OK) {
//!     printf("%s\n", error.message_key);
//! }
//! ```

// WHY the override of the workspace lint: this crate is a foreign function
// interface. The signatures of the exported functions are `extern "C"` and
// carry raw pointers; the FFI signature forces the `unsafe`, and the deny of
// the workspace lint cannot be satisfied by a C-ABI. Every `unsafe` block
// in this crate carries a `SAFETY` comment that names the guarantee the
// caller has to give (docs/design/BUILD-CONTRACT.md § 1.2, rule 4).
#![allow(unsafe_code)]
#![deny(missing_docs)]

use phomu_ffi::dto::PhomuCapabilities;
mod buffer;
pub mod session;

pub use session::{
    phomu_session_answer, phomu_session_draw, phomu_session_end, phomu_session_new,
    phomu_session_next_round, phomu_session_reveal, phomu_session_snapshot, phomu_session_start,
};

use buffer::{fail, owned, succeed, text_of};
use phomu_ffi::media as bridge_media;
use phomu_ffi::session as bridge;
use phomu_ffi::version as bridge_version;

/// The status of a call that succeeded.
pub const PHOMU_OK: i32 = 0;

/// The status of a call that failed.
pub const PHOMU_ERROR: i32 = 1;

/// A failure of the base, as the C caller sees it.
///
/// WHY the fields are pointers: the C caller must not free them; they belong
/// to the library and stay valid until the next call of the same thread.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct PhomuErrorC {
    /// The stable numeric code of the failure.
    pub code: u16,
    /// The i18n message key of the failure.
    pub message_key: *const std::os::raw::c_char,
    /// The context of the failure, as a JSON object.
    pub context: *const std::os::raw::c_char,
}

/// The major version of the exported surface.
#[unsafe(no_mangle)]
pub extern "C" fn phomu_abi_version_major() -> u16 {
    phomu_ffi::VERSION.major
}

/// The minor version of the exported surface.
#[unsafe(no_mangle)]
pub extern "C" fn phomu_abi_version_minor() -> u16 {
    phomu_ffi::VERSION.minor
}

/// The patch version of the exported surface.
#[unsafe(no_mangle)]
pub extern "C" fn phomu_abi_version_patch() -> u16 {
    phomu_ffi::VERSION.patch
}

/// The version of the exported surface, as a string.
#[unsafe(no_mangle)]
pub extern "C" fn phomu_abi_version_string() -> *const std::os::raw::c_char {
    owned(&bridge_version::phomu_abi_version())
}

/// Every major version of the surface the base still serves, as a JSON array.
#[unsafe(no_mangle)]
pub extern "C" fn phomu_abi_versions_json() -> *const std::os::raw::c_char {
    let versions = bridge_version::phomu_abi_versions();
    owned(&serde_json::to_string(&versions).unwrap_or_else(|_| "[]".to_string()))
}

/// Open a catalogue.
///
/// # Safety
/// `source` has to be a valid null-terminated string and `out_handle` and
/// `out_error` valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_catalog_open(
    source: *const std::os::raw::c_char,
    out_handle: *mut u64,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees a valid string.
    let source = unsafe { text_of(source) };
    match bridge::phomu_catalog_open(source) {
        Ok(handle) => {
            if !out_handle.is_null() {
                // SAFETY: the caller guarantees a pointer it owns.
                unsafe { *out_handle = handle.id };
            }
            PHOMU_OK
        }
        Err(error) => fail(out_error, &error),
    }
}

/// The packs of a catalogue, as a JSON array.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_catalog_packs(
    handle: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuCatalogHandle { id: handle };
    match bridge::phomu_catalog_packs(handle) {
        Ok(packs) => succeed(out_json, &packs),
        Err(error) => fail(out_error, &error),
    }
}

/// The songs of a catalogue, as a JSON array.
///
/// # Safety
/// `packs_json` has to be a valid null-terminated string or a null pointer;
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_catalog_songs(
    handle: u64,
    packs_json: *const std::os::raw::c_char,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees a valid string.
    let packs = unsafe { text_of(packs_json) };
    let packs: Vec<String> = serde_json::from_str(&packs).unwrap_or_default();
    let handle = phomu_ffi::dto::PhomuCatalogHandle { id: handle };
    match bridge::phomu_catalog_songs(handle, packs) {
        Ok(songs) => succeed(out_json, &songs),
        Err(error) => fail(out_error, &error),
    }
}

/// The media plan of the running round, as a JSON object.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_media_plan(
    handle: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge_media::phomu_media_plan(handle) {
        Ok(plan) => succeed(out_json, &plan),
        Err(error) => fail(out_error, &error),
    }
}

/// The i18n key of a game event.
///
/// # Safety
/// `event` has to be a valid null-terminated string.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_message_key(
    event: *const std::os::raw::c_char,
) -> *const std::os::raw::c_char {
    // SAFETY: the caller guarantees a valid string.
    let event = unsafe { text_of(event) };
    owned(&bridge_media::phomu_message_key(event))
}

/// The capabilities the base offers for the declaration of a shell.
///
/// # Safety
/// `shell_json` has to be a valid null-terminated string; `out_json` and
/// `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_capabilities_json(
    shell_json: *const std::os::raw::c_char,
    out_json: *mut *const std::os::raw::c_char,
    _out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees a valid string.
    let shell_json = unsafe { text_of(shell_json) };
    let shell: PhomuCapabilities = serde_json::from_str(&shell_json).unwrap_or_default();
    succeed(out_json, &bridge_version::phomu_capabilities(shell))
}
