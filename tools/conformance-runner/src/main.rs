//! The Rust conformance runner.
//!
//! WHAT: replays the shared conformance vectors against `phomu-core` and
//! writes the observations as JSON — the same format the TypeScript runner
//! produces. The comparison script then decides vector by vector whether the
//! two implementations behave identically.
//!
//! WHY: the claim "the Rust base plays the same game as the web shell" is
//! only credible if it is measured. The measurement is the replay of the
//! same vectors against the same situations, compared field by field
//! (`scripts/verify-conformance.mjs`).
//!
//! The runner is a development artefact: it is never linked into a release
//! build (docs/design/PLATFORM-ARCHITECTURE.md § 2.2). It reads the corpus
//! and writes the result — the rules themselves live in the crate
//! `core/phomu-conformance`, which replays a vector against the core and
//! reports the observation in the shared format.
//!
//! EXAMPLE:
//!
//! ```text
//! cargo run -p phomu-conformance-runner -- --out /tmp/rust.json
//! ```

mod corpus;

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use phomu_conformance::{RESULT_SCHEMA_VERSION, RunnerResult, run_corpus};

use crate::corpus::{default_vectors_dir, read_corpus};

/// Reads a command line option.
///
/// # Errors
///
/// Returns an error when the option is present but has no value.
fn option(name: &str) -> Result<Option<String>, String> {
    let args: Vec<String> = std::env::args().collect();
    let mut index = 0;
    while index < args.len() {
        if args.get(index).map(String::as_str) == Some(name) {
            return match args.get(index + 1) {
                Some(value) => Ok(Some(value.clone())),
                None => Err(format!("the option {name} needs a value")),
            };
        }
        index += 1;
    }
    Ok(None)
}

/// Runs the corpus and writes the result file.
///
/// # Errors
///
/// Returns an error when the corpus cannot be read or the result file
/// cannot be written.
fn run() -> Result<(usize, usize), String> {
    let vectors_dir = match option("--vectors")? {
        Some(path) => PathBuf::from(path),
        None => default_vectors_dir()?,
    };
    let out_file = match option("--out")? {
        Some(path) => PathBuf::from(path),
        None => PathBuf::from("tmp/conformance-rust.json"),
    };

    let vectors = read_corpus(&vectors_dir)?;
    let results = run_corpus(&vectors);
    let failed = results
        .iter()
        .filter(|entry| entry.observation.error.is_some())
        .count();

    let result = RunnerResult {
        runner: "rust".to_string(),
        schema_version: RESULT_SCHEMA_VERSION,
        results,
    };

    if let Some(parent) = out_file.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| format!("{}: {error}", parent.display()))?;
        }
    }
    let json = serde_json::to_string_pretty(&result)
        .map_err(|error| format!("the result cannot be serialised: {error}"))?;
    fs::write(&out_file, format!("{json}\n"))
        .map_err(|error| format!("{}: {error}", out_file.display()))?;

    Ok((result.results.len(), failed))
}

fn main() -> ExitCode {
    match run() {
        Ok((count, failed)) => {
            println!(
                "Rust conformance runner: {count} vector(s) executed, {failed} with a vector error."
            );
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("Rust conformance runner: {error}");
            ExitCode::FAILURE
        }
    }
}
