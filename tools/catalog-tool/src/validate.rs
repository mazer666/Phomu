//! The validation of a catalogue against the rules of the base.
//!
//! WHAT: the translation of the catalogue entries into the model of the base
//! and the collection of the findings of the validation.
//!
//! WHY: the rules are not written here. `phomu-catalog::validate_song` owns
//! them; a second implementation of a validation rule is a second rule
//! (docs/design/BUILD-CONTRACT.md § 1.1).

use phomu_catalog::{Song, ValidationIssue, ValidationSeverity, YearBounds, validate_song};

use crate::catalogue::SongEntry;

/// The permitted range of the year of a catalogue entry.
pub use phomu_catalog::YearBounds as Bounds;

/// One finding of the validation, in the shape the report uses.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Finding {
    /// The identifier of the entry the finding belongs to.
    pub song_id: String,
    /// The dotted path of the field, for example `hints[2]`.
    pub field: String,
    /// How serious the finding is.
    pub severity: String,
    /// A stable, machine-readable description of the reason.
    pub kind: String,
}

/// The result of the validation of a whole catalogue.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize)]
pub struct ValidationSummary {
    /// The number of entries that were validated.
    pub songs: usize,
    /// The number of entries that are invalid.
    pub invalid_songs: usize,
    /// The number of entries that are incomplete.
    pub incomplete_songs: usize,
    /// The number of findings that make an entry invalid.
    pub errors: usize,
    /// The number of findings that make an entry incomplete.
    pub warnings: usize,
    /// The entries that could not be translated into the model of the base.
    pub untranslatable: Vec<Untranslatable>,
    /// The findings themselves.
    pub findings: Vec<Finding>,
}

/// An entry that the base does not understand.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Untranslatable {
    /// The identifier of the entry.
    pub song_id: String,
    /// The reason why the entry could not be translated.
    pub reason: String,
}

impl ValidationSummary {
    /// Whether the catalogue may be published.
    ///
    /// WHY: an entry that the base does not understand is worse than an
    /// entry that is invalid: the base cannot validate what it cannot read.
    pub fn is_publishable(&self) -> bool {
        self.errors == 0 && self.untranslatable.is_empty()
    }
}

/// Validate a list of catalogue entries against the rules of the base.
///
/// # Errors
/// The function never fails: an entry that the base does not understand is
/// reported as [`Untranslatable`] instead of aborting the run, because a
/// report that stops at the first broken entry hides the other findings.
pub fn validate_entries(
    entries: &[SongEntry],
    bounds: &YearBounds,
    current_year: i32,
) -> ValidationSummary {
    let mut summary = ValidationSummary {
        songs: entries.len(),
        ..ValidationSummary::default()
    };

    for entry in entries {
        let song: Song = match entry.to_model() {
            Ok(song) => song,
            Err(error) => {
                summary.untranslatable.push(Untranslatable {
                    song_id: entry.id.clone(),
                    reason: error.to_string(),
                });
                continue;
            }
        };

        let validation = validate_song(&song, bounds, current_year);
        if !validation.is_valid {
            summary.invalid_songs += 1;
        }
        if !validation.is_complete {
            summary.incomplete_songs += 1;
        }
        for issue in &validation.errors {
            summary.errors += 1;
            summary.findings.push(finding_of(&song.id, issue));
        }
        for issue in &validation.warnings {
            summary.warnings += 1;
            summary.findings.push(finding_of(&song.id, issue));
        }
    }

    summary
}

/// Turn a finding of the base into the shape of the report.
fn finding_of(song_id: &str, issue: &ValidationIssue) -> Finding {
    Finding {
        song_id: song_id.to_string(),
        field: issue.field.clone(),
        severity: match issue.severity {
            ValidationSeverity::Error => "error".to_string(),
            ValidationSeverity::Warning => "warning".to_string(),
        },
        kind: describe_kind(&issue.kind),
    }
}

/// Describe the reason of a finding in a stable, machine-readable way.
///
/// WHY: the report is read by machines and by humans; a variant name and
/// its numbers are enough for both and do not change when the wording of a
/// message changes.
fn describe_kind(kind: &phomu_catalog::ValidationIssueKind) -> String {
    use phomu_catalog::ValidationIssueKind as Kind;
    match kind {
        Kind::MissingField { field } => format!("missingField:{field}"),
        Kind::InvalidYear { year, min, max } => format!("invalidYear:{year}:{min}:{max}"),
        Kind::InvalidCountryCode { country } => format!("invalidCountryCode:{country}"),
        Kind::UnknownMode { mode } => format!("unknownMode:{mode}"),
        Kind::EmptyList { field } => format!("emptyList:{field}"),
        Kind::WrongHintCount { actual, min, max } => format!("wrongHintCount:{actual}:{min}:{max}"),
        Kind::EmptyHint { index } => format!("emptyHint:{index}"),
        Kind::HintContainsSpoiler { index, token } => {
            format!("hintContainsSpoiler:{index}:{token}")
        }
        Kind::WrongHintEvidenceCount { actual, expected } => {
            format!("wrongHintEvidenceCount:{actual}:{expected}")
        }
        Kind::HintEvidenceNotAUrl { index } => format!("hintEvidenceNotAUrl:{index}"),
        Kind::WrongLyricLineCount { actual, expected } => {
            format!("wrongLyricLineCount:{actual}:{expected}")
        }
        Kind::MissingFakeLyric => "missingFakeLyric".to_string(),
        Kind::InvalidPreviewTimestamp { start, end } => {
            format!("invalidPreviewTimestamp:{start}:{end}")
        }
        Kind::UnexpectedLink { field, value } => format!("unexpectedLink:{field}:{value}"),
        Kind::LimitExceeded(limit) => format!("limitExceeded:{limit:?}"),
        // WHY the fallback: the taxonomy of the base grows. A new failure
        // must not make the report stop; it is reported with the name of the
        // variant until the tool knows it.
        other => format!("{other:?}"),
    }
}
