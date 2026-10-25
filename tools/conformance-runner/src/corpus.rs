//! The reader of the corpus.
//!
//! WHAT: the reading of the index and of the vector files.
//!
//! WHY: the reader lives in the tool and not in the crate: the crate of the
//! base does no file system access at all
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 2). The crate replays the
//! vectors; the tool reads them and writes the result.
//!
//! EXAMPLE: `read_corpus` returns the vectors of the index in the order of
//! the index.

use std::fs;
use std::path::{Path, PathBuf};

use phomu_conformance::Vector;
use serde::Deserialize;

/// The index of a corpus — the ordered list of the vector files.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorIndex {
    /// The entries of the corpus.
    vectors: Vec<IndexEntry>,
}

/// One entry of the index.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IndexEntry {
    /// The file name of the vector, relative to the index.
    file: String,
}

/// Reads the corpus of a directory.
///
/// # Errors
///
/// Returns an error when the index or a vector file is missing or is not
/// valid JSON.
pub fn read_corpus(vectors_dir: &Path) -> Result<Vec<Vector>, String> {
    let index_path = vectors_dir.join("index.json");
    let raw = fs::read_to_string(&index_path)
        .map_err(|error| format!("{}: {error}", index_path.display()))?;
    let index: VectorIndex =
        serde_json::from_str(&raw).map_err(|error| format!("{}: {error}", index_path.display()))?;

    let mut vectors = Vec::new();
    for entry in index.vectors {
        let path = vectors_dir.join(&entry.file);
        let raw =
            fs::read_to_string(&path).map_err(|error| format!("{}: {error}", path.display()))?;
        let id = entry.file.clone();
        let vector =
            Vector::from_json(&id, &raw).map_err(|error| format!("{}: {error}", path.display()))?;
        vectors.push(vector);
    }
    Ok(vectors)
}

/// The default location of the corpus of the web shell.
///
/// # Errors
///
/// Returns an error when the manifest directory of the crate cannot be read.
pub fn default_vectors_dir() -> Result<PathBuf, String> {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    Ok(manifest.join("../../core/phomu-conformance/vectors/web-shell"))
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{default_vectors_dir, read_corpus};

    /// The corpus of the web shell.
    fn corpus() -> Vec<phomu_conformance::Vector> {
        let dir = default_vectors_dir().expect("the corpus has a location");
        read_corpus(&dir).expect("the corpus is readable")
    }

    #[test]
    fn the_corpus_is_not_empty() {
        assert!(!corpus().is_empty(), "the corpus is not empty");
    }

    #[test]
    fn every_vector_has_an_identifier_and_an_area() {
        for vector in corpus() {
            assert!(!vector.id.is_empty(), "the vector has an identifier");
            assert!(!vector.area.is_empty(), "the vector has an area");
        }
    }

    #[test]
    fn the_identifiers_of_the_vectors_are_unique() {
        let mut ids: Vec<String> = corpus().into_iter().map(|vector| vector.id).collect();
        ids.sort();
        let count = ids.len();
        ids.dedup();
        assert_eq!(count, ids.len(), "every vector has its own identifier");
    }
}
