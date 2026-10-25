//! The Hint-Master mode.
//!
//! WHAT: the points of a hint level ([`points_for_level`]), the award for
//! the pilot's verdict ([`award`]) and the length of the audio hint
//! ([`audio_window`]).
//!
//! WHY: the Hint-Master is the only mode with a verbal answer. Without the
//! differentiation between "I knew everything" and "I knew the artist" the
//! hit rate would be worthless (GAME-025).

use phomu_config::{
    HINT_MASTER_AUDIO_FULL_SECONDS, HINT_MASTER_AUDIO_HINT_SECONDS, HINT_MASTER_POINTS,
};

use super::{KnewWhat, ModeOutcome};

/// The points of a hint level.
///
/// WHY: level 1 is worth five points and level 5 is worth one — the early
/// hit is worth more (GAME-023, `src/config/game-config.ts:310`).
///
/// EXAMPLE: level 3 is worth three points.
pub fn points_for_level(level: u32) -> u32 {
    if level == 0 {
        return 1;
    }
    let index = (level - 1) as usize;
    HINT_MASTER_POINTS.get(index).copied().unwrap_or(1)
}

/// The award for the verdict of the pilot.
///
/// WHY: "both" gives the full amount, "artist" and "title" half of it,
/// rounded up, and "nothing" gives nothing (GAME-025,
/// `src/components/game/modes/HintMasterMode.tsx:47-55`).
///
/// EXAMPLE: level 4 with the verdict "artist" is one point.
pub fn award(level: u32, knew: KnewWhat) -> ModeOutcome {
    let points = points_for_level(level);
    match knew {
        KnewWhat::Both => ModeOutcome::correct(points),
        KnewWhat::None => ModeOutcome::incorrect(),
        KnewWhat::Artist | KnewWhat::Title => ModeOutcome::correct(points.div_ceil(2)),
    }
}

/// The playback window of the audio hint.
///
/// WHY: up to level 4 the audio runs for half a minute, from level 5 on or
/// after the reveal it runs for three minutes — whoever reaches level 5 is
/// entitled to the whole identification phase (GAME-026).
///
/// EXAMPLE: with a start offset of 30 seconds and level 5 the window ends
/// at 210 seconds.
pub fn audio_window(start_seconds: u32, level: u32, revealed: bool) -> (u32, u32) {
    let length = if revealed || level >= 5 {
        HINT_MASTER_AUDIO_FULL_SECONDS
    } else {
        HINT_MASTER_AUDIO_HINT_SECONDS
    };
    (start_seconds, start_seconds.saturating_add(length))
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{audio_window, award, points_for_level};
    use crate::modes::KnewWhat;

    #[test]
    fn the_levels_run_from_five_down_to_one() {
        assert_eq!(points_for_level(1), 5);
        assert_eq!(points_for_level(3), 3);
        assert_eq!(points_for_level(5), 1);
    }

    #[test]
    fn a_level_below_one_is_worth_one_point() {
        assert_eq!(points_for_level(0), 1);
    }

    #[test]
    fn a_level_above_five_is_worth_one_point() {
        assert_eq!(points_for_level(9), 1);
    }

    #[test]
    fn both_gives_the_full_amount() {
        let outcome = award(1, KnewWhat::Both);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 5);
    }

    #[test]
    fn a_partial_answer_gives_half_the_points_rounded_up() {
        assert_eq!(award(4, KnewWhat::Artist).points, 1);
        assert_eq!(award(3, KnewWhat::Title).points, 2);
        assert_eq!(award(5, KnewWhat::Artist).points, 1);
    }

    #[test]
    fn nothing_is_worth_nothing_and_is_wrong() {
        let outcome = award(1, KnewWhat::None);
        assert!(!outcome.is_correct);
        assert_eq!(outcome.points, 0);
    }

    #[test]
    fn the_audio_grows_with_the_level() {
        assert_eq!(audio_window(0, 2, false), (0, 30));
        assert_eq!(audio_window(0, 5, false), (0, 180));
        assert_eq!(audio_window(30, 1, true), (30, 210));
    }
}
