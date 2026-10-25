//! The tests of the module.
//!
//! WHY: the rules of the module are the part of the product a group of
//! friends argues about; they must be the same on every platform.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use super::{Confidence, Difficulty, RelationType};

#[test]
fn the_difficulty_round_trips() {
    for difficulty in Difficulty::ALL {
        assert_eq!(Difficulty::from_str(difficulty.as_str()), Some(*difficulty));
    }
    assert_eq!(Difficulty::from_str("impossible"), None);
}

#[test]
fn the_relation_type_round_trips() {
    for relation in [
        RelationType::Original,
        RelationType::Cover,
        RelationType::Sample,
        RelationType::Remix,
    ] {
        assert_eq!(RelationType::from_str(relation.as_str()), Some(relation));
    }
}

#[test]
fn the_confidence_round_trips() {
    for confidence in [Confidence::Low, Confidence::Medium, Confidence::High] {
        assert_eq!(Confidence::from_str(confidence.as_str()), Some(confidence));
    }
}
