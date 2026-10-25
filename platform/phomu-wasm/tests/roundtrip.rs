//! The round trip through the WebAssembly bridge.
//!
//! WHAT: a whole round, played through the functions of the bridge.
//!
//! WHY: the web shell is a shell like every other shell; it reaches the
//! base through this module. A module that has never carried a session is a
//! guess (docs/design/BUILD-CONTRACT.md § 4.2).
//!
//! EXAMPLE:
//!
//! ```text
//! cargo test -p phomu-wasm
//! ```

// WHY the override of the workspace lints: a test has to fail loudly. The
// lints that forbid `unwrap`, `expect` and the indexing exist for the code
// of the product, where a panic is a defect; in a test they are the way a
// failure is reported.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![allow(clippy::panic)]

use phomu_wasm::session::{draw_song, new_session, next_round, reveal, start_game, submit_answer};
use serde_json::{Value, json};

/// The catalogue of the test.
const CATALOGUE: &str = r#"{"songs":[{"id":"song-one","title":"Titel EINS","artist":"Künstler EINS","year":1985,"country":"DE","genre":"Pop","difficulty":"easy","mood":["Epic"],"packs":["Rock Anthems"],"hints":["[XXX] sang in the eighties"],"supportedModes":["timeline"],"isQRCompatible":true,"links":{"youtube":"https://www.youtube.com/watch?v=aaaaaaaaaaa"}}]}"#;

/// The players of the session.
fn players() -> Vec<Value> {
    vec![
        json!({ "id": "p1", "name": "Ada", "isPilot": true }),
        json!({ "id": "p2", "name": "Bob" }),
    ]
}

#[test]
fn the_version_is_part_of_the_module() {
    assert_eq!(phomu_wasm::phomu_abi_version(), "1.0.0");
    assert_eq!(phomu_wasm::phomu_abi_versions(), vec!["1.0.0".to_string()]);
}

#[test]
fn a_round_runs_over_the_wasm_bridge() {
    let catalogue = phomu_wasm::phomu_catalog_open(CATALOGUE).expect("the catalogue is read");
    let songs = phomu_wasm::phomu_catalog_songs(catalogue).expect("the songs are listed");
    assert_eq!(songs.len(), 1);
    // WHY no title: the summary is what a shell shows before the reveal.
    assert!(!songs[0].to_string().contains("Titel EINS"));

    let handle = new_session(&json!({}), &players(), &[], Some(catalogue), 42, 0)
        .expect("the session is created");

    let drawing = start_game(handle, 0).expect("the game starts");
    assert_eq!(drawing["phase"], "drawing");

    let question = draw_song(handle, "random").expect("a song is drawn");
    assert_eq!(question["phase"], "question");
    // The question phase carries no identity of the song.
    assert!(!question.to_string().contains("Titel EINS"));
    assert!(!question.to_string().contains("Künstler"));

    let answer = phomu_core::facade::ModeAnswer::Timeline { slot: 0 };
    let score = submit_answer(handle, &answer, None).expect("the answer is scored");
    assert_eq!(score["roundNumber"], 1);

    let reveal = reveal(handle).expect("the solution is released");
    assert_eq!(reveal["phase"], "reveal");
    assert_eq!(reveal["title"], "Titel EINS");

    next_round(handle, 0).expect("the next round begins");
}

#[test]
fn a_failure_crosses_the_bridge_with_its_code_and_its_key() {
    let error = phomu_wasm::session::snapshot(4242).expect_err("the handle is unknown");
    assert_eq!(error.code, 1001);
    assert_eq!(error.message_key, "errors.invalidConfiguration");
}
