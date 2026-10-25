//! The round trip through the bridge.
//!
//! WHAT: a whole round, played through the exported functions of the bridge:
//! the catalogue is opened, a session is created, the game starts, a song is
//! drawn, an answer is submitted, the answers are locked in and the solution
//! is revealed.
//!
//! WHY: a bridge that has never carried a session is a guess. The test plays
//! one (docs/design/BUILD-CONTRACT.md § 4.2).
//!
//! EXAMPLE:
//!
//! ```text
//! cargo test -p phomu-ffi
//! ```

// WHY the override of the workspace lints: a test has to fail loudly. The
// lints that forbid `unwrap`, `expect` and the indexing exist for the code
// of the product, where a panic is a defect; in a test they are the way a
// failure is reported.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![allow(clippy::panic)]

use phomu_ffi::answer::PhomuAnswer;
use phomu_ffi::dto::{PhomuCapabilities, PhomuGameConfig, PhomuPlayer, PhomuTeam};
use phomu_ffi::media::{phomu_media_plan, phomu_message_key};
use phomu_ffi::session::{
    phomu_catalog_open, phomu_catalog_packs, phomu_catalog_songs, phomu_session_answer,
    phomu_session_draw, phomu_session_end, phomu_session_new, phomu_session_next_round,
    phomu_session_reveal, phomu_session_snapshot, phomu_session_start,
};
use phomu_ffi::surface::{EXPORTED_FUNCTIONS, surface_fingerprint};
use phomu_ffi::version::{
    phomu_abi_accepts, phomu_abi_version, phomu_abi_versions, phomu_capabilities,
};
use phomu_ffi::view::PhomuRoundView;

/// A catalogue with two songs.
const CATALOGUE: &str = r#"{
  "songs": [
    {
      "id": "song-one",
      "title": "Titel EINS",
      "artist": "Künstler EINS",
      "year": 1985,
      "country": "DE",
      "genre": "Pop",
      "difficulty": "easy",
      "mood": ["Epic"],
      "packs": ["Rock Anthems"],
      "hints": ["[XXX] sang in the eighties"],
      "supportedModes": ["timeline"],
      "isQRCompatible": true,
      "links": { "youtube": "https://www.youtube.com/watch?v=aaaaaaaaaaa" }
    },
    {
      "id": "song-two",
      "title": "Titel ZWEI",
      "artist": "Künstler ZWEI",
      "year": 1991,
      "country": "DE",
      "genre": "Pop",
      "difficulty": "medium",
      "mood": ["Epic"],
      "packs": ["Rock Anthems"],
      "hints": ["[XXX] sang at the turn of the decade"],
      "supportedModes": ["timeline"],
      "isQRCompatible": false,
      "links": { "youtube": "https://www.youtube.com/watch?v=bbbbbbbbbbb" }
    }
  ],
  "packs": {
    "Rock Anthems": { "pack": "Rock Anthems" }
  }
}"#;

/// The two players of the session.
fn players() -> Vec<PhomuPlayer> {
    vec![
        PhomuPlayer {
            id: "p1".to_string(),
            name: "Ada".to_string(),
            team_id: None,
            is_spectator: false,
            is_pilot: true,
            color: None,
            avatar: None,
        },
        PhomuPlayer {
            id: "p2".to_string(),
            name: "Bob".to_string(),
            team_id: None,
            is_spectator: false,
            is_pilot: false,
            color: None,
            avatar: None,
        },
    ]
}

/// The teams of the session.
fn teams() -> Vec<PhomuTeam> {
    Vec::new()
}

#[test]
fn the_abi_version_is_part_of_the_surface() {
    assert_eq!(phomu_abi_version(), "1.1.0");
    assert_eq!(phomu_abi_versions(), vec!["1.1.0".to_string()]);
    assert!(phomu_abi_accepts(1, 0, 0, 1, 99, 0));
    assert!(!phomu_abi_accepts(2, 0, 0, 2, 99, 0));
    assert!(!phomu_abi_accepts(0, 1, 0, 0, 99, 0));
}

#[test]
fn the_surface_fingerprint_is_stable() {
    // WHY a number: the fingerprint changes with every symbol of the
    // surface. A change of the surface therefore has to come with a change
    // of this number and with a bump of the ABI version
    // (docs/adr/ADR-0008-abi-version-and-the-exported-surface.md).
    assert_eq!(surface_fingerprint(), 0x2e486765000e97b0);
    assert!(EXPORTED_FUNCTIONS.contains(&"phomu_abi_version"));
}

#[test]
fn the_capabilities_of_the_shell_are_reduced_to_what_the_base_knows() {
    let shell = PhomuCapabilities {
        can_play_preview_audio: true,
        can_embed_youtube: true,
        can_embed_spotify: false,
        can_embed_amazon: false,
        can_open_deep_links: true,
        can_play_in_background: false,
    };
    let effective = phomu_capabilities(shell);
    assert!(effective.can_play_preview_audio);
    assert!(effective.can_embed_youtube);
    assert!(!effective.can_embed_spotify);
    assert!(effective.can_open_deep_links);
}

#[test]
fn the_catalogue_crosses_the_bridge() {
    let handle = phomu_catalog_open(CATALOGUE.to_string()).expect("the catalogue is read");
    let packs = phomu_catalog_packs(handle).expect("the packs are listed");
    assert_eq!(packs.len(), 1);
    assert_eq!(
        packs.first().map(|pack| pack.id.as_str()),
        Some("Rock Anthems")
    );
    assert_eq!(packs.first().map(|pack| pack.song_count), Some(2));

    let songs = phomu_catalog_songs(handle, Vec::new()).expect("the songs are listed");
    assert_eq!(songs.len(), 2);
    // WHY no title: the summary is what a shell shows before the reveal.
    assert!(songs.iter().all(|song| !song.id.is_empty()));
}

#[test]
fn a_round_runs_over_the_bridge() {
    let catalogue = phomu_catalog_open(CATALOGUE.to_string()).expect("the catalogue is read");
    let handle = phomu_session_new(
        PhomuGameConfig::default(),
        players(),
        teams(),
        Some(catalogue),
        42,
        0,
    )
    .expect("the session is created");

    let drawing = phomu_session_start(handle, 0).expect("the game starts");
    assert_eq!(drawing.phase(), "drawing");

    let question = phomu_session_draw(handle, "random".to_string(), None).expect("a song is drawn");
    assert_eq!(question.phase(), "question");

    // The question phase carries no identity of the song.
    let PhomuRoundView::Question { hints, options, .. } = &question else {
        panic!("the question phase answers with a question view");
    };
    assert_eq!(hints.len(), 1);
    assert!(options.is_empty());
    let payload = format!("{question:?}");
    assert!(!payload.contains("Titel EINS"));
    assert!(!payload.contains("Titel ZWEI"));
    assert!(!payload.contains("Künstler"));

    let answer = PhomuAnswer {
        mode: "timeline".to_string(),
        timeline_slot: Some(0),
        ..PhomuAnswer::default()
    };
    let score = phomu_session_answer(handle, answer, None).expect("the answer is scored");
    assert_eq!(score.round_number, 1);

    // The answer of the pilot locks the round in, so that the reveal is
    // permitted — and the reveal hands out the solution.
    let reveal = phomu_session_reveal(handle).expect("the solution is released");
    assert!(!reveal.title.is_empty());

    let snapshot = phomu_session_snapshot(handle).expect("the snapshot is read");
    assert_eq!(snapshot.round_number, 1);
    assert_eq!(snapshot.players.len(), 2);
    assert_eq!(snapshot.phase, "reveal");

    let next = phomu_session_next_round(handle, 0).expect("the next round begins");
    assert_eq!(next.phase(), "drawing");
}

#[test]
fn the_reveal_hands_out_the_solution() {
    let catalogue = phomu_catalog_open(CATALOGUE.to_string()).expect("the catalogue is read");
    let handle = phomu_session_new(
        PhomuGameConfig::default(),
        players(),
        teams(),
        Some(catalogue),
        7,
        0,
    )
    .expect("the session is created");
    phomu_session_start(handle, 0).expect("the game starts");
    phomu_session_draw(handle, "random".to_string(), None).expect("a song is drawn");

    let answer = PhomuAnswer {
        mode: "timeline".to_string(),
        timeline_slot: Some(0),
        ..PhomuAnswer::default()
    };
    phomu_session_answer(handle, answer, None).expect("the answer is scored");

    // The answer of the pilot locks the round in, so that the reveal is
    // permitted.
    let reveal = phomu_session_reveal(handle).expect("the solution is released");
    assert_eq!(reveal.round_number, 1);
    assert!(!reveal.title.is_empty());
    assert!(!reveal.artist.is_empty());
}

#[test]
fn a_failure_crosses_the_bridge_with_its_code_and_its_key() {
    let handle = phomu_session_new(PhomuGameConfig::default(), players(), teams(), None, 1, 0)
        .expect("the session is created");

    // The reveal of a round that has not been played fails with the code of
    // the taxonomy, the i18n key and the context — not with a sentence.
    let error = phomu_session_reveal(handle).expect_err("the reveal is refused");
    assert_eq!(error.code(), 1102);
    assert_eq!(error.message_key(), "errors.answersNotLocked");
    assert!(error.context().contains_key("phase"));
}

#[test]
fn the_media_plan_crosses_the_bridge() {
    let catalogue = phomu_catalog_open(CATALOGUE.to_string()).expect("the catalogue is read");
    let handle = phomu_session_new(
        PhomuGameConfig::default(),
        players(),
        teams(),
        Some(catalogue),
        3,
        0,
    )
    .expect("the session is created");
    phomu_session_start(handle, 0).expect("the game starts");
    phomu_session_draw(handle, "random".to_string(), None).expect("a song is drawn");

    let plan = phomu_media_plan(handle).expect("the plan is built");
    assert!(!plan.candidates.is_empty());
    assert_eq!(
        plan.candidates.first().map(|c| c.kind.as_str()),
        Some("embed")
    );
}

#[test]
fn the_message_key_crosses_the_bridge() {
    assert_eq!(
        phomu_message_key("answer-correct".to_string()),
        "game.feedback.correct"
    );
    assert_eq!(phomu_message_key("does-not-exist".to_string()), "");
}

#[test]
fn the_game_can_be_ended() {
    let handle = phomu_session_new(PhomuGameConfig::default(), players(), teams(), None, 5, 0)
        .expect("the session is created");
    phomu_session_start(handle, 0).expect("the game starts");
    let over = phomu_session_end(handle, Some("p1".to_string())).expect("the game ends");
    assert_eq!(over.winner_id.as_deref(), Some("p1"));
    assert_eq!(over.players.len(), 2);
}
