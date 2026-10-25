//! The validation of a catalogue entry.
//!
//! WHAT: [`validate_song`] checks one entry against the catalogue schema,
//! [`validate_catalogue`] checks a whole catalogue for duplicate
//! identifiers.
//!
//! WHY: the catalogue is written by the maintainers, by the admin tool and
//! by imports. Six shells consume the same artefact; if their validators
//! disagree, one platform accepts songs another platform cannot play
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-110). The rules are the ones
//! of `src/utils/validate-song-data.ts` and `src/utils/validate-song-limits.ts`.
//!
//! The reference implementation validates untyped JSON. The base validates
//! the typed model, therefore the *type* checks of the reference
//! implementation are taken over by the type system and only the *value*
//! checks are ported. A violation is reported as a structured issue and not
//! as a sentence: the base carries no user-visible text
//! (docs/design/BUILD-CONTRACT.md § 6.1, rule L-1).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_catalog::{SongValidation, YearBounds, validate_song};
//!
//! // A year below the lower bound makes the entry invalid.
//! let bounds = YearBounds::new(1500, 1);
//! assert!(bounds.contains(1985, 2026));
//! assert!(!bounds.contains(1200, 2026));
//! ```

mod catalogue;
mod hints;
mod issue;
mod links;

pub use catalogue::validate_catalogue;
pub use issue::{
    SongValidation, ValidationIssue, ValidationIssueKind, ValidationSeverity, YearBounds,
};

use crate::model::Song;
use crate::song_limits::collect_song_limit_violations;
use crate::text::is_country_code;

use catalogue::{limit_issue, missing, missing_warning};
use issue::Findings;

#[cfg(test)]
mod tests;

/// Validates one catalogue entry.
///
/// WHY: the rules are the ones of `src/utils/validate-song-data.ts:88-665`;
/// the *value* checks are ported, the *type* checks are taken over by the
/// type system.
///
/// EXAMPLE: an entry with an empty artist is invalid.
pub fn validate_song(song: &Song, bounds: &YearBounds, current_year: i32) -> SongValidation {
    let mut findings = Findings::empty();

    for violation in collect_song_limit_violations(song) {
        findings.errors.push(limit_issue(violation));
    }

    // ── Mandatory fields ────────────────────────────────────────────
    if song.id.trim().is_empty() {
        findings.errors.push(missing("id"));
    }
    if song.title.trim().is_empty() {
        findings.errors.push(missing("title"));
    }
    if song.artist.trim().is_empty() {
        findings.errors.push(missing("artist"));
    }
    if song.genre.trim().is_empty() {
        findings.errors.push(missing("genre"));
    }
    if !bounds.contains(song.year, current_year) {
        findings.errors.push(ValidationIssue {
            field: "year".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::InvalidYear {
                year: song.year,
                min: bounds.min,
                max: bounds.max(current_year),
            },
        });
    }
    if !is_country_code(&song.country) {
        findings.errors.push(ValidationIssue {
            field: "country".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::InvalidCountryCode {
                country: song.country.clone(),
            },
        });
    }
    if song.mood.is_empty() {
        findings.errors.push(ValidationIssue {
            field: "mood".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::EmptyList { field: "mood" },
        });
    }
    if song.packs.is_empty() {
        findings.errors.push(ValidationIssue {
            field: "packs".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::EmptyList { field: "packs" },
        });
    }

    // ── Hints and hint sources ─────────────────────────────────────
    findings.extend(hints::validate_hints(song));

    // ── Lyrics ──────────────────────────────────────────────────────
    match song.lyrics.as_ref() {
        None => findings.warnings.push(missing_warning("lyrics")),
        Some(lyrics) => {
            if lyrics.real.len() != 3 {
                findings.errors.push(ValidationIssue {
                    field: "lyrics.real".to_string(),
                    severity: ValidationSeverity::Error,
                    kind: ValidationIssueKind::WrongLyricLineCount {
                        actual: lyrics.real.len(),
                        expected: 3,
                    },
                });
            }
            if lyrics.fake.is_empty() {
                findings.errors.push(ValidationIssue {
                    field: "lyrics.fake".to_string(),
                    severity: ValidationSeverity::Error,
                    kind: ValidationIssueKind::MissingFakeLyric,
                });
            }
        }
    }

    // ── Preview timestamp ───────────────────────────────────────────
    if let Some(preview) = song.preview_timestamp.as_ref()
        && preview.start >= preview.end
    {
        findings.errors.push(ValidationIssue {
            field: "previewTimestamp".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::InvalidPreviewTimestamp {
                start: preview.start,
                end: preview.end,
            },
        });
    }

    // ── Links ───────────────────────────────────────────────────────
    findings.extend(links::validate_links(song));

    let is_valid = findings.errors.is_empty();
    let is_complete = is_valid && findings.warnings.is_empty();

    SongValidation {
        song_id: song.id.clone(),
        is_valid,
        is_complete,
        errors: findings.errors,
        warnings: findings.warnings,
    }
}
