//! The fingerprint of the exported surface.
//!
//! WHAT: the list of the symbols the bridge exports and a fingerprint over
//! that list.
//!
//! WHY: the ABI version says *which* version of the surface is exported; the
//! fingerprint says *which* surface it is. A change of the exported symbols
//! changes the fingerprint, the fingerprint test fails, and the change is
//! therefore accompanied by a version bump. That is the mechanical form of
//! the rule in [`docs/adr/ADR-0008-abi-version-and-the-exported-surface.md`](../../docs/adr/ADR-0008-abi-version-and-the-exported-surface.md).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::surface::{EXPORTED_FUNCTIONS, surface_fingerprint};
//!
//! assert!(EXPORTED_FUNCTIONS.contains(&"phomu_abi_version"));
//! assert_ne!(surface_fingerprint(), 0);
//! ```

/// Every function the bridge exports.
///
/// WHY: the list is the contract. A function that is not on it is not part
/// of the surface, and a function that is on it but missing from the code
/// makes the fingerprint test fail.
pub const EXPORTED_FUNCTIONS: &[&str] = &[
    "phomu_abi_version",
    "phomu_abi_versions",
    "phomu_abi_accepts",
    "phomu_capabilities",
    "phomu_catalog_open",
    "phomu_catalog_packs",
    "phomu_catalog_songs",
    "phomu_session_new",
    "phomu_session_snapshot",
    "phomu_session_start",
    "phomu_session_draw",
    "phomu_session_answer",
    "phomu_session_reveal",
    "phomu_session_next_round",
    "phomu_session_end",
    "phomu_media_plan",
    "phomu_message_key",
];

/// Every type the bridge exports.
pub const EXPORTED_TYPES: &[&str] = &[
    "PhomuCapabilities",
    "PhomuCatalogHandle",
    "PhomuError",
    "PhomuGameConfig",
    "PhomuGameOverSnapshot",
    "PhomuMediaCandidate",
    "PhomuMediaPlan",
    "PhomuPackInfo",
    "PhomuPlayer",
    "PhomuPlayerAnswer",
    "PhomuPlayerScore",
    "PhomuRevealView",
    "PhomuRoundView",
    "PhomuScoreSnapshot",
    "PhomuSessionHandle",
    "PhomuSessionSnapshot",
    "PhomuSongSummary",
    "PhomuTeam",
];

/// The fingerprint of the exported surface.
///
/// WHY: FNV-1a is not a cryptographic hash and does not have to be. The
/// fingerprint has to change when a symbol is added, renamed or removed — and
/// nothing else.
///
/// EXAMPLE: the fingerprint of the surface of version 1.0.0 is
/// `0x2e486765000e97b0`.
pub fn surface_fingerprint() -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for symbol in EXPORTED_FUNCTIONS.iter().chain(EXPORTED_TYPES.iter()) {
        for byte in symbol.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        // The separator keeps "ab" and "a" + "b" apart.
        hash ^= 0x1f;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}
