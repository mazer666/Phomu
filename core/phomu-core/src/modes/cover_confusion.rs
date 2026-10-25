//! The Cover Confusion mode.
//!
//! WHAT: the points by the number of hints ([`points_for_hints`]), the
//! award of the two variants ([`award`], [`variation_award`]) and the choice
//! of the variant ([`variant_for_draw`]).
//!
//! WHY: the mode has two variants — "who is the original?" with the honour
//! system and the optional hints, and "cover or original?" as a binary
//! question. Both are drawn with the same probability (GAME-035,
//! GAME-036).

use phomu_config::{COVER_CONFUSION_POINTS_BY_HINTS, COVER_CONFUSION_VARIATION_POINTS};

use super::ModeOutcome;

/// The two variants of the mode.
///
/// WHY: the two variants ask different questions and are drawn with the same
/// probability (GAME-035, GAME-036).
///
/// EXAMPLE: `CoverVariation::WhoIsIt` is the variant "who is the
/// original?".
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoverVariation {
    /// "Who is the original?" — honour system with optional hints.
    WhoIsIt,
    /// "Cover or original?" — a binary question.
    OriginalOrCover,
}

impl CoverVariation {
    /// The identifier of the variant.
    ///
    /// EXAMPLE: `CoverVariation::WhoIsIt.as_str()` is `"who-is-it"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            CoverVariation::WhoIsIt => "who-is-it",
            CoverVariation::OriginalOrCover => "original-or-cover",
        }
    }
}

/// The points of the mode by the number of hints that were used.
///
/// WHY: no hint is worth five points, one hint four, two hints three and
/// the multiple choice with three artists two points (GAME-034).
///
/// EXAMPLE: two hints used are worth three points.
pub fn points_for_hints(hints_used: u32) -> u32 {
    let index = (hints_used as usize).min(COVER_CONFUSION_POINTS_BY_HINTS.len() - 1);
    COVER_CONFUSION_POINTS_BY_HINTS
        .get(index)
        .copied()
        .unwrap_or(COVER_CONFUSION_POINTS_BY_HINTS[0])
}

/// The award of the variant "who is the original?".
///
/// WHY: the points depend on the number of the hints that were used — the
/// more help the player took, the less the round is worth (GAME-034).
///
/// EXAMPLE: three hints used and a correct answer are worth two points.
pub fn award(hints_used: u32, correct: bool) -> ModeOutcome {
    if correct {
        ModeOutcome::correct(points_for_hints(hints_used))
    } else {
        ModeOutcome::incorrect()
    }
}

/// The award of the variant "cover or original?".
///
/// WHY: the variant is a binary question with a fixed value; the help is
/// not offered in it (GAME-036).
///
/// EXAMPLE: guessing "cover" on a song with a cover link is worth three
/// points.
pub fn variation_award(guess_cover: bool, actually_cover: bool) -> ModeOutcome {
    if guess_cover == actually_cover {
        ModeOutcome::correct(COVER_CONFUSION_VARIATION_POINTS)
    } else {
        ModeOutcome::incorrect()
    }
}

/// The variant of a round.
///
/// WHY: the variant is drawn once per round and stays stable
/// (`src/components/game/modes/CoverConfusionMode.tsx:52-54`).
///
/// EXAMPLE: the draw `0` yields the variant "original or cover".
pub fn variant_for_draw(draw: u64) -> CoverVariation {
    if draw % 2 == 0 {
        CoverVariation::OriginalOrCover
    } else {
        CoverVariation::WhoIsIt
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{CoverVariation, award, points_for_hints, variant_for_draw, variation_award};

    #[test]
    fn the_points_run_from_five_down_to_two() {
        assert_eq!(points_for_hints(0), 5);
        assert_eq!(points_for_hints(1), 4);
        assert_eq!(points_for_hints(2), 3);
        assert_eq!(points_for_hints(3), 2);
    }

    #[test]
    fn more_hints_do_not_raise_the_points() {
        assert_eq!(points_for_hints(9), 2);
    }

    #[test]
    fn a_correct_answer_is_worth_the_points_of_the_hints() {
        let outcome = award(2, true);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 3);
    }

    #[test]
    fn a_wrong_answer_is_worth_nothing() {
        let outcome = award(2, false);
        assert!(!outcome.is_correct);
        assert_eq!(outcome.points, 0);
    }

    #[test]
    fn the_variation_is_worth_three_points() {
        assert_eq!(variation_award(true, true).points, 3);
        assert!(!variation_award(true, false).is_correct);
    }

    #[test]
    fn the_variant_is_stable_for_the_same_draw() {
        assert_eq!(variant_for_draw(4), CoverVariation::OriginalOrCover);
        assert_eq!(variant_for_draw(5), CoverVariation::WhoIsIt);
    }
}
