//! The report and the artefact the catalogue tool writes.
//!
//! WHAT: the JSON report of a validation run and the normalised catalogue
//! artefact that the shells consume.
//!
//! WHY: the report is the evidence of a build; the artefact is the input of
//! every shell. Both are written without a timestamp, so that two runs over
//! the same input produce the same bytes (docs/spec/REQUIREMENTS-PLATFORM.md,
//! BRIDGE-116).

use std::fs;
use std::io;
use std::path::Path;

use serde::Serialize;

use crate::catalogue::SongEntry;
use crate::validate::ValidationSummary;

/// The version of the artefact format.
///
/// WHY: the artefact crosses into every shell; a change of its shape needs a
/// number that a shell can check.
pub const ARTEFACT_SCHEMA_VERSION: u32 = 1;

/// The report of a validation run.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Report {
    /// The name of the tool that wrote the report.
    pub tool: &'static str,
    /// The command that produced the report.
    pub command: &'static str,
    /// The directory the catalogue was read from.
    pub catalogue_directory: String,
    /// The number of files that were read.
    pub files: usize,
    /// The result of the validation.
    #[serde(flatten)]
    pub summary: ValidationSummary,
    /// Whether the catalogue may be published.
    pub publishable: bool,
}

/// The normalised catalogue artefact.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Artefact {
    /// The version of the artefact format.
    pub schema_version: u32,
    /// The number of entries in the artefact.
    pub song_count: usize,
    /// The entries, sorted by their identifier.
    pub songs: Vec<SongEntry>,
}

/// Write the report of a validation run.
///
/// # Errors
/// Returns an error when the file cannot be written.
pub fn write_report(path: &Path, report: &Report) -> io::Result<()> {
    let text = serde_json::to_string_pretty(report)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(path, format!("{text}\n"))
}

/// Build the normalised catalogue artefact.
///
/// The entries are sorted by their identifier, so that the artefact does not
/// depend on the order in which the files were read.
pub fn build_artefact(entries: &[SongEntry]) -> Artefact {
    let mut songs = entries.to_vec();
    songs.sort_by(|left, right| left.id.cmp(&right.id));
    Artefact {
        schema_version: ARTEFACT_SCHEMA_VERSION,
        song_count: songs.len(),
        songs,
    }
}

/// Write the normalised catalogue artefact.
///
/// # Errors
/// Returns an error when the file cannot be written.
pub fn write_artefact(path: &Path, artefact: &Artefact) -> io::Result<()> {
    let text = serde_json::to_string_pretty(artefact)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(path, format!("{text}\n"))
}
