//! The validation of a whole catalogue.
//!
//! WHAT: [`validate_catalogue`] reports the identifiers that occur twice,
//! and the builders of the findings.
//!
//! WHY: two entries with the same identifier would make the draw ambiguous
//! (GAME-003); the reference implementation validates one entry at a time
//! and does not see this.

use crate::limits::LimitViolation;
use crate::model::Song;

use super::issue::{ValidationIssue, ValidationIssueKind, ValidationSeverity};

/// Validates a whole catalogue and reports the duplicate identifiers.
///
/// WHY: the reference implementation validates one entry at a time and does
/// not look at the catalogue as a whole; two entries with the same
/// identifier would make the draw ambiguous (GAME-003).
///
/// EXAMPLE: two entries with the same identifier produce one finding.
pub fn validate_catalogue(songs: &[Song]) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    let mut seen: Vec<&str> = Vec::new();
    for song in songs {
        if seen.contains(&song.id.as_str()) {
            issues.push(ValidationIssue {
                field: "id".to_string(),
                severity: ValidationSeverity::Error,
                kind: ValidationIssueKind::DuplicateId {
                    id: song.id.clone(),
                },
            });
        } else {
            seen.push(song.id.as_str());
        }
    }
    issues
}

/// Builds a finding for a limit violation.
pub(crate) fn limit_issue(violation: LimitViolation) -> ValidationIssue {
    ValidationIssue {
        field: violation.field,
        severity: ValidationSeverity::Error,
        kind: ValidationIssueKind::LimitExceeded(violation.kind),
    }
}

/// Builds a finding for a missing mandatory field.
///
/// EXAMPLE: `missing("title")` names the field `title`.
pub(crate) fn missing(field: &'static str) -> ValidationIssue {
    ValidationIssue {
        field: field.to_string(),
        severity: ValidationSeverity::Error,
        kind: ValidationIssueKind::MissingField { field },
    }
}

/// Builds a finding for a missing optional field.
///
/// EXAMPLE: `missing_warning("lyrics")` names the field `lyrics`.
pub(crate) fn missing_warning(field: &'static str) -> ValidationIssue {
    ValidationIssue {
        field: field.to_string(),
        severity: ValidationSeverity::Warning,
        kind: ValidationIssueKind::MissingField { field },
    }
}
