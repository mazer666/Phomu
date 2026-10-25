//! The tests of the selection rules of the catalogue.
//!
//! WHY: the draw decides which song the players play; the order of the
//! filters and the fallback chain are therefore rules that have to be
//! proven, not conventions.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use crate::model::{Difficulty, Links, Lyrics, Song};

use super::{Fallback, SelectionCriteria, normalize_pack_ids, select_song};

fn song(id: &str, packs: &[&str], difficulty: Difficulty, mode: &str) -> Song {
    Song {
        id: id.to_string(),
        title: format!("Title {id}"),
        artist: format!("Artist {id}"),
        year: 1990,
        country: "DE".to_string(),
        genre: "Pop".to_string(),
        cover_url: None,
        difficulty,
        mood: vec!["Chill".to_string()],
        packs: packs.iter().map(|p| (*p).to_string()).collect(),
        hints: vec!["a".to_string(); 5],
        hint_evidence: None,
        lyrics: Some(Lyrics {
            real: vec!["one".to_string(), "two".to_string(), "three".to_string()],
            fake: vec!["fake".to_string()],
        }),
        is_one_hit_wonder: false,
        cover_mode: None,
        preview_timestamp: None,
        supported_modes: vec![mode.to_string()],
        is_qr_compatible: true,
        links: Links {
            youtube: "abcdefghijk".to_string(),
            ..Links::default()
        },
    }
}

fn catalogue() -> Vec<Song> {
    let mut without_lyrics = song("a", &["Pack A"], Difficulty::Easy, "timeline");
    without_lyrics.lyrics = None;
    vec![
        without_lyrics,
        song("b", &["Pack B"], Difficulty::Hard, "lyrics"),
        song("c", &["Pack A"], Difficulty::Hard, "lyrics"),
    ]
}

#[test]
fn the_pack_filter_selects_only_matching_songs() {
    let criteria = SelectionCriteria {
        selected_packs: vec!["Pack A".to_string()],
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert!(selection.song.belongs_to_pack("Pack A"));
    assert_eq!(selection.pool_size, 2);
}

#[test]
fn an_empty_pack_selection_uses_the_whole_catalogue() {
    let selection = select_song(&catalogue(), &SelectionCriteria::default(), 0);
    assert!(selection.is_some());
    assert_eq!(selection.map(|s| s.pool_size), Some(3));
}

#[test]
fn a_pack_filter_without_a_match_falls_back_to_the_whole_catalogue() {
    let criteria = SelectionCriteria {
        selected_packs: vec!["Unknown".to_string()],
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 3);
    assert!(selection.fallbacks.contains(&Fallback::PackFilter));
}

#[test]
fn the_difficulty_filter_is_a_soft_fallback() {
    let criteria = SelectionCriteria {
        difficulty: Some(Difficulty::Medium),
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 3);
    assert!(selection.fallbacks.contains(&Fallback::DifficultyFilter));
}

#[test]
fn the_mode_filter_selects_only_matching_songs() {
    let criteria = SelectionCriteria {
        mode_id: Some("lyrics".to_string()),
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 2);
    assert!(selection.song.supports_mode("lyrics"));
}

#[test]
fn played_songs_are_avoided() {
    let criteria = SelectionCriteria {
        played_ids: vec!["a".to_string(), "b".to_string()],
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert_eq!(selection.song.id, "c");
}

#[test]
fn when_everything_was_played_the_last_five_are_allowed_again() {
    let criteria = SelectionCriteria {
        played_ids: vec!["a".to_string(), "b".to_string(), "c".to_string()],
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert!(selection.fallbacks.contains(&Fallback::PlayedFilter));
    assert_eq!(selection.pool_size, 3);
}

#[test]
fn the_draw_is_deterministic() {
    let first = select_song(&catalogue(), &SelectionCriteria::default(), 7);
    let second = select_song(&catalogue(), &SelectionCriteria::default(), 7);
    assert_eq!(first.map(|s| s.song.id), second.map(|s| s.song.id));
}

#[test]
fn an_empty_catalogue_yields_no_selection() {
    assert!(select_song(&[], &SelectionCriteria::default(), 0).is_none());
}

#[test]
fn the_qr_filter_is_a_soft_fallback() {
    // Every song of the catalogue has to be without a physical card, then
    // the filter would empty the pool and is discarded
    // (`src/utils/song-picker.ts:64-67`).
    let mut entries = catalogue();
    for entry in &mut entries {
        entry.is_qr_compatible = false;
    }
    let criteria = SelectionCriteria {
        only_qr_compatible: true,
        ..SelectionCriteria::default()
    };
    let selection = select_song(&entries, &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 3);
    assert!(selection.fallbacks.contains(&Fallback::QrFilter));
}

#[test]
fn the_qr_filter_keeps_the_compatible_songs() {
    let mut entries = catalogue();
    if let Some(entry) = entries.first_mut() {
        entry.is_qr_compatible = false;
    }
    let criteria = SelectionCriteria {
        only_qr_compatible: true,
        ..SelectionCriteria::default()
    };
    let selection = select_song(&entries, &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 2);
    assert!(!selection.fallbacks.contains(&Fallback::QrFilter));
}

#[test]
fn the_lyrics_mode_falls_back_to_the_songs_with_lyrics() {
    // The hard fallback of the Lyrics Labyrinth ignores the difficulty and
    // the QR filter and uses the base pool
    // (`src/utils/song-picker.ts:84-90`).
    let mut entries = catalogue();
    if let Some(entry) = entries.first_mut() {
        entry.is_qr_compatible = false;
    }
    let criteria = SelectionCriteria {
        mode_id: Some("lyrics".to_string()),
        difficulty: Some(Difficulty::Easy),
        only_qr_compatible: true,
        ..SelectionCriteria::default()
    };
    let selection = select_song(&entries, &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 2);
    assert!(selection.song.has_lyrics());
}

#[test]
fn the_mode_filter_is_a_soft_fallback_for_every_other_mode() {
    let criteria = SelectionCriteria {
        mode_id: Some("survivor".to_string()),
        ..SelectionCriteria::default()
    };
    let selection = select_song(&catalogue(), &criteria, 0).expect("a selection");
    assert_eq!(selection.pool_size, 3);
    assert!(selection.fallbacks.contains(&Fallback::ModeFilter));
}

#[test]
fn the_legacy_pack_identifiers_are_mapped() {
    let mapped = normalize_pack_ids(&["global-hits".to_string(), "unknown".to_string()]);
    assert_eq!(
        mapped.first().map(String::as_str),
        Some("Global Hits 1950-2026")
    );
    assert_eq!(mapped.get(1).map(String::as_str), Some("unknown"));
}
