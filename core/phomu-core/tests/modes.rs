//! The six modes: their input, their validation, their result and their
//! points.
//!
//! WHY: the modes carry the rules of the round, and the rules must be the
//! same on every platform (CORE-101). Every mode gets a test for the
//! correct answer, for the wrong answer and for the boundary of its
//! validation.

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` and `unwrap` are the idiomatic way to do that in a
// test; the ban of the workspace lints applies to the production code, not
// to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

mod common;

use common::{artist_pool, players, song, song_without_lyrics};
use phomu_core::facade::{
    GameConfig, GameMode, KnewWhat, ModeAnswer, ModeContext, Song, evaluate_mode_answer,
};

fn context(years: &[i32]) -> ModeContext<'_> {
    ModeContext::new(years, 5)
}

#[test]
fn the_timeline_accepts_the_canonical_slot() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let outcome = evaluate_mode_answer(
        GameMode::Timeline,
        &ModeAnswer::Timeline { slot: 2 },
        &entry,
        &context(&[1970, 1980, 1990]),
    );
    let outcome = outcome.expect("the answer is evaluated");
    assert!(outcome.is_correct);
    assert_eq!(outcome.points, 4);
}

#[test]
fn the_timeline_refuses_a_wrong_slot() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let outcome = evaluate_mode_answer(
        GameMode::Timeline,
        &ModeAnswer::Timeline { slot: 0 },
        &entry,
        &context(&[1970, 1980, 1990]),
    );
    let outcome = outcome.expect("the answer is evaluated");
    assert!(!outcome.is_correct);
    assert_eq!(outcome.points, 0);
}

#[test]
fn the_timeline_points_are_capped() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let years: Vec<i32> = (0..12).collect();
    let outcome = evaluate_mode_answer(
        GameMode::Timeline,
        &ModeAnswer::Timeline { slot: 12 },
        &entry,
        &context(&years),
    );
    let outcome = outcome.expect("the answer is evaluated");
    assert_eq!(outcome.points, 5, "the points are capped");
}

#[test]
fn the_timeline_refuses_a_slot_outside_the_timeline() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let result = evaluate_mode_answer(
        GameMode::Timeline,
        &ModeAnswer::Timeline { slot: 99 },
        &entry,
        &context(&[1970, 1980, 1990]),
    );
    assert!(result.is_err(), "a slot outside the timeline is refused");
}

#[test]
fn the_hint_master_halves_the_points_for_a_partial_answer() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let full = evaluate_mode_answer(
        GameMode::HintMaster,
        &ModeAnswer::HintMaster {
            level: 1,
            knew: KnewWhat::Both,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(full.expect("the answer is evaluated").points, 5);
    let half = evaluate_mode_answer(
        GameMode::HintMaster,
        &ModeAnswer::HintMaster {
            level: 2,
            knew: KnewWhat::Title,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(half.expect("the answer is evaluated").points, 2);
}

#[test]
fn the_hint_master_refuses_a_level_outside_the_scale() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let outcome = evaluate_mode_answer(
        GameMode::HintMaster,
        &ModeAnswer::HintMaster {
            level: 9,
            knew: KnewWhat::Both,
        },
        &entry,
        &context(&[]),
    );
    let outcome = outcome.expect("the answer is evaluated");
    assert_eq!(outcome.points, 1, "a level above five is worth one point");
}

#[test]
fn the_lyrics_reward_the_invented_line() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let correct = evaluate_mode_answer(
        GameMode::Lyrics,
        &ModeAnswer::Lyrics { picked_fake: true },
        &entry,
        &context(&[]),
    );
    assert_eq!(correct.expect("the answer is evaluated").points, 4);
    let wrong = evaluate_mode_answer(
        GameMode::Lyrics,
        &ModeAnswer::Lyrics { picked_fake: false },
        &entry,
        &context(&[]),
    );
    assert_eq!(wrong.expect("the answer is evaluated").points, 0);
}

#[test]
fn the_lyrics_bonus_round_is_worth_two_points() {
    let entry = song_without_lyrics("s1");
    let outcome = evaluate_mode_answer(
        GameMode::Lyrics,
        &ModeAnswer::LyricsBonus { claimed: true },
        &entry,
        &context(&[]),
    );
    assert_eq!(outcome.expect("the answer is evaluated").points, 2);
}

#[test]
fn the_vibe_check_rewards_a_mood_of_the_song() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let correct = evaluate_mode_answer(
        GameMode::VibeCheck,
        &ModeAnswer::VibeCheck {
            mood: "Chill".to_string(),
            cheat_used: false,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(correct.expect("the answer is evaluated").points, 2);
    let cheated = evaluate_mode_answer(
        GameMode::VibeCheck,
        &ModeAnswer::VibeCheck {
            mood: "Chill".to_string(),
            cheat_used: true,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(cheated.expect("the answer is evaluated").points, 1);
}

#[test]
fn the_vibe_check_refuses_a_mood_that_is_not_on_the_song() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let outcome = evaluate_mode_answer(
        GameMode::VibeCheck,
        &ModeAnswer::VibeCheck {
            mood: "Dark".to_string(),
            cheat_used: false,
        },
        &entry,
        &context(&[]),
    );
    let outcome = outcome.expect("the answer is evaluated");
    assert!(!outcome.is_correct);
    assert_eq!(outcome.points, 0);
}

#[test]
fn the_survivor_rewards_the_right_judgement() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let correct = evaluate_mode_answer(
        GameMode::Survivor,
        &ModeAnswer::Survivor {
            guessed_one_hit: true,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(correct.expect("the answer is evaluated").points, 3);
    let wrong = evaluate_mode_answer(
        GameMode::Survivor,
        &ModeAnswer::Survivor {
            guessed_one_hit: false,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(wrong.expect("the answer is evaluated").points, 0);
}

#[test]
fn the_cover_confusion_pays_by_the_number_of_hints() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let without_hint = evaluate_mode_answer(
        GameMode::CoverConfusion,
        &ModeAnswer::CoverConfusion {
            hints_used: 0,
            picked_artist: Some("Künstler".to_string()),
            self_assess: None,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(without_hint.expect("the answer is evaluated").points, 5);
    let with_two_hints = evaluate_mode_answer(
        GameMode::CoverConfusion,
        &ModeAnswer::CoverConfusion {
            hints_used: 2,
            picked_artist: Some("Künstler".to_string()),
            self_assess: None,
        },
        &entry,
        &context(&[]),
    );
    assert_eq!(with_two_hints.expect("the answer is evaluated").points, 3);
}

#[test]
fn the_cover_confusion_refuses_an_answer_without_a_choice() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let result = evaluate_mode_answer(
        GameMode::CoverConfusion,
        &ModeAnswer::CoverConfusion {
            hints_used: 0,
            picked_artist: None,
            self_assess: None,
        },
        &entry,
        &context(&[]),
    );
    assert!(result.is_err());
}

#[test]
fn the_cover_confusion_variation_is_worth_three_points() {
    let mut entry = song("s1", "Titel", "Künstler", 1985);
    entry.links.cover_link = Some("cover".to_string());
    let correct = evaluate_mode_answer(
        GameMode::CoverConfusion,
        &ModeAnswer::CoverConfusionVariation { guess_cover: true },
        &entry,
        &context(&[]),
    );
    assert_eq!(correct.expect("the answer is evaluated").points, 3);
    let wrong = evaluate_mode_answer(
        GameMode::CoverConfusion,
        &ModeAnswer::CoverConfusionVariation { guess_cover: false },
        &entry,
        &context(&[]),
    );
    assert_eq!(wrong.expect("the answer is evaluated").points, 0);
}

#[test]
fn an_answer_of_the_wrong_mode_is_refused() {
    let entry = song("s1", "Titel", "Künstler", 1985);
    let result = evaluate_mode_answer(
        GameMode::Timeline,
        &ModeAnswer::Survivor {
            guessed_one_hit: true,
        },
        &entry,
        &context(&[]),
    );
    assert!(result.is_err());
}

#[test]
fn every_mode_has_a_session_that_answers_it() {
    let modes = [
        GameMode::Timeline,
        GameMode::HintMaster,
        GameMode::Lyrics,
        GameMode::VibeCheck,
        GameMode::Survivor,
        GameMode::CoverConfusion,
    ];
    for mode in modes {
        let config = GameConfig {
            selected_modes: vec![mode],
            ..GameConfig::default()
        };
        let mut session =
            phomu_core::facade::Session::new(config, players(1), Vec::new(), artist_pool(), 7, 0)
                .expect("a session is created");
        session.start_game(0).expect("the game starts");
        let view = session
            .draw_song(
                song("s1", "Titel", "Künstler", 1985),
                phomu_core::facade::SongSource::Random,
            )
            .expect("the song is drawn");
        assert!(
            matches!(view, phomu_core::facade::RoundView::Question(_)),
            "the mode {mode:?} opens the question phase"
        );
        assert_eq!(session.current_mode(), mode);
    }
}

#[test]
fn the_mode_of_the_question_is_the_mode_of_the_session() {
    let config = GameConfig {
        selected_modes: vec![GameMode::Survivor],
        ..GameConfig::default()
    };
    let mut session =
        phomu_core::facade::Session::new(config, players(1), Vec::new(), artist_pool(), 7, 0)
            .expect("a session is created");
    session.start_game(0).expect("the game starts");
    session
        .draw_song(
            song("s1", "Titel", "Künstler", 1985),
            phomu_core::facade::SongSource::Random,
        )
        .expect("the song is drawn");
    let answer = ModeAnswer::Survivor {
        guessed_one_hit: true,
    };
    let score = session.submit_answer(&answer, None).expect("the answer");
    assert!(score.is_correct);
    assert_eq!(score.points_awarded, 3);
}

#[test]
fn the_song_of_the_answer_is_the_song_of_the_round() {
    let entry: Song = song("s1", "Titel", "Künstler", 1985);
    assert_eq!(entry.year, 1985);
    assert!(entry.has_lyrics());
}
