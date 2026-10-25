//! The reader of the corpus.
//!
//! WHAT: the reading of the index and of the vector files.
//!
//! WHY: both runners read the corpus from the same place — the index
//! defines the order and the file name of every case.
//!
//! EXAMPLE: `read_index` returns the entries of `index.json`.

use std::fs;
use std::path::{Path, PathBuf};

use crate::vectors::{Vector, VectorIndex};

/// Reads the index of the corpus.
///
/// # Errors
///
/// Returns an error when the file is missing or is not valid JSON.
pub fn read_index(vectors_dir: &Path) -> Result<VectorIndex, String> {
    let path = vectors_dir.join("index.json");
    let raw = fs::read_to_string(&path).map_err(|error| format!("{}: {error}", path.display()))?;
    let index: VectorIndex =
        serde_json::from_str(&raw).map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(index)
}

/// Reads one vector file.
///
/// # Errors
///
/// Returns an error when the file is missing or is not valid JSON.
pub fn read_vector(vectors_dir: &Path, file: &str) -> Result<Vector, String> {
    let path = vectors_dir.join(file);
    let raw = fs::read_to_string(&path).map_err(|error| format!("{}: {error}", path.display()))?;
    let vector: Vector =
        serde_json::from_str(&raw).map_err(|error| format!("{}: {error}", path.display()))?;
    Ok(vector)
}

/// The default location of the corpus: next to the crate that owns it.
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

    use super::{read_index, read_vector};
    use crate::vectors::OBSERVATION_FIELDS;

    /// The default location of the corpus.
    fn vectors_dir() -> std::path::PathBuf {
        super::default_vectors_dir().expect("the corpus has a location")
    }

    #[test]
    fn the_index_lists_every_vector_of_the_corpus() {
        let dir = vectors_dir();
        let index = read_index(&dir).expect("the index is readable");
        assert!(!index.vectors.is_empty(), "the corpus is not empty");
        for entry in &index.vectors {
            let vector = read_vector(&dir, &entry.file).expect("the vector is readable");
            assert_eq!(vector.id, entry.id, "the index and the file agree");
            assert_eq!(vector.portable, entry.portable, "the index is right");
        }
    }

    #[test]
    fn the_identifiers_of_the_vectors_are_unique() {
        let dir = vectors_dir();
        let index = read_index(&dir).expect("the index is readable");
        let mut ids: Vec<&str> = index
            .vectors
            .iter()
            .map(|entry| entry.id.as_str())
            .collect();
        ids.sort_unstable();
        let count = ids.len();
        ids.dedup();
        assert_eq!(count, ids.len(), "every vector has its own identifier");
    }

    #[test]
    fn every_portable_vector_asserts_the_complete_observation() {
        let dir = vectors_dir();
        let index = read_index(&dir).expect("the index is readable");
        for entry in index.vectors.iter().filter(|entry| entry.portable) {
            let vector = read_vector(&dir, &entry.file).expect("the vector is readable");
            for field in OBSERVATION_FIELDS {
                assert!(
                    vector.then.contains_key(*field),
                    "the vector {} does not assert {field}",
                    vector.id
                );
            }
        }
    }

    #[test]
    fn a_vector_without_portability_is_not_portable() {
        let dir = vectors_dir();
        let index = read_index(&dir).expect("the index is readable");
        for entry in index.vectors.iter().filter(|entry| !entry.portable) {
            let vector = read_vector(&dir, &entry.file).expect("the vector is readable");
            assert!(
                vector.portability_note.is_some(),
                "the vector {} explains why it is not portable",
                vector.id
            );
        }
    }
}
