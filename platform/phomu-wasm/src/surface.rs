//! The declared surface of the WebAssembly bridge.
//!
//! WHAT: the list of the symbols the bridge exports and a fingerprint over
//! that list.
//!
//! WHY the surface is declared as data: the export section of the built
//! module is the truth a shell sees, and a symbol that is missing from it is
//! a shell that cannot play. The declaration is the contract, and the test
//! of the surface compares the contract with the built module — a symbol
//! that disappears from the code fails the build
//! (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
//!
//! WHY the fingerprint: the ABI version says *which* version of the surface
//! is exported; the fingerprint says *which* surface it is. A change of the
//! exported symbols changes the fingerprint, the fingerprint test fails, and
//! the change is therefore accompanied by a version bump. That is the
//! mechanical form of the rule in
//! [`docs/adr/ADR-0008-abi-version-and-the-exported-surface.md`](../../docs/adr/ADR-0008-abi-version-and-the-exported-surface.md).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_wasm::surface::{EXPORTED_FUNCTIONS, surface_fingerprint};
//!
//! assert!(EXPORTED_FUNCTIONS.contains(&"phomu_session_timeout"));
//! assert_ne!(surface_fingerprint(), 0);
//! ```

/// Every function the bridge exports.
///
/// WHY: the list is the contract. A function that is not on it is not part
/// of the surface, and a function that is on it but missing from the module
/// makes the surface test fail.
pub const EXPORTED_FUNCTIONS: &[&str] = &[
    // The version of the surface.
    "phomu_abi_version",
    "phomu_abi_versions",
    "phomu_abi_accepts",
    "phomu_message_key",
    // The catalogue.
    "phomu_catalog_open",
    "phomu_catalog_browse",
    "phomu_catalog_records",
    "phomu_catalog_year_scale",
    "phomu_catalog_packs",
    // The state of the session.
    "phomu_session_snapshot",
    "phomu_media_plan",
    // The game loop.
    "phomu_session_new",
    "phomu_session_start",
    "phomu_session_draw",
    "phomu_session_draw_by_id",
    "phomu_session_submit",
    "phomu_session_lock_answers",
    "phomu_session_reveal",
    "phomu_session_timeout",
    "phomu_session_next_round",
    "phomu_session_end",
    // The commands of the round.
    "phomu_session_cheat",
    "phomu_session_disclose",
    "phomu_session_init_timeline",
    "phomu_session_add_timeline_year",
    "phomu_session_remove_timeline_year",
    "phomu_session_skip_broken_song",
    "phomu_session_award_points",
    "phomu_session_answer_raw",
    // The commands of the lobby and of the power user.
    "phomu_session_assign_player_to_team",
    "phomu_session_remove_team",
    "phomu_session_reset_scores",
    "phomu_session_set_config",
    "phomu_session_advance_phase",
    "phomu_session_restore_rng_state",
];

/// The commands of the game loop.
///
/// WHY the list is separate: the game loop is the promise of the bridge. A
/// shell that loads the module has to be able to start a game, to draw a
/// song, to take the answers, to close the round, to reveal it, to award
/// the points, to continue and to end the game. The test of the surface
/// proves that every one of these commands is exported
/// (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
pub const GAME_LOOP: &[&str] = &[
    "phomu_session_new",
    "phomu_session_start",
    "phomu_session_draw",
    "phomu_session_submit",
    "phomu_session_lock_answers",
    "phomu_session_reveal",
    "phomu_session_timeout",
    "phomu_session_award_points",
    "phomu_session_next_round",
    "phomu_session_end",
];

/// The fingerprint of the exported surface.
///
/// WHY: FNV-1a is not a cryptographic hash and does not have to be. The
/// fingerprint has to change when a symbol is added, renamed or removed —
/// and nothing else.
///
/// EXAMPLE: the fingerprint of the surface of version 1.2.0 is
/// `0xb9fce6e03c696dcb`.
pub fn surface_fingerprint() -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for symbol in EXPORTED_FUNCTIONS {
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
