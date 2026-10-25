//! The tests of the validation of a catalogue entry.
//!
//! WHY: the validation decides which entries may be played; the tests
//! therefore cover the boundary of every rule, not only the happy path.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use crate::model::{Difficulty, Links, Lyrics, PreviewTimestamp, Song};

use super::{
    ValidationIssueKind, ValidationSeverity, YearBounds, validate_catalogue, validate_song,
};

fn bounds() -> YearBounds {
    YearBounds::new(1500, 1)
}

fn valid_song() -> Song {
    Song {
        id: "song-1".to_string(),
        title: "Blaue Laterne".to_string(),
        artist: "Die Band".to_string(),
        year: 1985,
        country: "DE".to_string(),
        genre: "Pop".to_string(),
        cover_url: None,
        difficulty: Difficulty::Easy,
        mood: vec!["Chill".to_string()],
        packs: vec!["Pack A".to_string()],
        hints: vec![
            "Ein Song aus den 80ern".to_string(),
            "Zweite".to_string(),
            "Dritte".to_string(),
            "Vierte".to_string(),
            "Fünfte".to_string(),
        ],
        hint_evidence: Some(vec![
            "https://example.org/1".to_string(),
            "https://example.org/2".to_string(),
            "https://example.org/3".to_string(),
            "https://example.org/4".to_string(),
            "https://example.org/5".to_string(),
        ]),
        lyrics: Some(Lyrics {
            real: vec!["a".to_string(), "b".to_string(), "c".to_string()],
            fake: vec!["d".to_string()],
        }),
        is_one_hit_wonder: false,
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
fn a_complete_song_is_valid_and_complete() {
    let result = validate_song(&valid_song(), &bounds(), 2026);
    assert!(result.is_valid, "errors: {:?}", result.errors);
    assert!(result.is_complete, "warnings: {:?}", result.warnings);
}

#[test]
fn a_year_below_the_lower_bound_is_an_error() {
    let mut song = valid_song();
    song.year = 1200;
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::InvalidYear { year: 1200, .. })
    ));
}

#[test]
fn a_year_above_the_upper_bound_is_an_error() {
    let mut song = valid_song();
    song.year = 2030;
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
}

#[test]
fn a_country_code_must_be_two_upper_case_letters() {
    let mut song = valid_song();
    song.country = "de".to_string();
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::InvalidCountryCode { .. })
    ));
}

#[test]
fn a_hint_with_the_artist_in_it_is_a_warning() {
    let mut song = valid_song();
    if let Some(hint) = song.hints.first_mut() {
        *hint = "Die Band sang das".to_string();
    }
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(!result.is_complete);
    assert!(matches!(
        result.warnings.first().map(|w| &w.kind),
        Some(ValidationIssueKind::HintContainsSpoiler { .. })
    ));
}

#[test]
fn a_song_without_lyrics_is_only_a_warning() {
    let mut song = valid_song();
    song.lyrics = None;
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(!result.is_complete);
}

#[test]
fn a_song_with_one_real_line_is_invalid() {
    let mut song = valid_song();
    song.lyrics = Some(Lyrics {
        real: vec!["a".to_string()],
        fake: vec!["d".to_string()],
    });
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::WrongLyricLineCount { actual: 1, .. })
    ));
}

#[test]
fn a_too_long_title_is_a_limit_violation() {
    let mut song = valid_song();
    song.title = "x".repeat(201);
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::LimitExceeded(_))
    ));
}

#[test]
fn an_unknown_mode_is_a_limit_violation() {
    let mut song = valid_song();
    song.supported_modes = vec!["shifting".to_string()];
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
}

#[test]
fn a_missing_youtube_link_is_an_error() {
    // The reference implementation reports a missing `links.youtube` as an
    // error (`src/utils/validate-song-data.ts:355-375`).
    let mut song = valid_song();
    song.links.youtube = String::new();
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::MissingField {
            field: "links.youtube"
        })
    ));
}

#[test]
fn a_placeholder_youtube_link_is_only_a_warning() {
    let mut song = valid_song();
    song.links.youtube = "TODO: prüfen".to_string();
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(!result.is_complete);
    assert!(matches!(
        result.warnings.first().map(|w| &w.kind),
        Some(ValidationIssueKind::UnexpectedLink { .. })
    ));
}

#[test]
fn an_unexpected_youtube_shape_is_only_a_warning() {
    let mut song = valid_song();
    song.links.youtube = "not-a-video-id".to_string();
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(!result.is_complete);
}

#[test]
fn a_preview_timestamp_without_a_duration_is_an_error() {
    let mut song = valid_song();
    song.preview_timestamp = Some(PreviewTimestamp { start: 90, end: 30 });
    let result = validate_song(&song, &bounds(), 2026);
    assert!(!result.is_valid);
    assert!(matches!(
        result.errors.first().map(|e| &e.kind),
        Some(ValidationIssueKind::InvalidPreviewTimestamp { start: 90, end: 30 })
    ));
}

#[test]
fn a_valid_preview_timestamp_is_accepted() {
    let mut song = valid_song();
    song.preview_timestamp = Some(PreviewTimestamp { start: 30, end: 60 });
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(result.is_complete);
}

#[test]
fn a_hint_evidence_that_is_no_url_is_a_warning() {
    let mut song = valid_song();
    song.hint_evidence = Some(vec![
        "https://example.org/1".to_string(),
        "https://example.org/2".to_string(),
        "https://example.org/3".to_string(),
        "https://example.org/4".to_string(),
        "example.org/5".to_string(),
    ]);
    let result = validate_song(&song, &bounds(), 2026);
    assert!(result.is_valid);
    assert!(!result.is_complete);
    assert!(matches!(
        result.warnings.first().map(|w| &w.kind),
        Some(ValidationIssueKind::HintEvidenceNotAUrl { index: 4 })
    ));
}

#[test]
fn a_duplicate_identifier_is_reported() {
    let songs = vec![valid_song(), valid_song()];
    let issues = validate_catalogue(&songs);
    assert_eq!(issues.len(), 1);
    assert_eq!(
        issues.first().map(|issue| issue.severity),
        Some(ValidationSeverity::Error)
    );
    assert!(matches!(
        issues.first().map(|issue| &issue.kind),
        Some(ValidationIssueKind::DuplicateId { .. })
    ));
}

#[test]
fn the_bounds_allow_the_current_year_plus_one() {
    let bounds = bounds();
    assert!(bounds.contains(2027, 2026));
    assert!(!bounds.contains(2028, 2026));
    assert!(bounds.contains(1500, 2026));
    assert!(!bounds.contains(1499, 2026));
}
