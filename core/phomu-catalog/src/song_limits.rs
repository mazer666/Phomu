//! The hard limit check of a catalogue entry.
//!
//! WHAT: the function that collects the limit violations of one entry.
//!
//! WHY: the limits exist because the catalogue is written by machines as
//! well as by humans. The rules are the ones of
//! `src/utils/validate-song-limits.ts:116-259`.

use crate::limits::{LimitKind, LimitViolation, SONG_FIELD_LIMITS, known_supported_mode};
use crate::model::Song;

/// Collects every hard limit violation of an entry.
///
/// WHY: the catalogue is written by machines as well as by humans; the
/// limits are the contract between the writer and the renderer
/// (docs/design/BUILD-CONTRACT.md § 5.3).
///
/// The function never fails open: a field that is missing or has the wrong
/// type is not a limit violation — the presence and the type checks live in
/// the schema validation.
///
/// EXAMPLE: an entry whose title is 201 characters long produces one
/// violation of the kind `LimitKind::TooLong`.
pub fn collect_song_limit_violations(song: &Song) -> Vec<LimitViolation> {
    let limits = SONG_FIELD_LIMITS;
    let mut violations = Vec::new();

    push_text(&mut violations, "id", &song.id, limits.id);
    push_text(&mut violations, "title", &song.title, limits.title);
    push_text(&mut violations, "artist", &song.artist, limits.artist);
    push_text(&mut violations, "genre", &song.genre, limits.genre);
    if let Some(cover_url) = song.cover_url.as_ref() {
        push_text(&mut violations, "coverUrl", cover_url, limits.cover_url);
    }

    violations.extend(crate::limits::string_array_violations(
        "mood",
        &song.mood,
        limits.mood_entries,
        limits.mood_entry,
    ));
    violations.extend(crate::limits::string_array_violations(
        "packs",
        &song.packs,
        limits.pack_entries,
        limits.pack_entry,
    ));

    for (index, hint) in song.hints.iter().enumerate() {
        push_text(
            &mut violations,
            &format!("hints[{index}]"),
            hint,
            limits.hint,
        );
    }
    if let Some(evidence) = song.hint_evidence.as_ref() {
        for (index, entry) in evidence.iter().enumerate() {
            push_text(
                &mut violations,
                &format!("hintEvidence[{index}]"),
                entry,
                limits.hint_evidence,
            );
        }
    }

    if let Some(lyrics) = song.lyrics.as_ref() {
        for (index, line) in lyrics.real.iter().enumerate() {
            push_text(
                &mut violations,
                &format!("lyrics.real[{index}]"),
                line,
                limits.lyric_line,
            );
        }
        for (index, line) in lyrics.fake.iter().enumerate() {
            push_text(
                &mut violations,
                &format!("lyrics.fake[{index}]"),
                line,
                limits.fake_lyric,
            );
        }
    }

    for (field, value) in [
        ("links.youtube", Some(song.links.youtube.clone())),
        ("links.coverLink", song.links.cover_link.clone()),
        (
            "links.fallbackYoutubeId",
            song.links.fallback_youtube_id.clone(),
        ),
        ("links.spotify", song.links.spotify.clone()),
        (
            "links.spotifyFreePreview",
            song.links.spotify_free_preview.clone(),
        ),
        ("links.appleMusic", song.links.apple_music.clone()),
        ("links.amazonMusic", song.links.amazon_music.clone()),
        (
            "links.amazonPrimePreview",
            song.links.amazon_prime_preview.clone(),
        ),
    ] {
        if let Some(value) = value {
            push_text(&mut violations, field, &value, limits.link);
        }
    }
    violations.extend(crate::limits::string_array_violations(
        "links.youtubeAlternatives",
        &song.links.youtube_alternatives,
        limits.youtube_alternatives,
        limits.link,
    ));

    if song.supported_modes.len() > limits.supported_modes {
        violations.push(LimitViolation {
            field: "supportedModes".to_string(),
            kind: LimitKind::TooManyEntries {
                actual: song.supported_modes.len(),
                allowed: limits.supported_modes,
            },
        });
    }
    for (index, mode) in song.supported_modes.iter().enumerate() {
        push_text(
            &mut violations,
            &format!("supportedModes[{index}]"),
            mode,
            limits.supported_mode_entry,
        );
        if !known_supported_mode(mode) {
            violations.push(LimitViolation {
                field: format!("supportedModes[{index}]"),
                kind: LimitKind::UnknownMode { mode: mode.clone() },
            });
        }
    }

    if let Some(cover_mode) = song.cover_mode.as_ref() {
        if let Some(original) = cover_mode.original_song_id.as_ref() {
            push_text(
                &mut violations,
                "coverMode.originalSongId",
                original,
                limits.cover_mode_id,
            );
        }
        for (field, value) in [
            (
                "coverMode.originalArtist",
                cover_mode.original_artist.as_ref(),
            ),
            ("coverMode.coverArtist", cover_mode.cover_artist.as_ref()),
            ("coverMode.revealPrompt", cover_mode.reveal_prompt.as_ref()),
        ] {
            if let Some(value) = value {
                push_text(&mut violations, field, value, limits.cover_mode_text);
            }
        }
    }

    violations
}

/// Adds the violation of one text field, if the text is too long.
fn push_text(violations: &mut Vec<LimitViolation>, field: &str, value: &str, max_length: usize) {
    if let Some(violation) = crate::limits::text_violation(field, value, max_length) {
        violations.push(violation);
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::collect_song_limit_violations;
    use crate::limits::LimitKind;
    use crate::model::{Difficulty, Links, Song};

    fn song() -> Song {
        Song {
            id: "id".to_string(),
            title: "title".to_string(),
            artist: "artist".to_string(),
            year: 1990,
            country: "DE".to_string(),
            genre: "Pop".to_string(),
            cover_url: None,
            difficulty: Difficulty::Easy,
            mood: vec!["Chill".to_string()],
            packs: vec!["Pack".to_string()],
            hints: vec!["hint".to_string(); 5],
            hint_evidence: None,
            lyrics: None,
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
    fn a_short_song_has_no_violation() {
        assert!(collect_song_limit_violations(&song()).is_empty());
    }

    #[test]
    fn an_unknown_mode_is_a_violation() {
        let mut entry = song();
        entry.supported_modes = vec!["unknown".to_string()];
        let violations = collect_song_limit_violations(&entry);
        assert!(
            violations
                .iter()
                .any(|v| matches!(v.kind, LimitKind::UnknownMode { .. }))
        );
    }

    #[test]
    fn a_long_link_is_a_violation() {
        let mut entry = song();
        entry.links.youtube = "x".repeat(501);
        let violations = collect_song_limit_violations(&entry);
        assert!(
            violations
                .iter()
                .any(|v| matches!(v.kind, LimitKind::TooLong { .. }))
        );
    }
}
