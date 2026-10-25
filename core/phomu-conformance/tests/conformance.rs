//! The conformance vectors of the base.
//!
//! WHY: the vectors are the evidence that the base behaves as the contract
//! says. The corpus of the base has to pass completely; the corpus of the web
//! shell documents the behaviour of the TypeScript reference implementation
//! and differs in the places where the core implements the *specified* rules
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10).

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` is the idiomatic way to do that in a test; the ban of
// the workspace lints applies to the production code, not to the tests that
// prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use phomu_conformance::{
    KNOWN_DIVERGENCES, VECTOR_FILES, Vector, run_vector, run_web_shell_corpus,
};

#[test]
fn every_vector_of_the_base_passes() {
    assert!(
        !VECTOR_FILES.is_empty(),
        "the corpus of the base is not empty"
    );
    for (id, text) in VECTOR_FILES {
        let vector = Vector::from_json(id, text).expect("the vector is valid");
        let outcome = run_vector(&vector).expect("the vector runs");
        assert!(outcome.passed(), "{}", outcome.report());
    }
}

#[test]
fn the_corpus_of_the_web_shell_differs_only_in_the_documented_places() {
    let outcomes = run_web_shell_corpus();
    assert!(
        !outcomes.is_empty(),
        "the corpus of the web shell is not empty"
    );

    let diverging: Vec<&str> = outcomes
        .iter()
        .filter(|outcome| !outcome.passed())
        .map(|outcome| outcome.id.as_str())
        .collect();
    let known: Vec<&str> = KNOWN_DIVERGENCES.iter().map(|(id, _)| *id).collect();

    let mut reported = diverging.clone();
    reported.sort_unstable();
    let mut expected = known.clone();
    expected.sort_unstable();

    assert_eq!(
        reported, expected,
        "the difference to the corpus of the web shell changed: a new difference has to \\
         be documented in KNOWN_DIVERGENCES, a documented difference has to be removed"
    );
}

#[test]
fn every_documented_difference_names_a_reason() {
    for (id, reason) in KNOWN_DIVERGENCES {
        assert!(!reason.is_empty(), "the difference {id} has no reason");
        assert!(reason.len() > 40, "the reason of {id} is too short");
    }
}
