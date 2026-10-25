//! The end of a session: the time decay, the ending condition and the
//! possible points of a round.
//!
//! WHAT: the points of an answer after the time decay, the decision whether
//! the session ends after the current rotation and the maximum number of
//! points a mode can be worth.
//!
//! WHY: the three rules read the state of the session but do not change it.
//! They therefore live next to each other and not next to the commands that
//! do change the state.

use crate::modes::{self, GameMode};
use crate::rules::scoring::resolve_answer_points;
use crate::rules::teams;
use crate::rules::winner::{EndingDecision, EndingParameters, evaluate_ending};
use crate::session::model::SessionState;

/// The points of an answer after the time decay.
///
/// WHY: the decay applies only to a correct answer, only when it is enabled
/// and only when an answer time is known (GAME-038).
///
/// EXAMPLE: five base points with an answer time of 20 seconds and a grace
/// of five seconds are two points.
pub(crate) fn points_after_decay(
    state: &SessionState,
    base_points: u32,
    is_correct: bool,
    answered_in_seconds: Option<u32>,
) -> u32 {
    resolve_answer_points(
        base_points,
        is_correct,
        answered_in_seconds,
        &state.config.time_decay,
    )
}

/// Whether the session has to end after the current rotation.
///
/// WHY: the check happens only at the end of a rotation — checking it in the
/// middle of a rotation would rob a player of their turn (GAME-008).
///
/// EXAMPLE: with three players and two rounds per player the session ends
/// in the sixth round.
pub(crate) fn evaluate_session_ending(state: &SessionState, now_ms: u64) -> EndingDecision {
    let parameters = EndingParameters {
        condition: state.config.ending_condition,
        individual: state.config.team_mode == teams::TeamMode::Individual,
        target_points: state.config.target_points,
        target_rounds: state.config.target_rounds,
        target_time_minutes: state.config.target_time_minutes,
        current_round: state.current_round,
        current_turn_index: state.current_turn_index,
        turn_count: state.turn_order.len(),
        game_start_ms: state.game_start_ms,
        now_ms,
        players: &state.players,
        teams: &state.teams,
    };
    evaluate_ending(&parameters)
}

/// The maximum number of points a mode can be worth.
///
/// WHY: the shell shows the possible points of a round before it is played;
/// the value is a rule and therefore lives in the base.
///
/// EXAMPLE: the Timeline mode is worth four points with three years on the
/// timeline.
pub(crate) fn max_points_of(mode: GameMode, timeline_years: &[i32], cap: u32) -> u32 {
    modes::max_points(mode, timeline_years, cap)
}
