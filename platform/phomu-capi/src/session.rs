//! The session functions of the C-ABI bridge.
//!
//! WHAT: the `extern "C"` functions that drive a session.
//!
//! WHY they live in their own module: the file of the crate stays short and
//! the session — the part with the most functions — is readable on its own.

use phomu_ffi::answer::PhomuAnswer;
use phomu_ffi::dto::{PhomuGameConfig, PhomuPlayer, PhomuTeam};
use phomu_ffi::session as bridge;

use crate::buffer::{fail, succeed, text_of};
use crate::{PHOMU_OK, PhomuErrorC};

/// Create a session.
///
/// # Safety
/// The three JSON parameters have to be valid null-terminated strings;
/// `out_handle` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_new(
    config_json: *const std::os::raw::c_char,
    players_json: *const std::os::raw::c_char,
    teams_json: *const std::os::raw::c_char,
    catalogue: u64,
    has_catalogue: i32,
    seed: u64,
    now_ms: u64,
    out_handle: *mut u64,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees valid strings.
    let (config, players, teams) = unsafe {
        (
            text_of(config_json),
            text_of(players_json),
            text_of(teams_json),
        )
    };
    let config: PhomuGameConfig = serde_json::from_str(&config).unwrap_or_default();
    let players: Vec<PhomuPlayer> = serde_json::from_str(&players).unwrap_or_default();
    let teams: Vec<PhomuTeam> = serde_json::from_str(&teams).unwrap_or_default();
    let catalogue = if has_catalogue == 0 {
        None
    } else {
        Some(phomu_ffi::dto::PhomuCatalogHandle { id: catalogue })
    };
    match bridge::phomu_session_new(config, players, teams, catalogue, seed, now_ms) {
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

/// The state of a session, as a JSON object.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_snapshot(
    handle: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_snapshot(handle) {
        Ok(snapshot) => succeed(out_json, &snapshot),
        Err(error) => fail(out_error, &error),
    }
}

/// Start the game, as a JSON object.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_start(
    handle: u64,
    now_ms: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_start(handle, now_ms) {
        Ok(view) => succeed(out_json, &view),
        Err(error) => fail(out_error, &error),
    }
}

/// Draw a song, as a JSON object.
///
/// # Safety
/// `source` and `song_json` have to be valid null-terminated strings;
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_draw(
    handle: u64,
    source: *const std::os::raw::c_char,
    song_json: *const std::os::raw::c_char,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees valid strings.
    let (source, song) = unsafe { (text_of(source), text_of(song_json)) };
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    let song = if song.is_empty() { None } else { Some(song) };
    match bridge::phomu_session_draw(handle, source, song) {
        Ok(view) => succeed(out_json, &view),
        Err(error) => fail(out_error, &error),
    }
}

/// Submit an answer, as a JSON object.
///
/// # Safety
/// `answer_json` has to be a valid null-terminated string; `out_json` and
/// `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_answer(
    handle: u64,
    answer_json: *const std::os::raw::c_char,
    has_answered_in_seconds: i32,
    answered_in_seconds: u32,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees a valid string.
    let answer_json = unsafe { text_of(answer_json) };
    let answer: PhomuAnswer = serde_json::from_str(&answer_json).unwrap_or_default();
    let seconds = if has_answered_in_seconds == 0 {
        None
    } else {
        Some(answered_in_seconds)
    };
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_answer(handle, answer, seconds) {
        Ok(snapshot) => succeed(out_json, &snapshot),
        Err(error) => fail(out_error, &error),
    }
}

/// Release the solution of the round, as a JSON object.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_reveal(
    handle: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_reveal(handle) {
        Ok(reveal) => succeed(out_json, &reveal),
        Err(error) => fail(out_error, &error),
    }
}

/// Close the round, as a JSON object.
///
/// # Safety
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_next_round(
    handle: u64,
    now_ms: u64,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_next_round(handle, now_ms) {
        Ok(view) => succeed(out_json, &view),
        Err(error) => fail(out_error, &error),
    }
}

/// End the game, as a JSON object.
///
/// # Safety
/// `winner_id` has to be a valid null-terminated string or a null pointer;
/// `out_json` and `out_error` have to be valid pointers.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn phomu_session_end(
    handle: u64,
    winner_id: *const std::os::raw::c_char,
    has_winner: i32,
    out_json: *mut *const std::os::raw::c_char,
    out_error: *mut PhomuErrorC,
) -> i32 {
    // SAFETY: the caller guarantees a valid string.
    let winner = unsafe { text_of(winner_id) };
    let winner = if has_winner == 0 || winner.is_empty() {
        None
    } else {
        Some(winner)
    };
    let handle = phomu_ffi::dto::PhomuSessionHandle { id: handle };
    match bridge::phomu_session_end(handle, winner) {
        Ok(snapshot) => succeed(out_json, &snapshot),
        Err(error) => fail(out_error, &error),
    }
}
