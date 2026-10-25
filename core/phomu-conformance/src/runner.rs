//! The runner of the conformance vectors.
//!
//! WHAT: the replay of a vector against the core ([`run_vector`]), the
//! observation of the result ([`VectorOutcome`]) and the comparison with the
//! expectation of the vector.
//!
//! WHY: the runner is the evidence. A vector that produces the expected
//! observation proves that the base behaves as the contract says; a shell
//! that replays the same vectors through its bridge proves that the shell
//! behaves the same (docs/design/PLATFORM-ARCHITECTURE.md § 1.3).
//!
//! The runner is split into four concerns, one module each: the observation
//! of a session (`runner/observation.rs`), the construction of the session
//! (`runner/session.rs`), the execution of the inputs (`runner/execute.rs`)
//! and the comparison with the expectation (`runner/compare.rs`). This
//! module is the facade that ties them together (QA-09 backlog item 2.9).

mod compare;
mod execute;
mod observation;
mod result;
mod session;

pub use observation::{AnswerRecord, Observation, ObservedError};
pub use result::{RunnerResult, VectorResult};

use crate::vector::{Vector, VectorError};

use compare::compare;
use execute::execute;
use observation::observe;
use session::build_session;

/// The version of the result format of a runner.
///
/// WHY: the format is the common denominator of the comparison — the
/// TypeScript runner and the Rust runner write the same structure, so that
/// the comparison can read both field by field.
pub const RESULT_SCHEMA_VERSION: u32 = 1;

/// The result of the replay of a vector.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VectorOutcome {
    /// The identifier of the vector.
    pub id: String,
    /// Whether the vector is portable.
    pub portable: bool,
    /// The observation of the run.
    pub observation: Observation,
    /// The differences to the expectation of the vector.
    pub differences: Vec<String>,
}

impl VectorOutcome {
    /// Whether the vector produced the expected observation.
    pub fn passed(&self) -> bool {
        self.differences.is_empty()
    }

    /// The report of the run, one line per difference.
    pub fn report(&self) -> String {
        if self.passed() {
            return format!("{}: ok", self.id);
        }
        let mut report = format!("{}: {} difference(s)", self.id, self.differences.len());
        for difference in &self.differences {
            report.push_str("\n  - ");
            report.push_str(difference);
        }
        report
    }
}

/// Replays the corpus of the web shell against the core.
///
/// WHY: the corpus of the web shell documents the behaviour of the
/// TypeScript reference implementation. The core implements the *specified*
/// rules, and the two differ where the reference implementation has a
/// defect. The runner therefore reports the differences instead of hiding
/// them: the list of the known differences is
/// [`KNOWN_DIVERGENCES`](crate::KNOWN_DIVERGENCES).
///
/// EXAMPLE: the report names every vector of the corpus that differs.
pub fn run_web_shell_corpus() -> Vec<VectorOutcome> {
    let mut outcomes = Vec::new();
    for (id, text) in crate::vector::WEB_SHELL_VECTOR_FILES {
        let vector = match Vector::from_json(id, text) {
            Ok(vector) => vector,
            Err(_) => continue,
        };
        if let Ok(outcome) = run_vector(&vector) {
            outcomes.push(outcome);
        }
    }
    outcomes
}

/// Replays a corpus against the core and reports it in the shared format.
///
/// WHY: the comparison reads the result file of both runners. This function
/// is the Rust side of that file: the same structure, the same field names
/// and the same types as the TypeScript runner writes.
///
/// EXAMPLE: the result of a corpus of two vectors has two entries.
pub fn run_corpus(vectors: &[Vector]) -> Vec<VectorResult> {
    vectors
        .iter()
        .map(|vector| {
            let outcome = run_vector(vector).unwrap_or_else(|error| VectorOutcome {
                id: vector.id.clone(),
                portable: vector.portable,
                observation: Observation {
                    error: Some(ObservedError {
                        code: "VECTOR_NOT_READABLE".to_string(),
                        message: error.reason.clone(),
                    }),
                    ..Observation::default()
                },
                differences: Vec::new(),
            });
            VectorResult {
                id: outcome.id,
                area: vector.area.clone(),
                portable: outcome.portable,
                observation: outcome.observation,
            }
        })
        .collect()
}

/// Replays a vector against the core and compares the result.
///
/// WHY: the observation protocol is the one of the TypeScript runner — the
/// phase is recorded after **every** input, also after an input that the
/// core refused; an input that the vector layer cannot execute at all ends
/// the replay. Only a protocol that both sides share makes the phases
/// comparable.
///
/// EXAMPLE: a vector that ends with a reveal produces the phases
/// `["drawing", "question", "locked-in", "reveal"]`.
///
/// # Errors
/// Returns the error `VectorError` when the vector itself is malformed and
/// cannot be replayed at all.
pub fn run_vector(vector: &Vector) -> Result<VectorOutcome, VectorError> {
    let mut session = build_session(vector)?;
    let mut now_ms: u64 = 0;
    let mut observation = Observation::default();

    for op in &vector.when {
        match execute(&mut session, vector, op, &mut now_ms, &mut observation) {
            Ok(()) => {}
            Err(failure) => {
                // A refusal of the rules is an error situation of the
                // implementation and is part of the observation. The replay
                // continues: the phase is still recorded after the refused
                // input, and the next input is still executed.
                if let Some(error) = failure.core_error {
                    observation.error = Some(error);
                }
                if let Some(error) = failure.vector_error {
                    observation.error = Some(error);
                    break;
                }
            }
        }
        observation
            .phases
            .push(session.phase().as_str().to_string());
    }

    observe(&session, &mut observation);

    let mut outcome = VectorOutcome {
        id: vector.id.clone(),
        portable: vector.portable,
        observation,
        differences: Vec::new(),
    };
    outcome.differences = compare(vector, &outcome.observation);
    Ok(outcome)
}
