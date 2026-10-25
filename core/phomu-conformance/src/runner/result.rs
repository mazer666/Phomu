//! The result file of a runner.
//!
//! WHAT: the result file ([`RunnerResult`]) and the result of one vector
//! ([`VectorResult`]).
//!
//! WHY: the result file is the artefact that the comparison of the two
//! runners reads. It lives in its own module because the file format and
//! the replay of a vector are two different concerns — a change of the
//! format must be visible in the diff of the format, not in the diff of the
//! replay (QA-09 backlog item 2.9).

use serde::{Deserialize, Serialize};

use super::observation::Observation;

/// The result file of a runner.
///
/// WHY: the two runners write the same file — the comparison reads both and
/// decides vector by vector whether the implementations behave identically.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerResult {
    /// The name of the runner — "rust" or "typescript".
    pub runner: String,
    /// The version of the format.
    pub schema_version: u32,
    /// The observation of every vector.
    pub results: Vec<VectorResult>,
}

/// The observation of one vector.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorResult {
    /// The identifier of the vector.
    pub id: String,
    /// The behaviour area the vector belongs to.
    pub area: String,
    /// Whether both implementations have to produce the same observation.
    pub portable: bool,
    /// The observation.
    pub observation: Observation,
}
