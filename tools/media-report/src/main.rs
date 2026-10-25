//! The command line of the media report tool.
//!
//! WHAT: the `audit` command reads a catalogue directory, audits the media
//! links of every song against the media policy of the base and writes the
//! report.
//!
//! EXAMPLE:
//!
//! ```text
//! cargo run -p media-report -- audit src/data/songs --report media.json
//! ```

use std::path::Path;
use std::process::ExitCode;

use media_report::audit::{AuditReport, audit_catalogue};
use media_report::catalogue::read_entries;
use phomu_media::{MediaSources, PlaybackWindow};

/// The exit code of a run that found errors.
const EXIT_FINDINGS: u8 = 1;

/// The exit code of a run that could not be carried out.
const EXIT_USAGE: u8 = 2;

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code),
        Err(message) => {
            eprintln!("media-report: {message}");
            ExitCode::from(EXIT_USAGE)
        }
    }
}

/// Run the tool.
///
/// # Errors
/// Returns a message when the arguments are wrong or when a file cannot be
/// read or written.
fn run() -> Result<u8, String> {
    let arguments: Vec<String> = std::env::args().skip(1).collect();
    let Some((command, rest)) = arguments.split_first() else {
        return Err(usage());
    };
    if command != "audit" {
        return Err(format!("unknown command {command:?}\n{}", usage()));
    }

    let mut directory: Option<String> = None;
    let mut report_path: Option<std::path::PathBuf> = None;
    let mut remaining = rest.iter();
    while let Some(argument) = remaining.next() {
        match argument.as_str() {
            "--report" => {
                let value = remaining
                    .next()
                    .ok_or_else(|| "the option --report needs a value".to_string())?;
                report_path = Some(std::path::PathBuf::from(value));
            }
            other => {
                if other.starts_with("--") {
                    return Err(format!("unknown option {other:?}\n{}", usage()));
                }
                directory = Some(other.to_string());
            }
        }
    }

    let Some(directory) = directory else {
        return Err(usage());
    };

    let entries = read_entries(Path::new(&directory))?;
    let songs: Vec<(&str, MediaSources, PlaybackWindow, String)> = entries
        .iter()
        .map(|entry| {
            let sources = MediaSources {
                youtube: Some(entry.links.youtube.clone()).filter(|link| !link.is_empty()),
                youtube_alternatives: entry.links.youtube_alternatives.clone().unwrap_or_default(),
                spotify_embed: entry.links.spotify.clone(),
                spotify_preview: entry.links.spotify_free_preview.clone(),
                amazon_embed: entry.links.amazon_music.clone(),
                amazon_preview: entry.links.amazon_prime_preview.clone(),
                apple_music: entry.links.apple_music.clone(),
            };
            let window = match entry.preview_timestamp {
                None => PlaybackWindow::default(),
                Some(preview) => PlaybackWindow {
                    start_seconds: preview.start,
                    end_seconds: Some(preview.end),
                },
            };
            (
                entry.id.as_str(),
                sources,
                window,
                entry.links.youtube.clone(),
            )
        })
        .collect();

    let report = audit_catalogue(&songs);
    let errors = report
        .findings
        .iter()
        .filter(|finding| finding.severity == "error")
        .count();

    match &report_path {
        Some(path) => {
            let text = serde_json::to_string_pretty(&report)
                .map_err(|error| format!("cannot render the report: {error}"))?;
            std::fs::write(path, format!("{text}\n"))
                .map_err(|error| format!("cannot write the report: {error}"))?;
        }
        None => {
            println!(
                "{}",
                serde_json::to_string_pretty(&report)
                    .map_err(|error| format!("cannot render the report: {error}"))?
            );
        }
    }

    let _: AuditReport = report;
    Ok(u8::from(errors > 0) * EXIT_FINDINGS)
}

/// The usage message of the tool.
fn usage() -> String {
    "usage:\n  media-report audit <catalogue-directory> [--report <file>]".to_string()
}
