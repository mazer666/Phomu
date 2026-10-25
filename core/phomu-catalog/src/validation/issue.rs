//! The types of the validation.
//!
//! WHAT: the bounds of the year, the severity and the reason of a finding,
//! the finding itself and the result of the validation of one entry.
//!
//! WHY: the findings are values and not sentences — the tool that renders
//! the report builds the text (docs/design/BUILD-CONTRACT.md § 6.1,
//! rule L-1).

use crate::limits::LimitKind;

/// The permitted range of the year of a catalogue entry.
///
/// WHY: the range is a parameter and not a constant of this crate: the
/// bounds are game constants and live in `phomu-config`
/// (`src/config/song-year-range.ts:19` and `:22`).
///
/// EXAMPLE: with the bounds of the reference implementation and the current
/// year 2026 the latest year is 2027.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct YearBounds {
    /// The earliest permissible year.
    pub min: i32,
    /// The number of years above the current year that are permitted.
    pub max_offset: i32,
}

impl YearBounds {
    /// Builds the bounds.
    ///
    /// WHY: the bounds are game constants and live in `phomu-config`; the
    /// catalogue only carries them into the validation
    /// (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).
    ///
    /// EXAMPLE: `YearBounds::new(1500, 1)` permits the years 1500 to 2027
    /// when the current year is 2026.
    pub const fn new(min: i32, max_offset: i32) -> Self {
        Self { min, max_offset }
    }

    /// The latest permissible year for a given current year.
    ///
    /// WHY: the bound moves with the current year; the catalogue must not
    /// freeze it, therefore the current year is a parameter.
    ///
    /// EXAMPLE: with the bounds of the reference implementation and the
    /// current year 2026 the latest year is 2027.
    pub const fn max(&self, current_year: i32) -> i32 {
        current_year + self.max_offset
    }

    /// Whether a year lies inside the bounds.
    ///
    /// WHY: the catalogue contains classical works, therefore the lower
    /// bound lies before 1900 (`src/config/song-year-range.ts:19`).
    ///
    /// EXAMPLE: the bounds of the reference implementation contain 2026 but
    /// not 2028.
    pub const fn contains(&self, year: i32, current_year: i32) -> bool {
        year >= self.min && year <= self.max(current_year)
    }
}

/// How serious a finding is.
///
/// WHY: the distinction decides whether an entry may be played at all; it
/// is therefore part of the contract of the catalogue
/// (`src/utils/validate-song-data.ts:10-12`).
///
/// EXAMPLE: a missing mandatory field is the severity
/// `ValidationSeverity::Error`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum ValidationSeverity {
    /// The entry is invalid — it cannot be played.
    Error,
    /// The entry is playable but incomplete.
    Warning,
}

/// The reason of a finding.
///
/// WHY: the reason is a value, not a sentence — the tool that renders the
/// report builds the text (docs/design/BUILD-CONTRACT.md § 6.1, rule L-1).
///
/// EXAMPLE: a hint that names the artist produces the reason
/// `ValidationIssueKind::HintContainsSpoiler`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationIssueKind {
    /// A mandatory field is empty.
    MissingField {
        /// The name of the field.
        field: &'static str,
    },
    /// The year lies outside the permitted range.
    InvalidYear {
        /// The year that was found.
        year: i32,
        /// The earliest permitted year.
        min: i32,
        /// The latest permitted year.
        max: i32,
    },
    /// The country code is not two upper-case letters.
    InvalidCountryCode {
        /// The country code that was found.
        country: String,
    },
    /// The list of the supported modes contains an unknown mode.
    UnknownMode {
        /// The mode that was found.
        mode: String,
    },
    /// Two entries of the catalogue carry the same identifier.
    DuplicateId {
        /// The identifier that occurs twice.
        id: String,
    },
    /// A mandatory list is empty.
    EmptyList {
        /// The name of the field.
        field: &'static str,
    },
    /// The number of hints is outside the permitted range.
    WrongHintCount {
        /// The number of hints that were found.
        actual: usize,
        /// The smallest permitted number of hints.
        min: usize,
        /// The largest permitted number of hints.
        max: usize,
    },
    /// A hint is empty.
    EmptyHint {
        /// The index of the hint.
        index: usize,
    },
    /// A hint contains a token of the title or of the artist.
    HintContainsSpoiler {
        /// The index of the hint.
        index: usize,
        /// The token that was found.
        token: String,
    },
    /// The number of hint sources is wrong.
    WrongHintEvidenceCount {
        /// The number of sources that were found.
        actual: usize,
        /// The number of sources that are expected.
        expected: usize,
    },
    /// A hint source is not a URL.
    HintEvidenceNotAUrl {
        /// The index of the source.
        index: usize,
    },
    /// The number of real lyric lines is wrong.
    WrongLyricLineCount {
        /// The number of lines that were found.
        actual: usize,
        /// The number of lines that are expected.
        expected: usize,
    },
    /// The lyric data has no invented line.
    MissingFakeLyric,
    /// The preview timestamp does not describe a valid interval.
    InvalidPreviewTimestamp {
        /// The start offset that was found.
        start: u32,
        /// The end offset that was found.
        end: u32,
    },
    /// A link has an unexpected shape.
    UnexpectedLink {
        /// The name of the link field.
        field: &'static str,
        /// The value that was found.
        value: String,
    },
    /// A hard limit is violated.
    LimitExceeded(LimitKind),
}

/// One finding of the validation.
///
/// WHY: the finding names the field with a dotted path, so that the report
/// can point at the exact place in the entry.
///
/// EXAMPLE: the finding of a hint that names the artist has the field
/// `hints[0]`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationIssue {
    /// The dotted path of the field, for example `hints[2]`.
    pub field: String,
    /// How serious the finding is.
    pub severity: ValidationSeverity,
    /// The reason of the finding.
    pub kind: ValidationIssueKind,
}

/// The result of the validation of one entry.
///
/// WHY: the result separates "invalid" from "incomplete": an incomplete
/// entry is playable, an invalid one is not
/// (`src/utils/validate-song-data.ts:22-30`).
///
/// EXAMPLE: a complete entry has neither an error nor a warning.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SongValidation {
    /// The identifier of the validated entry.
    pub song_id: String,
    /// Whether the entry has no error.
    pub is_valid: bool,
    /// Whether the entry has neither an error nor a warning.
    pub is_complete: bool,
    /// The findings that make the entry invalid.
    pub errors: Vec<ValidationIssue>,
    /// The findings that make the entry incomplete.
    pub warnings: Vec<ValidationIssue>,
}

/// The findings of one part of the validation.
///
/// WHY: the parts of the validation — the hints, the links — are checked in
/// their own modules and hand their findings back in one value, so that a
/// part cannot push a finding into the wrong list.
pub(crate) struct Findings {
    /// The findings that make the entry invalid.
    pub errors: Vec<ValidationIssue>,
    /// The findings that make the entry incomplete.
    pub warnings: Vec<ValidationIssue>,
}

impl Findings {
    /// Builds an empty set of findings.
    pub(crate) fn empty() -> Self {
        Self {
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    /// Adds the findings of another set.
    pub(crate) fn extend(&mut self, other: Self) {
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
    }
}
