//! The central scoring.
//!
//! WHAT: the time decay ([`resolve_answer_points`]) and the crediting of
//! points to a score ([`award_points`]).
//!
//! WHY: the points are the part of the product a group of friends argues
//! about, so they must not depend on the platform
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-107). The reference
//! implementation applies the decay in `src/app/game/page.tsx:126-161` and
//! the crediting in `src/stores/game-store.ts:451-476`.

use phomu_config::{
    DEFAULT_MIN_POINTS_PER_CORRECT, DEFAULT_TIME_DECAY_ENABLED, DEFAULT_TIME_DECAY_GRACE_SECONDS,
    DEFAULT_TIME_DECAY_STEP_POINTS, DEFAULT_TIME_DECAY_STEP_SECONDS,
};

/// The parameters of the time decay.
///
/// WHY: the parameters are numbers of the game and therefore live in
/// `phomu-config`; the core only carries them into the rule
/// (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).
///
/// EXAMPLE: the default parameters leave the points of a correct answer
/// untouched.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimeDecayConfig {
    /// Whether the decay is active at all.
    pub enabled: bool,
    /// The number of seconds after which the first step applies.
    pub grace_seconds: u32,
    /// The width of one step in seconds.
    pub step_seconds: u32,
    /// The number of points deducted per step.
    pub step_points: u32,
    /// The lower bound of the points of a correct answer.
    pub min_points_per_correct: u32,
}

impl Default for TimeDecayConfig {
    fn default() -> Self {
        Self {
            enabled: DEFAULT_TIME_DECAY_ENABLED,
            grace_seconds: DEFAULT_TIME_DECAY_GRACE_SECONDS,
            step_seconds: DEFAULT_TIME_DECAY_STEP_SECONDS,
            step_points: DEFAULT_TIME_DECAY_STEP_POINTS,
            min_points_per_correct: DEFAULT_MIN_POINTS_PER_CORRECT,
        }
    }
}

/// Applies the time decay to the base value of a correct answer.
///
/// WHY: the points must not depend on the platform, therefore the decay
/// lives in the base and not in the shell that measures the time.
///
/// The rule is the one of GAME-038 and of
/// `src/app/game/page.tsx:130-139`:
///
/// ```text
/// overtime    = max(0, answered_in_seconds - grace_seconds)
/// decay_steps = floor(overtime / max(1, step_seconds))
/// points      = max(min_points_per_correct, base_points - decay_steps * step_points)
/// ```
///
/// The decay applies only to a correct answer, only when it is enabled and
/// only when an answer time is known.
///
/// EXAMPLE: 5 base points, 20 seconds, a grace of 5 seconds, a step of
/// 5 seconds and 1 point per step are 2 points: three steps have passed.
pub fn resolve_answer_points(
    base_points: u32,
    is_correct: bool,
    answered_in_seconds: Option<u32>,
    config: &TimeDecayConfig,
) -> u32 {
    if !is_correct || !config.enabled {
        return base_points;
    }
    let Some(answered_in_seconds) = answered_in_seconds else {
        return base_points;
    };
    let overtime = answered_in_seconds.saturating_sub(config.grace_seconds);
    let step = config.step_seconds.max(1);
    let decay_steps = overtime / step;
    let decay_points = decay_steps.saturating_mul(config.step_points);
    base_points
        .saturating_sub(decay_points)
        .max(config.min_points_per_correct)
}

/// Credits points to a score and keeps the score at or above zero.
///
/// WHY: a cheat may cost points, but a score below zero is inexplicable
/// (GAME-006, `src/stores/game-store.ts:457`).
///
/// EXAMPLE: crediting −5 points to a score of 3 yields 0.
pub fn award_points(score: i64, points: i64) -> i64 {
    (score + points).max(phomu_config::SCORE_FLOOR)
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{TimeDecayConfig, award_points, resolve_answer_points};

    fn active() -> TimeDecayConfig {
        TimeDecayConfig {
            enabled: true,
            grace_seconds: 5,
            step_seconds: 5,
            step_points: 1,
            min_points_per_correct: 1,
        }
    }

    #[test]
    fn a_disabled_decay_leaves_the_points_untouched() {
        let config = TimeDecayConfig::default();
        assert_eq!(resolve_answer_points(5, true, Some(120), &config), 5);
    }

    #[test]
    fn a_wrong_answer_is_never_deducted() {
        assert_eq!(resolve_answer_points(5, false, Some(120), &active()), 5);
    }

    #[test]
    fn an_answer_without_a_time_is_never_deducted() {
        assert_eq!(resolve_answer_points(5, true, None, &active()), 5);
    }

    #[test]
    fn the_grace_period_is_free() {
        assert_eq!(resolve_answer_points(5, true, Some(5), &active()), 5);
    }

    #[test]
    fn every_full_step_deducts_one_point() {
        // 20 s: 15 s of overtime, three steps of five seconds, three points.
        assert_eq!(resolve_answer_points(5, true, Some(20), &active()), 2);
        // 25 s: four steps, four points — the floor of one point is reached.
        assert_eq!(resolve_answer_points(5, true, Some(25), &active()), 1);
        // 26 s: still four steps, because the fifth one is not complete.
        assert_eq!(resolve_answer_points(5, true, Some(26), &active()), 1);
        // 15 s: two steps.
        assert_eq!(resolve_answer_points(5, true, Some(15), &active()), 3);
    }

    #[test]
    fn the_decay_never_falls_below_the_minimum() {
        assert_eq!(resolve_answer_points(5, true, Some(600), &active()), 1);
        assert_eq!(resolve_answer_points(1, true, Some(600), &active()), 1);
    }

    #[test]
    fn a_step_width_of_zero_does_not_divide_by_zero() {
        let config = TimeDecayConfig {
            enabled: true,
            grace_seconds: 0,
            step_seconds: 0,
            step_points: 1,
            min_points_per_correct: 1,
        };
        assert_eq!(resolve_answer_points(5, true, Some(10), &config), 1);
    }

    #[test]
    fn a_score_never_becomes_negative() {
        assert_eq!(award_points(3, -5), 0);
        assert_eq!(award_points(3, 2), 5);
        assert_eq!(award_points(0, -1), 0);
    }
}
