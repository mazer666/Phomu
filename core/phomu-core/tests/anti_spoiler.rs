//! The anti-spoiler contract.
//!
//! WHY: the anti-spoiler guarantee is a product promise (CORE-005,
//! MEDIA-015). The base makes it structural: the question phase hands out a
//! view model without a field that could carry the solution, and the
//! persistable set contains no field of the song (C-1, C-4).

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` and `unwrap` are the idiomatic way to do that in a
// test; the ban of the workspace lints applies to the production code, not
// to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

mod common;

use common::{artist_pool, players, song};
use phomu_core::facade::{
    FieldId, GameConfig, GameMode, PERSISTABLE_FIELDS, Prompt, RoundView, Session, SongSource,
};

fn session_for(mode: GameMode) -> Session {
    let config = GameConfig {
        selected_modes: vec![mode],
        ..GameConfig::default()
    };
    Session::new(config, players(2), Vec::new(), artist_pool(), 3, 1_000)
        .expect("a session is created")
}

fn question_payload(mode: GameMode) -> String {
    let mut session = session_for(mode);
    session.start_game(1_000).expect("the game starts");
    let view = session
        .draw_song(
            song("s1", "Der Geheime Titel", "Die Geheime Band", 1985),
            SongSource::Random,
        )
        .expect("the song is drawn");
    view.payload_text()
}

#[test]
fn the_question_payload_never_contains_the_title_or_the_year() {
    for mode in GameMode::PLAYABLE {
        if mode.reveals_identity() {
            // The Vibe-Check asks for the mood of a song whose identity is
            // visible — the exception is declared by the mode (C-6).
            continue;
        }
        let payload = question_payload(*mode);
        assert!(
            !payload.contains("Der Geheime Titel"),
            "the mode {mode:?} leaks the title"
        );
        assert!(
            !payload.contains("1985"),
            "the mode {mode:?} leaks the year"
        );
    }
}

#[test]
fn the_question_payload_hides_the_artist_in_every_mode_but_the_declared_ones() {
    for mode in GameMode::PLAYABLE {
        let payload = question_payload(*mode);
        let discloses = mode.reveals_identity() || *mode == GameMode::CoverConfusion;
        if discloses {
            continue;
        }
        assert!(
            !payload.contains("Die Geheime Band"),
            "the mode {mode:?} leaks the artist"
        );
    }
}

#[test]
fn the_vibe_check_declares_that_it_discloses_the_identity() {
    let payload = question_payload(GameMode::VibeCheck);
    assert!(payload.contains("Die Geheime Band"));
    assert!(GameMode::VibeCheck.reveals_identity());
}

#[test]
fn the_question_view_has_no_field_for_the_solution() {
    let mut session = session_for(GameMode::Timeline);
    session.start_game(1_000).expect("the game starts");
    let view = session
        .draw_song(
            song("s1", "Der Geheime Titel", "Die Geheime Band", 1985),
            SongSource::Random,
        )
        .expect("the song is drawn");
    let question = match view {
        RoundView::Question(question) => question,
        _ => unreachable!("the drawn song opens the question phase"),
    };
    assert!(question.prompt.identity().is_none());
    match question.prompt {
        Prompt::Hidden { hints, options } => {
            for hint in hints {
                assert!(!hint.contains("Die Geheime Band"));
            }
            for option in options {
                assert!(!option.contains("Der Geheime Titel"));
            }
        }
        Prompt::IdentityDisclosed { .. } => {
            unreachable!("the timeline mode does not disclose the identity")
        }
    }
}

#[test]
fn the_question_of_a_timeline_carries_no_slot_of_the_answer() {
    // WHY this test exists: the question of a Timeline round once carried
    // the slots in which the song may be placed. Those slots depend on the
    // year of the song — and the year of the song is the answer of the
    // round. The payload of the question therefore handed out the solution.
    //
    // The test does not look at the *form* of the payload (it does not
    // search for a year as a text) — it compares the payload with the
    // answer itself. That is the difference: a number that encodes the
    // answer slips through a search for texts.
    let mut session = session_for(GameMode::Timeline);
    session.start_game(1_000).expect("the game starts");
    session
        .init_timeline(vec![1970, 1980, 1990])
        .expect("the timeline has its years");
    let view = session
        .draw_song(
            song("s1", "Der Geheime Titel", "Die Geheime Band", 1985),
            SongSource::Random,
        )
        .expect("the song is drawn");
    let question = match view {
        RoundView::Question(question) => question,
        _ => unreachable!("the drawn song opens the question phase"),
    };

    // The slots in which the song would be right — the answer of the round.
    let answer = phomu_core::facade::valid_slots(1985, &[1970, 1980, 1990]);
    assert_eq!(
        answer,
        [2].into_iter().collect::<std::collections::BTreeSet<_>>(),
        "the song of 1985 belongs into the slot between 1980 and 1990"
    );

    // The payload of the question may not name any of them.
    let payload = RoundView::Question(question).payload_text();
    for slot in &answer {
        assert!(
            !payload.contains(&format!("slot={slot}")),
            "the question of the round names the slot {slot} of the answer"
        );
    }
    // The years on the timeline are known to the players — they are on the
    // screen. They may be in the payload.
    assert!(payload.contains("1980"));
}

#[test]
fn the_reveal_payload_carries_the_solution() {
    let mut session = session_for(GameMode::Timeline);
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(
            song("s1", "Der Geheime Titel", "Die Geheime Band", 1985),
            SongSource::Random,
        )
        .expect("the song is drawn");
    session
        .submit_answer(&phomu_core::facade::ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    let view = session.reveal().expect("the reveal is permitted");
    let payload = view.payload_text();
    assert!(payload.contains("Der Geheime Titel"));
    assert!(payload.contains("Die Geheime Band"));
    assert!(payload.contains("1985"));
}

#[test]
fn the_hints_of_the_question_are_censored() {
    let mut entry = song("s1", "Der Geheime Titel", "Die Geheime Band", 1985);
    if let Some(hint) = entry.hints.first_mut() {
        *hint = "Die Geheime Band sang das".to_string();
    }
    let mut session = session_for(GameMode::HintMaster);
    session.start_game(1_000).expect("the game starts");
    let view = session
        .draw_song(entry, SongSource::Random)
        .expect("the song is drawn");
    let question = match view {
        RoundView::Question(question) => question,
        _ => unreachable!("the drawn song opens the question phase"),
    };
    for hint in question.prompt.hints() {
        assert!(
            !hint.contains("Die Geheime Band"),
            "the hint is not censored"
        );
    }
}

#[test]
fn the_persistable_set_contains_no_field_of_the_song() {
    for field in PERSISTABLE_FIELDS {
        let name = field.as_str();
        assert!(
            !name.contains("song") && !name.contains("answer") && !name.contains("phase"),
            "{name} must not be persistable"
        );
    }
}

#[test]
fn the_persistable_set_holds_the_expected_fields() {
    let names: Vec<&str> = PERSISTABLE_FIELDS.iter().map(|f| f.as_str()).collect();
    assert!(names.contains(&"players"));
    assert!(names.contains(&"teams"));
    assert!(names.contains(&"config"));
    assert!(names.contains(&"timelineYears"));
    assert!(!names.contains(&"currentSong"));
    assert!(!names.contains(&"roundHistory"));
    assert!(PERSISTABLE_FIELDS.contains(&FieldId::CurrentRound));
}
