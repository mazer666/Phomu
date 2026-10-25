//! The single source of the game constants of the Phomu base.
//!
//! WHAT: every number, flag and fixed list the game obeys — the point
//! values, the time decay, the caps, the round and player limits, the media
//! timeouts, the catalogue bounds. Each constant carries the line of its
//! TypeScript origin, so that a reader can check the port against the
//! reference implementation.
//!
//! WHY: the base is the only place where a game constant may exist
//! (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1). Six shells that each
//! carry their own copy of "5 points for Hint-Master level 1" produce five
//! different games. Every constant therefore lives here exactly once, and
//! the core reads it from here.
//!
//! The constants that the TypeScript implementation defines *locally* — the
//! point values of the five modes that carry no cheat, the cheat penalties,
//! the media timeouts — are part of this crate as well. They were missing
//! from `PHOMU_CONFIG` and are documented as such in
//! `docs/design/GAME-CONTRACT.md` § 11.3.
//!
//! The constants are grouped by the area they belong to; every group is a
//! module of its own, and the crate root re-exports all of them, so that
//! `phomu_config::HINT_MASTER_POINTS` names the constant regardless of the
//! module it lives in.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_config::HINT_MASTER_POINTS;
//!
//! assert_eq!(HINT_MASTER_POINTS[0], 5);
//! assert_eq!(HINT_MASTER_POINTS[4], 1);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod catalogue;
mod media;
mod scoring;
mod session;
mod spoiler;

pub use catalogue::*;
pub use media::*;
pub use scoring::*;
pub use session::*;
pub use spoiler::*;

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;

    // WHY a constant assertion and not a test: the relation between two
    // constants is a property of the build, not of a run. A constant
    // assertion is checked by the compiler, therefore it cannot rot.
    const _: () = assert!(MIN_PLAYERS <= MAX_PLAYERS);
    const _: () = assert!(MIN_PLAYERS > 0);
    const _: () = assert!(MIN_ROUNDS_TO_PLAY <= MAX_ROUNDS_TO_PLAY);
    const _: () = assert!(DEFAULT_TARGET_POINTS > 0);
    const _: () = assert!(CHEAT_PENALTY_TIMELINE_DECADE < 0);
    const _: () = assert!(CHEAT_PENALTY_TIMELINE_JOKER < 0);
    const _: () = assert!(CHEAT_PENALTY_HINT_MASTER_MUSIC < 0);
    const _: () = assert!(CHEAT_PENALTY_SURVIVOR < 0);
    const _: () = assert!(SCORE_FLOOR == 0);

    #[test]
    fn hint_master_points_run_from_five_down_to_one() {
        assert_eq!(HINT_MASTER_POINTS, [5, 4, 3, 2, 1]);
    }

    #[test]
    fn cover_confusion_points_run_from_five_down_to_two() {
        assert_eq!(COVER_CONFUSION_POINTS_BY_HINTS, [5, 4, 3, 2]);
    }

    #[test]
    fn the_score_floor_is_zero() {
        assert_eq!(SCORE_FLOOR, 0);
    }

    #[test]
    fn the_lobby_round_preset_below_the_minimum_is_documented() {
        assert!(LOBBY_ROUNDS_PRESETS[0] < MIN_ROUNDS_TO_PLAY);
    }
}
