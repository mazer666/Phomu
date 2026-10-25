//! The Survivor mode.
//!
//! WHAT: the award for the judgement of the career of an artist
//! ([`award`]) and the visibility of the artist ([`artist_visible`]).
//!
//! WHY: the mode asks whether the artist is a one-hit wonder. Without the
//! concealment the question would be trivial, because the name reveals the
//! answer (GAME-032).

use phomu_config::SURVIVOR_POINTS;

use super::ModeOutcome;

/// The award for the judgement.
///
/// WHY: the mode asks whether the artist is a one-hit wonder; the verdict
/// is right when it matches the catalogue (GAME-032).
///
/// EXAMPLE: guessing "one-hit wonder" on a one-hit wonder is worth three
/// points.
pub fn award(is_one_hit_wonder: bool, guessed_one_hit: bool) -> ModeOutcome {
    if guessed_one_hit == is_one_hit_wonder {
        ModeOutcome::correct(SURVIVOR_POINTS)
    } else {
        ModeOutcome::incorrect()
    }
}

/// Whether the name of the artist may be shown.
///
/// WHY: the artist stays hidden until the answer has been given or the cheat
/// has been used (`src/components/game/modes/SurvivorMode.tsx:121-149`).
///
/// EXAMPLE: before the answer the artist is hidden.
pub fn artist_visible(answered: bool, cheat_used: bool) -> bool {
    answered || cheat_used
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{artist_visible, award};

    #[test]
    fn a_correct_judgement_is_worth_three_points() {
        let outcome = award(true, true);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 3);
    }

    #[test]
    fn a_wrong_judgement_is_worth_nothing() {
        let outcome = award(true, false);
        assert!(!outcome.is_correct);
        assert_eq!(outcome.points, 0);
    }

    #[test]
    fn a_mainstay_guess_is_correct_for_a_mainstay() {
        assert!(award(false, false).is_correct);
        assert!(!award(false, true).is_correct);
    }

    #[test]
    fn the_artist_stays_hidden_until_the_answer_or_the_cheat() {
        assert!(!artist_visible(false, false));
        assert!(artist_visible(true, false));
        assert!(artist_visible(false, true));
    }
}
