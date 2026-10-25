//! The validation of the hints of a catalogue entry.
//!
//! WHAT: the number of the hints, the emptiness of a hint, the spoiler
//! tokens a hint must not contain and the sources of the hints.
//!
//! WHY: a hint that names the song destroys the round (CAT-011) and a hint
//! without a source cannot be verified (CAT-012). Both rules belong to the
//! base, because the catalogue artefact is written by three different tools
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-110).
//!
//! The rules are the ones of `src/utils/validate-song-data.ts:255-360`.

use crate::model::Song;
use crate::text::{is_http_url, normalize_for_comparison};

use super::{Findings, ValidationIssue, ValidationIssueKind, ValidationSeverity};

/// The pack whose entries may have four hints instead of five
/// (`src/utils/validate-song-data.ts:268`).
const YOUTUBE_IMPORT_PACK: &str = "YouTube Collection";

/// The number of hints an entry has to carry.
const REQUIRED_HINT_COUNT: usize = 5;

/// The number of hints the imported pack may carry instead.
const IMPORTED_HINT_COUNT: usize = 4;

/// The number of sources of the hints.
const REQUIRED_EVIDENCE_COUNT: usize = 5;

/// The shortest token of the title or of the artist that a hint must not
/// contain (`src/utils/validate-song-data.ts:300-305`).
const MIN_SPOILER_TOKEN_LENGTH: usize = 4;

/// Validates the hints of an entry and the sources of the hints.
///
/// EXAMPLE: a hint that names the artist produces a warning, an entry with
/// four hints produces an error.
pub(crate) fn validate_hints(song: &Song) -> Findings {
    let mut findings = Findings::empty();

    // ── The number of the hints ─────────────────────────────────────
    let min_hints = if song.belongs_to_pack(YOUTUBE_IMPORT_PACK) {
        IMPORTED_HINT_COUNT
    } else {
        REQUIRED_HINT_COUNT
    };
    if song.hints.len() < min_hints || song.hints.len() > REQUIRED_HINT_COUNT {
        findings.errors.push(ValidationIssue {
            field: "hints".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::WrongHintCount {
                actual: song.hints.len(),
                min: min_hints,
                max: REQUIRED_HINT_COUNT,
            },
        });
    }

    // ── The quality of the hints ────────────────────────────────────
    let spoiler_tokens = spoiler_tokens(&song.title, &song.artist);
    for (index, hint) in song.hints.iter().enumerate() {
        if hint.trim().is_empty() {
            findings.warnings.push(ValidationIssue {
                field: format!("hints[{index}]"),
                severity: ValidationSeverity::Warning,
                kind: ValidationIssueKind::EmptyHint { index },
            });
            continue;
        }
        let normalized = normalize_for_comparison(hint);
        for token in &spoiler_tokens {
            if normalized.contains(token.as_str()) {
                findings.warnings.push(ValidationIssue {
                    field: format!("hints[{index}]"),
                    severity: ValidationSeverity::Warning,
                    kind: ValidationIssueKind::HintContainsSpoiler {
                        index,
                        token: token.clone(),
                    },
                });
                break;
            }
        }
    }

    // ── The sources of the hints ────────────────────────────────────
    match song.hint_evidence.as_ref() {
        Some(evidence) => {
            if evidence.len() != REQUIRED_EVIDENCE_COUNT {
                findings.warnings.push(ValidationIssue {
                    field: "hintEvidence".to_string(),
                    severity: ValidationSeverity::Warning,
                    kind: ValidationIssueKind::WrongHintEvidenceCount {
                        actual: evidence.len(),
                        expected: REQUIRED_EVIDENCE_COUNT,
                    },
                });
            }
            for (index, entry) in evidence.iter().enumerate() {
                if !is_http_url(entry) {
                    findings.warnings.push(ValidationIssue {
                        field: format!("hintEvidence[{index}]"),
                        severity: ValidationSeverity::Warning,
                        kind: ValidationIssueKind::HintEvidenceNotAUrl { index },
                    });
                }
            }
        }
        None => findings
            .warnings
            .push(super::missing_warning("hintEvidence")),
    }

    findings
}

/// The tokens of the title and of the artist that a hint must not contain.
///
/// WHY: the tokens are the words of at least four characters
/// (`src/utils/validate-song-data.ts:300-305`); a shorter word occurs too
/// often by chance to be a reliable indicator.
fn spoiler_tokens(title: &str, artist: &str) -> Vec<String> {
    let mut tokens: Vec<String> = Vec::new();
    for text in [title, artist] {
        for word in normalize_for_comparison(text).split(' ') {
            if word.chars().count() >= MIN_SPOILER_TOKEN_LENGTH && !tokens.iter().any(|t| t == word)
            {
                tokens.push(word.to_string());
            }
        }
    }
    tokens
}
