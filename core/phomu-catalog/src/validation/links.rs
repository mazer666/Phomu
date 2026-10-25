//! The validation of the links of a catalogue entry.
//!
//! WHAT: the presence of the YouTube link and the shape of every link of an
//! entry.
//!
//! WHY: the links decide whether a song can be played at all. A missing
//! YouTube link makes the entry invalid, a link with an unexpected shape
//! only makes it incomplete — the reference implementation draws exactly
//! this line (`src/utils/validate-song-data.ts:355-556`).
//!
//! The base checks one link more than the reference implementation: the
//! Apple Music link. The reference implementation has no branch for it, the
//! base reports a URL that is not a URL as a warning.

use crate::model::Song;
use crate::text::{is_http_url, is_youtube_placeholder, is_youtube_url, is_youtube_video_id};

use super::{Findings, ValidationIssue, ValidationIssueKind, ValidationSeverity};

/// Validates the links of an entry.
///
/// EXAMPLE: an entry without a YouTube link is invalid, an entry with a
/// placeholder link is only incomplete.
pub(crate) fn validate_links(song: &Song) -> Findings {
    let mut findings = Findings::empty();
    let links = &song.links;

    if links.youtube.trim().is_empty() {
        findings.errors.push(ValidationIssue {
            field: "links.youtube".to_string(),
            severity: ValidationSeverity::Error,
            kind: ValidationIssueKind::MissingField {
                field: "links.youtube",
            },
        });
    } else if is_youtube_placeholder(&links.youtube)
        || (!is_youtube_video_id(&links.youtube) && !is_youtube_url(&links.youtube))
    {
        findings
            .warnings
            .push(unexpected_link("links.youtube", &links.youtube));
    }

    if let Some(fallback) = links.fallback_youtube_id.as_ref()
        && (is_youtube_placeholder(fallback)
            || (!is_youtube_video_id(fallback) && !is_youtube_url(fallback)))
    {
        findings
            .warnings
            .push(unexpected_link("links.fallbackYoutubeId", fallback));
    }

    for (index, alternative) in links.youtube_alternatives.iter().enumerate() {
        if is_youtube_placeholder(alternative)
            || (!is_youtube_video_id(alternative) && !is_youtube_url(alternative))
        {
            findings.warnings.push(ValidationIssue {
                field: format!("links.youtubeAlternatives[{index}]"),
                severity: ValidationSeverity::Warning,
                kind: ValidationIssueKind::UnexpectedLink {
                    field: "links.youtubeAlternatives",
                    value: alternative.clone(),
                },
            });
        }
    }

    if let Some(spotify) = links.spotify.as_ref()
        && !spotify.starts_with("spotify:track:")
        && !spotify.contains("open.spotify.com/track/")
    {
        findings
            .warnings
            .push(unexpected_link("links.spotify", spotify));
    }

    for (field, value) in [
        (
            "links.spotifyFreePreview",
            links.spotify_free_preview.as_ref(),
        ),
        ("links.amazonMusic", links.amazon_music.as_ref()),
        (
            "links.amazonPrimePreview",
            links.amazon_prime_preview.as_ref(),
        ),
        ("links.appleMusic", links.apple_music.as_ref()),
    ] {
        if let Some(value) = value
            && !is_http_url(value)
        {
            findings.warnings.push(unexpected_link(field, value));
        }
    }

    findings
}

/// Builds a finding for a link with an unexpected shape.
///
/// EXAMPLE: `unexpected_link("links.spotify", "x")` names the field
/// `links.spotify`.
fn unexpected_link(field: &'static str, value: &str) -> ValidationIssue {
    ValidationIssue {
        field: field.to_string(),
        severity: ValidationSeverity::Warning,
        kind: ValidationIssueKind::UnexpectedLink {
            field,
            value: value.to_string(),
        },
    }
}
