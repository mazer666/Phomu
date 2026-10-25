//! The tests of the module.
//!
//! WHY: the rules of the module are the part of the product a group of
//! friends argues about; they must be the same on every platform.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use super::{GameMode, ModeAnswer, ModeContext, deterministic_shuffle, evaluate_mode_answer};
use crate::modes::KnewWhat;
use phomu_catalog::{Difficulty, Links, Song};

fn song() -> Song {
    Song {
        id: "s".to_string(),
        title: "Titel".to_string(),
        artist: "Künstler".to_string(),
        year: 1985,
        country: "DE".to_string(),
        genre: "Pop".to_string(),
        cover_url: None,
        difficulty: Difficulty::Easy,
        mood: vec!["Chill".to_string()],
        packs: vec!["Pack".to_string()],
        hints: vec!["a".to_string(); 5],
        hint_evidence: None,
        lyrics: None,
        is_one_hit_wonder: true,
        cover_mode: None,
        preview_timestamp: None,
        supported_modes: vec!["timeline".to_string()],
        is_qr_compatible: true,
        links: Links {
            youtube: "abcdefghijk".to_string(),
            ..Links::default()
        },
    }
}

#[test]
fn the_mode_identifiers_round_trip() {
    for mode in GameMode::ALL {
        assert_eq!(GameMode::from_str(mode.as_str()), Some(*mode));
    }
    assert_eq!(GameMode::from_str("shifting"), None);
}

#[test]
fn there_are_six_modes() {
    assert_eq!(GameMode::ALL.len(), 6);
}

#[test]
fn only_the_vibe_check_discloses_the_identity() {
    for mode in GameMode::ALL {
        assert_eq!(mode.reveals_identity(), *mode == GameMode::VibeCheck);
    }
}

#[test]
fn only_the_timeline_measures_the_answer_time() {
    for mode in GameMode::ALL {
        assert_eq!(mode.measures_answer_time(), *mode == GameMode::Timeline);
    }
}

#[test]
fn a_vibe_check_answer_is_worth_two_points() {
    let result = evaluate_mode_answer(
        GameMode::VibeCheck,
        &ModeAnswer::VibeCheck {
            mood: "Chill".to_string(),
            cheat_used: false,
        },
        &song(),
        &ModeContext::new(&[], 5),
    );
    let outcome = result.unwrap_or(super::ModeOutcome::incorrect());
    assert!(outcome.is_correct);
    assert_eq!(outcome.points, 2);
}

#[test]
fn a_wrong_answer_is_worth_nothing() {
    let result = evaluate_mode_answer(
        GameMode::Survivor,
        &ModeAnswer::Survivor {
            guessed_one_hit: false,
        },
        &song(),
        &ModeContext::new(&[], 5),
    );
    let outcome = result.unwrap_or(super::ModeOutcome::incorrect());
    assert!(!outcome.is_correct);
    assert_eq!(outcome.points, 0);
}

#[test]
fn an_answer_of_the_wrong_mode_is_refused() {
    let result = evaluate_mode_answer(
        GameMode::Survivor,
        &ModeAnswer::Lyrics { picked_fake: true },
        &song(),
        &ModeContext::new(&[], 5),
    );
    assert!(result.is_err());
}

#[test]
fn the_hint_master_halves_the_points_for_a_partial_answer() {
    let result = evaluate_mode_answer(
        GameMode::HintMaster,
        &ModeAnswer::HintMaster {
            level: 4,
            knew: KnewWhat::Artist,
        },
        &song(),
        &ModeContext::new(&[], 5),
    );
    let outcome = result.unwrap_or(super::ModeOutcome::incorrect());
    assert!(outcome.is_correct);
    assert_eq!(outcome.points, 1);
}

#[test]
fn the_shuffle_is_deterministic() {
    let items = vec!["a", "b", "c", "d"];
    assert_eq!(
        deterministic_shuffle(&items, 7),
        deterministic_shuffle(&items, 7)
    );
    assert_eq!(deterministic_shuffle(&items, 7).len(), 4);
}
