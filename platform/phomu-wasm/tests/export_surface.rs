//! The exported surface of the WebAssembly bridge against the declaration.
//!
//! WHAT: the test compares the symbols the bridge declares
//! ([`phomu_wasm::surface::EXPORTED_FUNCTIONS`]) with the symbols the bridge
//! really exports — in the source of the crate and in the export section of
//! the built module.
//!
//! WHY: the export section of the built module is what a shell sees. A
//! symbol that is declared but not exported is a shell that cannot play, and
//! the audit found exactly that: the module exported three functions and the
//! whole game loop was missing (docs/qa/QA-11-RUST-BASE.md, QA-RST-001).
//!
//! WHY the module is compared as well: the source says what the crate
//! exports, the module says what the shell gets. The two can drift — a
//! function behind a `cfg`, a renamed attribute — and only the module proves
//! the surface.
//!
//! WHY the test does not fail when the module was not built: a checkout
//! without a WebAssembly build has no module to compare. The test then
//! compares the declaration with the source, which is the same check with
//! one step less, and says so. The gate
//! `scripts/check-wasm-surface.mjs` builds the module and compares it.

// WHY the override of the workspace lints: a test has to fail loudly. The
// lints that forbid `unwrap`, `expect` and the indexing exist for the code
// of the product, where a panic is a defect; in a test they are the way a
// failure is reported.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![allow(clippy::panic)]

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use phomu_wasm::surface::{EXPORTED_FUNCTIONS, GAME_LOOP, surface_fingerprint};
use phomu_wasm::wasm_module::{exported_functions, plain_name};

/// The directory of the crate.
fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// The root of the repository.
fn repository_root() -> PathBuf {
    crate_dir()
        .parent()
        .and_then(|path| path.parent())
        .expect("the crate lives in the repository")
        .to_path_buf()
}

/// The functions of the crate that carry the attribute of wasm-bindgen.
///
/// WHY the source and not the module: the test has to run without a
/// WebAssembly build. The attribute is what makes a function reachable from
/// JavaScript, and the module is the proof that the attribute works.
fn exported_in_the_source() -> BTreeSet<String> {
    let mut found = BTreeSet::new();
    let directory = crate_dir().join("src");
    let entries = fs::read_dir(&directory).expect("the source directory is read");
    for entry in entries {
        let path = entry.expect("the entry is read").path();
        if path.extension().and_then(|value| value.to_str()) != Some("rs") {
            continue;
        }
        let text = fs::read_to_string(&path).expect("the file is read");
        for name in annotated_functions(&text) {
            found.insert(name);
        }
    }
    found
}

/// The names of the functions that follow the attribute of wasm-bindgen.
fn annotated_functions(text: &str) -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    let mut lines = text.lines();
    while let Some(line) = lines.next() {
        if line.trim() != "#[wasm_bindgen]" {
            continue;
        }
        for next in lines.by_ref() {
            let trimmed = next.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("pub fn ") {
                if let Some(name) = rest.split('(').next() {
                    found.push(name.to_string());
                }
            }
            break;
        }
    }
    found
}

/// The built module of the bridge, if it was built.
fn built_module() -> Option<PathBuf> {
    let target = repository_root()
        .join("target")
        .join("wasm32-unknown-unknown");
    for profile in ["release", "debug"] {
        let candidate = target.join(profile).join("phomu_wasm.wasm");
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

/// The names of the functions the module exports.
fn exported_in_the_module(path: &PathBuf) -> BTreeSet<String> {
    let bytes = fs::read(path).expect("the module is read");
    let names = exported_functions(&bytes).expect("the module has an export section");
    names
        .iter()
        .map(|name| plain_name(name).to_string())
        .filter(|name| name.starts_with("phomu_"))
        .collect()
}

/// The declared surface as a set.
fn declared() -> BTreeSet<String> {
    EXPORTED_FUNCTIONS
        .iter()
        .map(|name| (*name).to_string())
        .collect()
}

#[test]
fn the_declared_surface_is_the_surface_of_the_source() {
    let declared = declared();
    let exported = exported_in_the_source();
    let missing: Vec<&String> = declared.difference(&exported).collect();
    let extra: Vec<&String> = exported.difference(&declared).collect();
    assert!(
        missing.is_empty(),
        "the declaration names symbols the crate does not export: {missing:?}"
    );
    assert!(
        extra.is_empty(),
        "the crate exports symbols the declaration does not name: {extra:?}"
    );
}

#[test]
fn the_declared_surface_is_the_surface_of_the_module() {
    let declared = declared();
    let Some(path) = built_module() else {
        println!(
            "NOTE: the WebAssembly module was not built — the comparison against the \
             export section is done by scripts/check-wasm-surface.mjs"
        );
        let exported = exported_in_the_source();
        assert_eq!(declared, exported);
        return;
    };
    println!("the module of the comparison: {}", path.display());
    let exported = exported_in_the_module(&path);
    let missing: Vec<&String> = declared.difference(&exported).collect();
    let extra: Vec<&String> = exported.difference(&declared).collect();
    assert!(
        missing.is_empty(),
        "the module does not export the declared symbols: {missing:?}"
    );
    assert!(
        extra.is_empty(),
        "the module exports symbols the declaration does not name: {extra:?}"
    );
}

#[test]
fn every_command_of_the_game_loop_is_exported() {
    let declared = declared();
    for command in GAME_LOOP {
        assert!(
            declared.contains(*command),
            "the command {command} of the game loop is not exported"
        );
    }
    assert!(
        GAME_LOOP.contains(&"phomu_session_timeout"),
        "the timeout is a command of the game loop"
    );
}

#[test]
fn the_surface_fingerprint_is_stable() {
    // WHY a number: the fingerprint changes with every symbol of the
    // surface. A change of the surface therefore has to change this number,
    // and the change has to come with a version bump.
    assert_eq!(surface_fingerprint(), 0xb9fc_e6e0_3c69_6dcb);
}
