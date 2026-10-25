//! The command line of the catalogue tool.
//!
//! WHAT: two commands — `validate` reads a catalogue directory and reports
//! the findings of the base's validation rules; `build` writes the
//! normalised catalogue artefact.
//!
//! WHY: the tool is a build-time artefact. It is never linked into a release
//! build and it never decides what is valid: every rule it applies comes
//! from `phomu-catalog`.
//!
//! EXAMPLE:
//!
//! ```text
//! cargo run -p catalog-tool -- validate src/data/songs --report report.json
//! cargo run -p catalog-tool -- build src/data/songs --out catalogue.json
//! ```

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use catalog_tool::catalogue::{SongEntry, SongFile};
use catalog_tool::report::{Artefact, Report, build_artefact, write_artefact, write_report};
use catalog_tool::validate::{Bounds, validate_entries};

/// The exit code of a run that found errors in the catalogue.
const EXIT_FINDINGS: u8 = 1;

/// The exit code of a run that could not be carried out.
const EXIT_USAGE: u8 = 2;

fn main() -> ExitCode {
    let arguments: Vec<String> = std::env::args().skip(1).collect();
    match run(&arguments) {
        Ok(code) => ExitCode::from(code),
        Err(message) => {
            eprintln!("catalog-tool: {message}");
            ExitCode::from(EXIT_USAGE)
        }
    }
}

/// Run the tool.
///
/// # Errors
/// Returns a message when the arguments are wrong or when a file cannot be
/// read or written.
fn run(arguments: &[String]) -> Result<u8, String> {
    let Some((command, rest)) = arguments.split_first() else {
        return Err(usage());
    };

    let options = Options::parse(rest)?;
    let catalogue_directory = options.positional.first().ok_or_else(usage)?.clone();

    match command.as_str() {
        "validate" => validate(&catalogue_directory, &options),
        "build" => build(&catalogue_directory, &options),
        other => Err(format!("unknown command {other:?}\n{}", usage())),
    }
}

/// Validate a catalogue directory and write the report.
///
/// # Errors
/// Returns a message when the directory cannot be read or the report cannot
/// be written.
fn validate(directory: &str, options: &Options) -> Result<u8, String> {
    let (files, entries) = read_catalogue(Path::new(directory))?;
    let bounds = Bounds::new(
        phomu_config::CATALOG_MIN_SONG_YEAR,
        phomu_config::CATALOG_MAX_SONG_YEAR_OFFSET,
    );
    let summary = validate_entries(&entries, &bounds, options.current_year);

    let report = Report {
        tool: "catalog-tool",
        command: "validate",
        catalogue_directory: directory.to_string(),
        files,
        publishable: summary.is_publishable(),
        summary,
    };

    if let Some(path) = &options.report {
        write_report(path, &report).map_err(|error| format!("cannot write the report: {error}"))?;
    } else {
        println!(
            "{}",
            serde_json::to_string_pretty(&report)
                .map_err(|error| format!("cannot render the report: {error}"))?
        );
    }

    Ok(u8::from(!report.publishable) * EXIT_FINDINGS)
}

/// Build the catalogue artefact.
///
/// # Errors
/// Returns a message when the directory cannot be read or the artefact
/// cannot be written.
fn build(directory: &str, options: &Options) -> Result<u8, String> {
    let (_, entries) = read_catalogue(Path::new(directory))?;
    let artefact: Artefact = build_artefact(&entries);
    let Some(path) = &options.out else {
        return Err("the command `build` needs the option --out\n".to_string() + &usage());
    };
    write_artefact(path, &artefact)
        .map_err(|error| format!("cannot write the artefact: {error}"))?;
    Ok(0)
}

/// Read every catalogue file of a directory.
///
/// WHY: a file that has no `songs` key is not a catalogue file — the
/// repository keeps the pack metadata in `packs.json` — and is skipped
/// instead of failing the run.
///
/// # Errors
/// Returns a message when the directory cannot be read or when a catalogue
/// file is malformed.
fn read_catalogue(directory: &Path) -> Result<(usize, Vec<SongEntry>), String> {
    let entries = fs::read_dir(directory)
        .map_err(|error| format!("cannot read the directory {directory:?}: {error}"))?;

    let mut paths: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .is_some_and(|extension| extension == "json")
        })
        .collect();
    paths.sort();

    let mut files = 0usize;
    let mut songs = Vec::new();
    for path in &paths {
        let text = fs::read_to_string(path)
            .map_err(|error| format!("cannot read the file {path:?}: {error}"))?;
        let value: serde_json::Value = serde_json::from_str(&text)
            .map_err(|error| format!("the file {path:?} is not valid JSON: {error}"))?;
        if !value.get("songs").is_some_and(|songs| songs.is_array()) {
            continue;
        }
        let file: SongFile = serde_json::from_value(value)
            .map_err(|error| format!("the file {path:?} is not a catalogue file: {error}"))?;
        files += 1;
        songs.extend(file.songs);
    }

    Ok((files, songs))
}

/// The parsed options of a run.
struct Options {
    /// The positional arguments: the catalogue directory.
    positional: Vec<String>,
    /// The path of the report file.
    report: Option<PathBuf>,
    /// The path of the artefact file.
    out: Option<PathBuf>,
    /// The year the catalogue is validated against.
    current_year: i32,
}

impl Options {
    /// Parse the arguments of a run.
    ///
    /// # Errors
    /// Returns a message when an option is unknown or has no value.
    fn parse(arguments: &[String]) -> Result<Self, String> {
        let mut positional = Vec::new();
        let mut report = None;
        let mut out = None;
        let mut current_year = current_year();

        let mut remaining = arguments.iter();
        while let Some(argument) = remaining.next() {
            match argument.as_str() {
                "--report" | "--out" => {
                    let value = remaining
                        .next()
                        .ok_or_else(|| format!("the option {argument} needs a value"))?;
                    let path = PathBuf::from(value);
                    if argument == "--report" {
                        report = Some(path);
                    } else {
                        out = Some(path);
                    }
                }
                "--current-year" => {
                    let value = remaining
                        .next()
                        .ok_or_else(|| "the option --current-year needs a value".to_string())?;
                    current_year = value
                        .parse::<i32>()
                        .map_err(|error| format!("{value:?} is not a year: {error}"))?;
                }
                other => {
                    if other.starts_with("--") {
                        return Err(format!("unknown option {other:?}"));
                    }
                    positional.push(other.to_string());
                }
            }
        }

        Ok(Self {
            positional,
            report,
            out,
            current_year,
        })
    }
}

/// The year the catalogue is validated against.
///
/// WHY: the year is an input, not a constant of the tool, so that the run is
/// reproducible.
fn current_year() -> i32 {
    2026
}

/// The usage message of the tool.
fn usage() -> String {
    [
        "usage:",
        "  catalog-tool validate <catalogue-directory> [--report <file>] [--current-year <year>]",
        "  catalog-tool build <catalogue-directory> --out <file> [--current-year <year>]",
    ]
    .join("\n")
}
