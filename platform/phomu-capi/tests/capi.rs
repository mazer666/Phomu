//! The round trip through the C-ABI.
//!
//! WHAT: a whole round, played through the exported `extern "C"` functions
//! of the bridge.
//!
//! WHY: a C-ABI that has never carried a session is a guess. The test
//! plays one and reads the JSON that the C caller would read
//! (docs/design/BUILD-CONTRACT.md § 4.2).
//!
//! EXAMPLE:
//!
//! ```text
//! cargo test -p phomu-capi
//! ```

// WHY the override of the workspace lints: a test has to fail loudly. The
// lints that forbid `unwrap`, `expect` and the indexing exist for the code
// of the product, where a panic is a defect; in a test they are the way a
// failure is reported.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![allow(clippy::panic)]
// WHY the override of the workspace lint: the test calls the foreign
// function interface of the crate, and the FFI signature forces the
// `unsafe`. Every `unsafe` block carries a `SAFETY` comment.
#![allow(unsafe_code)]

use std::ffi::{CStr, CString};

use phomu_capi::{
    PHOMU_ERROR, PHOMU_OK, PhomuErrorC, phomu_abi_version_major, phomu_abi_version_minor,
    phomu_abi_version_patch, phomu_abi_version_string, phomu_catalog_open, phomu_catalog_packs,
    phomu_catalog_songs, phomu_media_plan, phomu_message_key, phomu_session_answer,
    phomu_session_draw, phomu_session_end, phomu_session_new, phomu_session_next_round,
    phomu_session_reveal, phomu_session_snapshot, phomu_session_start,
};

/// The catalogue of the test.
const CATALOGUE: &str = r#"{"songs":[{"id":"song-one","title":"Titel EINS","artist":"Künstler EINS","year":1985,"country":"DE","genre":"Pop","difficulty":"easy","mood":["Epic"],"packs":["Rock Anthems"],"hints":["[XXX] sang in the eighties"],"supportedModes":["timeline"],"isQRCompatible":true,"links":{"youtube":"https://www.youtube.com/watch?v=aaaaaaaaaaa"}}],"packs":{"Rock Anthems":{"pack":"Rock Anthems"}}}"#;

/// The text of a string the library returned.
fn text(pointer: *const std::os::raw::c_char) -> String {
    if pointer.is_null() {
        return String::new();
    }
    // SAFETY: the library returns a valid null-terminated string.
    unsafe { CStr::from_ptr(pointer) }
        .to_string_lossy()
        .into_owned()
}

/// The failure of the last call.
fn failure(error: &PhomuErrorC) -> (u16, String) {
    (error.code, text(error.message_key))
}

#[test]
fn the_abi_version_is_in_the_library() {
    assert_eq!(phomu_abi_version_major(), 1);
    assert_eq!(phomu_abi_version_minor(), 0);
    assert_eq!(phomu_abi_version_patch(), 0);
    assert_eq!(text(phomu_abi_version_string()), "1.0.0");
}

#[test]
fn the_header_carries_the_version_of_the_library() {
    let header = std::fs::read_to_string(
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("include/phomu.h"),
    )
    .expect("the header exists");
    assert!(header.contains("#define PHOMU_ABI_VERSION_MAJOR 1"));
    assert!(header.contains("#define PHOMU_ABI_VERSION_MINOR 0"));
    assert!(header.contains("#define PHOMU_ABI_VERSION_PATCH 0"));
}

#[test]
fn a_round_runs_over_the_c_abi() {
    let source = CString::new(CATALOGUE).expect("the catalogue is a valid C string");
    let mut handle: u64 = 0;
    let mut error = PhomuErrorC {
        code: 0,
        message_key: std::ptr::null(),
        context: std::ptr::null(),
    };
    // SAFETY: the pointers are valid and the strings are null-terminated.
    let status = unsafe { phomu_catalog_open(source.as_ptr(), &mut handle, &mut error) };
    assert_eq!(status, PHOMU_OK);

    let mut json: *const std::os::raw::c_char = std::ptr::null();
    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_catalog_packs(handle, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("Rock Anthems"));

    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_catalog_songs(handle, std::ptr::null(), &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("song-one"));
    assert!(!text(json).contains("Titel EINS"));

    let config = CString::new("{}").expect("a valid C string");
    let players =
        CString::new(r#"[{"id":"p1","name":"Ada","isPilot":true},{"id":"p2","name":"Bob"}]"#)
            .expect("a valid C string");
    let teams = CString::new("[]").expect("a valid C string");
    let mut session: u64 = 0;
    // SAFETY: the pointers are valid and the strings are null-terminated.
    let status = unsafe {
        phomu_session_new(
            config.as_ptr(),
            players.as_ptr(),
            teams.as_ptr(),
            handle,
            1,
            42,
            0,
            &mut session,
            &mut error,
        )
    };
    assert_eq!(status, PHOMU_OK);

    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_session_start(session, 0, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("drawing"));

    // SAFETY: the pointers are valid and the strings are null-terminated.
    let draw_source = CString::new("random").expect("a valid C string");
    let status = unsafe {
        phomu_session_draw(
            session,
            draw_source.as_ptr(),
            std::ptr::null(),
            &mut json,
            &mut error,
        )
    };
    assert_eq!(status, PHOMU_OK, "{}", failure(&error).1);
    assert!(text(json).contains("question"));
    assert!(!text(json).contains("Titel EINS"));

    let answer = CString::new(r#"{"mode":"timeline","timelineSlot":0}"#).expect("a valid C string");
    // SAFETY: the pointers are valid and the strings are null-terminated.
    let status =
        unsafe { phomu_session_answer(session, answer.as_ptr(), 0, 0, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("roundNumber"));

    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_session_reveal(session, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("Titel EINS"));

    // The media plan belongs to the round that is played; after the next
    // round there is no song any more.
    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_media_plan(session, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("candidates"));

    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_session_next_round(session, 0, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);

    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_session_snapshot(session, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("players"));

    let winner = CString::new("p1").expect("a valid C string");
    // SAFETY: the pointers are valid and the strings are null-terminated.
    let status = unsafe { phomu_session_end(session, winner.as_ptr(), 1, &mut json, &mut error) };
    assert_eq!(status, PHOMU_OK);
    assert!(text(json).contains("winnerId"));
}

#[test]
fn a_failure_crosses_the_c_abi_with_its_code_and_its_key() {
    let mut error = PhomuErrorC {
        code: 0,
        message_key: std::ptr::null(),
        context: std::ptr::null(),
    };
    let mut json: *const std::os::raw::c_char = std::ptr::null();
    // SAFETY: the pointers are valid.
    let status = unsafe { phomu_session_reveal(9999, &mut json, &mut error) };
    assert_eq!(status, PHOMU_ERROR);
    let (code, key) = failure(&error);
    assert_eq!(code, 1001);
    assert_eq!(key, "errors.invalidConfiguration");
}

#[test]
fn the_message_key_crosses_the_c_abi() {
    let event = CString::new("answer-correct").expect("a valid C string");
    // SAFETY: the pointer is valid and the string is null-terminated.
    let key = unsafe { phomu_message_key(event.as_ptr()) };
    assert_eq!(text(key), "game.feedback.correct");
}
