//! The conformance vectors of the Phomu base.
//!
//! WHAT: the vectors — a catalogue fixture, a configuration, a scripted
//! sequence of actions and the expected result — and the runner that
//! replays them against the core.
//!
//! WHY: an invariant that cannot be checked is a slogan. The vectors are
//! the proof that the base produces the same result for the same input on
//! every platform (docs/design/PLATFORM-ARCHITECTURE.md § 1.3). Every
//! shell replays the same vectors through its bridge and compares the
//! result with the expected output.
//!
//! The vectors are **data, not code**: they live in `vectors/*.json`, they
//! are embedded at compile time and they are never shipped in a release
//! build.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_conformance::{VECTOR_FILES, Vector, run_vector};
//!
//! let (name, text) = VECTOR_FILES.first().expect("there is at least one vector");
//! let vector = Vector::from_json(name, text).expect("the vector is valid");
//! let outcome = run_vector(&vector).expect("the vector runs");
//! assert!(outcome.differences.is_empty(), "{:?}", outcome.differences);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod runner;
mod vector;

pub use runner::{
    AnswerRecord, Observation, ObservedError, RESULT_SCHEMA_VERSION, RunnerResult, VectorOutcome,
    VectorResult, run_corpus, run_vector, run_web_shell_corpus,
};
pub use vector::{
    FilterOptions, Given, Op, VECTOR_FILES, Vector, VectorAnswer, VectorConfig, VectorError,
    VectorErrorValue, VectorPlayer, VectorSong, VectorTeam, WEB_SHELL_VECTOR_FILES,
};

/// The reason of the deviation of the phase `locked-in`.
///
/// WHY: the core closes the deviation A6 of the contract — the phase is
/// entered when the last expected answer arrives. The reference types the
/// phase but never enters it.
const REASON_LOCKED_IN: &str = "The core enters the phase `locked-in` when the last expected \
     answer arrives; the reference implementation types the phase but never enters it \
     (docs/design/GAME-CONTRACT.md \u{a7} 2.1 and \u{a7} 11.1, deviation A6; REQUIREMENTS.md, GAME-002). \
     The difference is deliberate — the core implements the reveal lock of the contract.";

/// The reason of the deviation of the reveal lock.
///
/// WHY: the reveal is only released when the answers are locked in — the
/// anti-spoiler promise of the product.
const REASON_REVEAL_LOCK: &str = "The core refuses the reveal until the answers of the round are \
     locked in; the reference implementation lets the store change the phase without the lock \
     (docs/design/PLATFORM-ARCHITECTURE.md \u{a7} 10.2, rule C-3; REQUIREMENTS.md, GAME-002). The \
     refusal is the anti-spoiler guarantee of the base.";

/// The reason of the deviation of the answer without a player.
///
/// WHY: an answer belongs to a player — without an active turn there is
/// nobody to attribute it to.
const REASON_NO_PLAYER: &str = "The core refuses an answer when the turn order is empty — there is \
     nobody to attribute the answer to. The reference implementation evaluates the mode and \
     applies its effect without recording the answer.";

/// The vectors of the corpus of the web shell that differ from the
/// behaviour of the core — and why.
///
/// WHY: the corpus documents the behaviour of the TypeScript reference
/// implementation. The core implements the rules of
/// `docs/design/GAME-CONTRACT.md` and of
/// `docs/design/PLATFORM-ARCHITECTURE.md` § 10, and the two differ where
/// the reference implementation has a defect or where the reference
/// implementation is not specified. Every difference is named here, so that
/// a change in the core that adds a difference fails the test.
///
/// The same differences are listed as data for the comparison of the two
/// runners — in
/// `core/phomu-conformance/vectors/intentional-divergences.json`.
pub const KNOWN_DIVERGENCES: &[(&str, &str)] = &[
    // The phase `locked-in` — the core closes the deviation A6 of the contract.
    ("timeline/correct-canonical-slot", REASON_LOCKED_IN),
    ("timeline/wrong-slot", REASON_LOCKED_IN),
    ("timeline/duplicate-year", REASON_LOCKED_IN),
    ("timeline/points-cap", REASON_LOCKED_IN),
    ("hint-master/both-level-1", REASON_LOCKED_IN),
    ("hint-master/artist-level-5", REASON_LOCKED_IN),
    ("hint-master/nothing", REASON_LOCKED_IN),
    ("lyrics/fake-line", REASON_LOCKED_IN),
    ("lyrics/real-line", REASON_LOCKED_IN),
    ("lyrics/bonus-claimed", REASON_LOCKED_IN),
    ("vibe-check/matching-mood", REASON_LOCKED_IN),
    ("vibe-check/cheated", REASON_LOCKED_IN),
    ("vibe-check/wrong-mood", REASON_LOCKED_IN),
    ("survivor/correct", REASON_LOCKED_IN),
    ("survivor/wrong", REASON_LOCKED_IN),
    ("cover/no-hints", REASON_LOCKED_IN),
    ("cover/two-hints", REASON_LOCKED_IN),
    ("cover/three-hints", REASON_LOCKED_IN),
    ("cover/wrong-artist", REASON_LOCKED_IN),
    ("cover/variation-correct", REASON_LOCKED_IN),
    ("cover/variation-wrong", REASON_LOCKED_IN),
    ("decay/within-grace", REASON_LOCKED_IN),
    ("decay/one-step", REASON_LOCKED_IN),
    ("decay/minimum", REASON_LOCKED_IN),
    // The reveal lock of the base — the anti-spoiler guarantee.
    ("phase/question-to-reveal", REASON_REVEAL_LOCK),
    ("phase/reveal-to-drawing", REASON_REVEAL_LOCK),
    ("phase/reveal-to-scoring", REASON_REVEAL_LOCK),
    // The answer without a player.
    ("error/answer-without-player", REASON_NO_PLAYER),
    // The vectors that the corpus itself marks as not portable. The two
    // error vectors of the corpus differ semantically: the core answers
    // with a typed error (`UnknownPlayer`, `InvalidAnswer`), the reference
    // ignores the unknown identifier silently. The difference is visible in
    // the observation — the error of the core is part of it.
    (
        "phase/locked-in-declared",
        "The core enters the declared phase `locked-in` only when the expected answers \
         are submitted; the reference implementation sets the phase from the store. The \
         vector is marked as not portable in the corpus.",
    ),
    (
        "error/award-points-unknown-player",
        "The core answers with the typed error `UnknownPlayer`; the reference \
         implementation ignores the unknown identifier. The vector is marked as not portable \
         in the corpus.",
    ),
    (
        "error/remove-unknown-timeline-year",
        "The core answers with the typed error `InvalidAnswer`; the reference \
         implementation ignores the unknown year. The vector is marked as not portable in \
         the corpus.",
    ),
    (
        "divergence/shifting-teams-random",
        "The core recomputes the team scores after the redistribution of the players, so \
         that the team score is the sum of the points of its members (GAME-007). The \
         reference implementation leaves the team scores untouched \
         (GAME-CONTRACT \u{a7} 6.2, deviation A8). The vector is marked as not portable in the \
         corpus.",
    ),
];
