//! The round trip through the WebAssembly bridge.
//!
//! WHAT: a whole round, played through the functions of the bridge.
//!
//! WHY the web shell is a shell like every other shell; it reaches the
//! base through this module. A module that has never carried a session is a
//! guess (docs/design/BUILD-CONTRACT.md § 4.2).
//!
//! EXAMPLE:
//!
//! ```text
//! cargo test -p phomu-wasm
//! ```
//!
//! WHY the override of the workspace lints: a test has to fail loudly. The
//! lints that forbid `unwrap`, `expect` and the indexing exist for the code
//! of the product, where a panic is a defect; in a test they are the way a
//! failure is reported.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![allow(clippy::panic)]

use phomu_wasm::session::{draw_song, new_session, next_round, reveal, start_game};
use phomu_wasm::session_answers::{submit_answer, submit_choice};
use serde_json::{Value, json};

/// The catalogue of the test.
const CATALOGUE: &str = r#"{"songs":[{"id":"song-one","title":"Titel EINS","artist":"Künstler EINS","year":1985,"country":"DE","genre":"Pop","difficulty":"easy","mood":["Epic"],"packs":["Rock Anthems"],"hints":["[XXX] sang in the eighties"],"supportedModes":["timeline"],"isQRCompatible":true,"links":{"youtube":"https://www.youtube.com/watch?v=aaaaaaaaaaa"}}]}"#;

/// A catalogue with lyric lines — the Lyrics Labyrinth needs them.
const CATALOGUE_WITH_LYRICS: &str = r#"{"songs":[{"id":"song-two","title":"Titel ZWEI","artist":"Künstler ZWEI","year":1991,"country":"DE","genre":"Pop","difficulty":"easy","mood":["Epic"],"packs":["Rock Anthems"],"hints":["[XXX] sang in the nineties"],"lyrics":{"real":["echt eins","echt zwei","echt drei"],"fake":"erfunden"},"supportedModes":["lyrics"],"isQRCompatible":true,"links":{"youtube":"https://www.youtube.com/watch?v=bbbbbbbbbbb"}}]}"#;

/// The players of the session.
fn players() -> Vec<Value> {
    vec![
        json!({ "id": "p1", "name": "Ada", "isPilot": true }),
        json!({ "id": "p2", "name": "Bob" }),
    ]
}

/// Compresses a catalogue the way the shell does.
fn compress(catalogue: &str) -> Vec<u8> {
    use std::io::Write;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::best());
    encoder.write_all(catalogue.as_bytes()).unwrap();
    encoder.finish().unwrap()
}

#[test]
fn the_version_is_part_of_the_module() {
    assert_eq!(phomu_wasm::exports::phomu_abi_version(), "1.1.0");
    assert_eq!(
        phomu_wasm::exports::phomu_abi_versions(),
        vec!["1.1.0".to_string()]
    );
}

#[test]
fn a_round_runs_over_the_wasm_bridge() {
    let catalogue = phomu_wasm::catalogue_exports::phomu_catalog_open_json(CATALOGUE)
        .expect("the catalogue is read");
    let songs = phomu_wasm::catalogue_exports::phomu_catalog_songs(catalogue)
        .expect("the songs are listed");
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
    assert!(!question.to_string().contains("1985"));

    let answer = phomu_core::facade::ModeAnswer::Timeline { slot: 0 };
    let score = submit_answer(handle, &answer, None).expect("the answer is scored");
    assert_eq!(score["roundNumber"], 1);

    let reveal = reveal(handle).expect("the solution is released");
    assert_eq!(reveal["phase"], "reveal");
    assert_eq!(reveal["title"], "Titel EINS");

    next_round(handle, 0).expect("the next round begins");
}

#[test]
fn the_compressed_catalogue_is_read_by_the_bridge() {
    let compressed = compress(CATALOGUE);
    let catalogue = phomu_wasm::catalogue_exports::phomu_catalog_open(&compressed)
        .expect("the catalogue is read");
    let songs = phomu_wasm::catalogue_exports::phomu_catalog_songs(catalogue)
        .expect("the songs are listed");
    assert_eq!(songs.len(), 1);
}

#[test]
fn the_question_payload_of_the_lyrics_mode_names_no_line() {
    let compressed = compress(CATALOGUE_WITH_LYRICS);
    let catalogue = phomu_wasm::catalogue_exports::phomu_catalog_open(&compressed)
        .expect("the catalogue is read");
    let config = json!({ "selectedModes": ["lyrics"] });
    let handle = new_session(&config, &players(), &[], Some(catalogue), 7, 0)
        .expect("the session is created");
    start_game(handle, 0).expect("the game starts");
    let question = draw_song(handle, "random").expect("a song is drawn");

    // The four options are the question.
    assert_eq!(question["options"].as_array().map(Vec::len), Some(4));
    // Every option is a line of text — none of them carries a marking that
    // would name the invented one.
    let options = question["options"]
        .as_array()
        .expect("the options are a list");
    for option in options {
        assert!(option.is_string(), "an option is a line of text");
    }
    let payload = question.to_string();
    assert!(!payload.contains("isFake"));
    assert!(!payload.contains("invented"));
    assert!(!payload.contains("fake"));
    // The payload names neither the song nor the year.
    assert!(!payload.contains("Titel ZWEI"));
    assert!(!payload.contains("Künstler ZWEI"));
    assert!(!payload.contains("1991"));
}

#[test]
fn the_bridge_decides_which_line_was_the_invented_one() {
    let compressed = compress(CATALOGUE_WITH_LYRICS);
    let catalogue = phomu_wasm::catalogue_exports::phomu_catalog_open(&compressed)
        .expect("the catalogue is read");
    let config = json!({ "selectedModes": ["lyrics"] });
    let handle = new_session(&config, &players(), &[], Some(catalogue), 7, 0)
        .expect("the session is created");
    start_game(handle, 0).expect("the game starts");
    draw_song(handle, "random").expect("a song is drawn");

    // The shell sends the line the player picked — it does not know which one
    // was invented.
    let correct = submit_choice(
        handle,
        &json!({ "kind": "lyrics", "line": "erfunden" }),
        None,
    )
    .expect("the answer is scored");
    assert_eq!(correct["score"]["isCorrect"], true);
    assert_eq!(correct["score"]["pointsAwarded"], 4);
    // The feedback names the invented line — after the answer.
    assert_eq!(correct["feedback"]["detail"]["inventedLine"], "erfunden");
}

#[test]
fn a_real_line_is_worth_nothing() {
    let compressed = compress(CATALOGUE_WITH_LYRICS);
    let catalogue = phomu_wasm::catalogue_exports::phomu_catalog_open(&compressed)
        .expect("the catalogue is read");
    let config = json!({ "selectedModes": ["lyrics"] });
    let handle = new_session(&config, &players(), &[], Some(catalogue), 7, 0)
        .expect("the session is created");
    start_game(handle, 0).expect("the game starts");
    draw_song(handle, "random").expect("a song is drawn");

    let wrong = submit_choice(
        handle,
        &json!({ "kind": "lyrics", "line": "echt eins" }),
        None,
    )
    .expect("the answer is scored");
    assert_eq!(wrong["score"]["isCorrect"], false);
    assert_eq!(wrong["score"]["pointsAwarded"], 0);
}

#[test]
fn a_failure_crosses_the_bridge_with_its_code_and_its_key() {
    let error = phomu_wasm::session::snapshot(4242).expect_err("the handle is unknown");
    assert_eq!(error.code, 1001);
    assert_eq!(error.message_key, "errors.invalidConfiguration");
}
