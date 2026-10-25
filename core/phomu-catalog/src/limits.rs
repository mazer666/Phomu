//! The hard limits of a catalogue entry.
//!
//! WHAT: the maximum length and count per field, the list of the known
//! modes, and the type of a limit violation.
//!
//! WHY: the catalogue is not only written by the maintainers — the admin
//! tool writes edited songs and the catalogue files can be replaced by an
//! import. Without an upper bound a single field can carry megabytes of
//! text into the renderer, into the persisted state and into every export.
//! The reference implementation defines the same limits in
//! `src/utils/validate-song-limits.ts:29-49`.

/// The maximum number of characters or entries per field of a song.
///
/// WHY: without an upper bound a single field can carry megabytes of text
/// into the renderer, into the persisted state and into every export.
///
/// EXAMPLE: the title of an entry may be at most 200 characters long.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SongFieldLimit {
    /// Maximum length of the identifier.
    pub id: usize,
    /// Maximum length of the title.
    pub title: usize,
    /// Maximum length of the artist.
    pub artist: usize,
    /// Maximum length of the genre.
    pub genre: usize,
    /// Maximum length of the cover URL.
    pub cover_url: usize,
    /// Maximum length of one mood entry.
    pub mood_entry: usize,
    /// Maximum number of mood entries.
    pub mood_entries: usize,
    /// Maximum length of one pack entry.
    pub pack_entry: usize,
    /// Maximum number of pack entries.
    pub pack_entries: usize,
    /// Maximum length of one hint.
    pub hint: usize,
    /// Maximum length of one hint source.
    pub hint_evidence: usize,
    /// Maximum length of one lyric line.
    pub lyric_line: usize,
    /// Maximum length of one invented lyric line.
    pub fake_lyric: usize,
    /// Maximum length of one link.
    pub link: usize,
    /// Maximum number of alternative YouTube links.
    pub youtube_alternatives: usize,
    /// Maximum number of supported modes.
    pub supported_modes: usize,
    /// Maximum length of one supported mode entry.
    pub supported_mode_entry: usize,
    /// Maximum length of a cover metadata text.
    pub cover_mode_text: usize,
    /// Maximum length of a cover metadata identifier.
    pub cover_mode_id: usize,
}

/// The hard limits of a catalogue entry
/// (`src/utils/validate-song-limits.ts:29-49`).
pub const SONG_FIELD_LIMITS: SongFieldLimit = SongFieldLimit {
    id: 120,
    title: 200,
    artist: 200,
    genre: 80,
    cover_url: 500,
    mood_entry: 60,
    mood_entries: 20,
    pack_entry: 100,
    pack_entries: 50,
    hint: 600,
    hint_evidence: 500,
    lyric_line: 200,
    fake_lyric: 200,
    link: 500,
    youtube_alternatives: 10,
    supported_modes: 20,
    supported_mode_entry: 40,
    cover_mode_text: 200,
    cover_mode_id: 120,
};

/// The modes a song may declare (`src/utils/validate-song-limits.ts:52-59`).
pub const KNOWN_SUPPORTED_MODES: [&str; 6] = [
    "timeline",
    "hint-master",
    "lyrics",
    "vibe-check",
    "cover-confusion",
    "survivor",
];

/// Whether a mode identifier is one of the known modes.
///
/// WHY: the catalogue artefact names the modes as strings; the set of the
/// known modes is therefore the place where a typo becomes visible
/// (docs/design/GAME-CONTRACT.md § 4).
///
/// EXAMPLE: `known_supported_mode("lyrics")` is `true`.
pub fn known_supported_mode(mode: &str) -> bool {
    KNOWN_SUPPORTED_MODES.contains(&mode)
}

/// The reason why a hard limit is violated.
///
/// WHY: the report has to say *why* an entry was refused; the reason
/// carries the measured and the permitted value.
///
/// EXAMPLE: a title of 201 characters produces the reason
/// `LimitKind::TooLong`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LimitKind {
    /// The value is longer than permitted.
    TooLong {
        /// The measured length.
        actual: usize,
        /// The permitted length.
        allowed: usize,
    },
    /// The list has more entries than permitted.
    TooManyEntries {
        /// The measured number of entries.
        actual: usize,
        /// The permitted number of entries.
        allowed: usize,
    },
    /// The entry names a mode that does not exist.
    UnknownMode {
        /// The unknown mode identifier.
        mode: String,
    },
}

/// One violation of a hard limit.
///
/// WHY: the violation names the field and the reason. It carries no
/// sentence: the tool that renders it builds the text, so that the base
/// stays free of user-visible text
/// (docs/design/BUILD-CONTRACT.md § 6.1, rule L-1).
///
/// EXAMPLE: the violation of a too long title names the field `title`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LimitViolation {
    /// The dotted path of the field, for example `hints[2]`.
    pub field: String,
    /// The reason of the violation.
    pub kind: LimitKind,
}

/// Collects the limit violations of a single string.
///
/// WHY: the helper exists so that the length of every text field is measured
/// the same way — in characters and not in bytes, so that a title with an
/// umlaut does not count twice.
///
/// EXAMPLE: a title of 201 characters violates the limit of 200.
pub(crate) fn text_violation(
    field: &str,
    value: &str,
    max_length: usize,
) -> Option<LimitViolation> {
    if value.chars().count() <= max_length {
        return None;
    }
    Some(LimitViolation {
        field: field.to_string(),
        kind: LimitKind::TooLong {
            actual: value.chars().count(),
            allowed: max_length,
        },
    })
}

/// Collects the limit violations of a list of strings.
///
/// WHY: a list has two limits — the number of its entries and the length of
/// every entry; both are measured here so that the report names the exact
/// field.
///
/// EXAMPLE: a list of eleven mood tags violates the limit of ten entries.
pub(crate) fn string_array_violations(
    field: &str,
    values: &[String],
    max_entries: usize,
    max_entry_length: usize,
) -> Vec<LimitViolation> {
    let mut violations = Vec::new();
    if values.len() > max_entries {
        violations.push(LimitViolation {
            field: field.to_string(),
            kind: LimitKind::TooManyEntries {
                actual: values.len(),
                allowed: max_entries,
            },
        });
    }
    for (index, value) in values.iter().enumerate() {
        if let Some(violation) =
            text_violation(&format!("{field}[{index}]"), value, max_entry_length)
        {
            violations.push(violation);
        }
    }
    violations
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{KNOWN_SUPPORTED_MODES, LimitKind, SONG_FIELD_LIMITS, known_supported_mode};

    #[test]
    fn the_known_modes_are_the_six_game_modes() {
        assert_eq!(KNOWN_SUPPORTED_MODES.len(), 6);
        for mode in KNOWN_SUPPORTED_MODES {
            assert!(known_supported_mode(mode));
        }
        assert!(!known_supported_mode("shifting"));
    }

    #[test]
    fn a_value_at_the_limit_is_not_a_violation() {
        let value = "x".repeat(SONG_FIELD_LIMITS.title);
        assert!(super::text_violation("title", &value, SONG_FIELD_LIMITS.title).is_none());
    }

    #[test]
    fn a_value_above_the_limit_is_a_violation() {
        let value = "x".repeat(SONG_FIELD_LIMITS.title + 1);
        let violation = super::text_violation("title", &value, SONG_FIELD_LIMITS.title);
        assert!(violation.is_some());
        assert!(matches!(
            violation.map(|v| v.kind),
            Some(LimitKind::TooLong {
                actual: 201,
                allowed: 200
            })
        ));
    }
}
