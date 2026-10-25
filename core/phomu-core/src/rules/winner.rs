//! The ending conditions of a game.
//!
//! WHAT: the three conditions ([`EndingCondition`]) and the decision
//! whether the game ends after a rotation ([`evaluate_ending`]).
//!
//! WHY: exactly one condition is active, and it is checked only when the
//! last turn of a rotation is finished — a session needs a defined end, but
//! checking in the middle of a rotation would rob a player of their turn
//! (GAME-008).

use crate::session::model::{Player, Team};

/// The condition that ends the game.
///
/// WHY: exactly one condition is active and it is checked only at the end
/// of a rotation (`docs/design/GAME-CONTRACT.md` § 6.4).
///
/// EXAMPLE: `EndingCondition::Rounds` ends the game after a number of
/// rounds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum EndingCondition {
    /// The game ends when a player or a team reaches the target score.
    Points,
    /// The game ends after a number of rounds per player or per team.
    Rounds,
    /// The game ends after a number of minutes.
    Time,
}

impl EndingCondition {
    /// Every condition, in a stable order.
    ///
    /// EXAMPLE: `EndingCondition::ALL` has three entries.
    pub const ALL: &'static [EndingCondition] = &[
        EndingCondition::Points,
        EndingCondition::Rounds,
        EndingCondition::Time,
    ];

    /// The identifier of the condition.
    ///
    /// WHY: the identifier is the key of the condition in the persisted
    /// state of a session.
    ///
    /// EXAMPLE: `EndingCondition::Rounds.as_str()` is `"rounds"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            EndingCondition::Points => "points",
            EndingCondition::Rounds => "rounds",
            EndingCondition::Time => "time",
        }
    }

    /// The condition of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; an unknown identifier is a
    /// value to report and not an error to raise.
    ///
    /// EXAMPLE: `EndingCondition::from_str("rounds")` is
    /// `Some(EndingCondition::Rounds)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; an unknown identifier is a value to report, not an error to raise"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "points" => Some(EndingCondition::Points),
            "rounds" => Some(EndingCondition::Rounds),
            "time" => Some(EndingCondition::Time),
            _ => None,
        }
    }
}

/// The decision whether the game ends.
///
/// WHY: the decision carries the winner as well, because only the
/// condition `points` names one; the other two leave the leader to the
/// scores.
///
/// EXAMPLE: `EndingDecision::continues()` is the decision of a session that
/// goes on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EndingDecision {
    /// Whether the game ends after this rotation.
    pub should_end: bool,
    /// The winner, if the condition names one.
    ///
    /// The conditions `rounds` and `time` do not name a winner: the leader
    /// is determined from the scores afterwards
    /// (`docs/design/GAME-CONTRACT.md` § 6.4).
    pub winner_id: Option<String>,
}

impl EndingDecision {
    /// The game continues.
    ///
    /// EXAMPLE: `EndingDecision::continues()` has no winner.
    pub const fn continues() -> Self {
        Self {
            should_end: false,
            winner_id: None,
        }
    }

    /// The game ends without a named winner.
    ///
    /// WHY: the conditions `rounds` and `time` do not name a winner — the
    /// leader is determined from the scores afterwards
    /// (`docs/design/GAME-CONTRACT.md` § 6.4).
    ///
    /// EXAMPLE: `EndingDecision::ends()` has no winner.
    pub const fn ends() -> Self {
        Self {
            should_end: true,
            winner_id: None,
        }
    }

    /// The game ends with a winner.
    ///
    /// WHY: the winner is the leading player or team at the moment the
    /// target score is reached (GAME-009).
    ///
    /// EXAMPLE: `EndingDecision::ends_with("p1".to_string())` names the
    /// player `p1`.
    pub fn ends_with(winner_id: String) -> Self {
        Self {
            should_end: true,
            winner_id: Some(winner_id),
        }
    }
}

/// The parameters of the ending check.
///
/// WHY: the check reads the whole session; the parameters gather what it
/// needs, so that the rule stays a pure function.
///
/// EXAMPLE: the parameters carry the condition, the target and the scores
/// of the players and of the teams.
#[derive(Debug, Clone, Copy)]
pub struct EndingParameters<'a> {
    /// The active condition.
    pub condition: EndingCondition,
    /// Whether the players play individually or in teams.
    pub individual: bool,
    /// The score that ends the game.
    pub target_points: i64,
    /// The number of rounds per player or per team.
    pub target_rounds: u32,
    /// The number of minutes the game lasts.
    pub target_time_minutes: u32,
    /// The number of the round that has just been played.
    pub current_round: u32,
    /// The index of the turn that has just been played.
    pub current_turn_index: usize,
    /// The number of turns of a rotation.
    pub turn_count: usize,
    /// The moment the game started, in milliseconds since the epoch.
    pub game_start_ms: Option<u64>,
    /// The current moment, in milliseconds since the epoch.
    pub now_ms: u64,
    /// The players of the session.
    pub players: &'a [Player],
    /// The teams of the session.
    pub teams: &'a [Team],
}

/// Decides whether the game ends after the current rotation.
///
/// WHY: a session needs a defined end, but checking the condition in the
/// middle of a rotation would rob a player of their turn (GAME-008).
///
/// The rule is the one of `src/stores/game-store.ts:300-323`: the check
/// happens only at the end of a rotation, that is when the last turn of the
/// turn order has been played.
///
/// EXAMPLE: with the condition `rounds`, three players and two rounds per
/// player the game ends in the sixth round.
pub fn evaluate_ending(parameters: &EndingParameters<'_>) -> EndingDecision {
    let is_end_of_rotation =
        parameters.turn_count > 0 && parameters.current_turn_index + 1 >= parameters.turn_count;
    if !is_end_of_rotation {
        return EndingDecision::continues();
    }

    match parameters.condition {
        EndingCondition::Points => {
            let leader = leading_id(parameters.individual, parameters.players, parameters.teams);
            match leader {
                Some((id, score)) if score >= parameters.target_points => {
                    EndingDecision::ends_with(id)
                }
                _ => EndingDecision::continues(),
            }
        }
        EndingCondition::Rounds => {
            let groups = if parameters.individual {
                parameters.players.len()
            } else {
                parameters.teams.len()
            };
            let total = parameters.target_rounds.saturating_mul(groups as u32);
            if parameters.current_round >= total {
                EndingDecision::ends()
            } else {
                EndingDecision::continues()
            }
        }
        EndingCondition::Time => {
            let Some(start) = parameters.game_start_ms else {
                return EndingDecision::continues();
            };
            let elapsed_ms = parameters.now_ms.saturating_sub(start);
            let target_ms = u64::from(parameters.target_time_minutes).saturating_mul(60_000);
            if elapsed_ms >= target_ms {
                EndingDecision::ends()
            } else {
                EndingDecision::continues()
            }
        }
    }
}

/// The leading player or team and its score.
fn leading_id(individual: bool, players: &[Player], teams: &[Team]) -> Option<(String, i64)> {
    if individual {
        players
            .iter()
            .max_by_key(|player| player.score)
            .map(|player| (player.id.clone(), player.score))
    } else {
        teams
            .iter()
            .max_by_key(|team| team.score)
            .map(|team| (team.id.clone(), team.score))
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{EndingCondition, EndingDecision, EndingParameters, evaluate_ending};
    use crate::session::model::{Player, Team};

    fn player(id: &str, score: i64) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            score,
            team_id: None,
            is_eliminated: false,
            is_spectator: false,
            is_pilot: false,
            color: None,
            avatar: None,
        }
    }

    fn parameters<'a>(
        condition: EndingCondition,
        players: &'a [Player],
        teams: &'a [Team],
    ) -> EndingParameters<'a> {
        EndingParameters {
            condition,
            individual: true,
            target_points: 10,
            target_rounds: 2,
            target_time_minutes: 60,
            current_round: 1,
            current_turn_index: 0,
            turn_count: 2,
            game_start_ms: Some(0),
            now_ms: 0,
            players,
            teams,
        }
    }

    #[test]
    fn the_check_happens_only_at_the_end_of_a_rotation() {
        let players = vec![player("a", 20)];
        let mut parameters = parameters(EndingCondition::Points, &players, &[]);
        parameters.current_turn_index = 0;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::continues());
        parameters.current_turn_index = 1;
        assert_eq!(
            evaluate_ending(&parameters),
            EndingDecision::ends_with("a".to_string())
        );
    }

    #[test]
    fn the_points_condition_names_the_leader() {
        let players = vec![player("a", 3), player("b", 12)];
        let mut parameters = parameters(EndingCondition::Points, &players, &[]);
        parameters.current_turn_index = 1;
        assert_eq!(
            evaluate_ending(&parameters),
            EndingDecision::ends_with("b".to_string())
        );
    }

    #[test]
    fn the_rounds_condition_counts_per_player() {
        let players = vec![player("a", 0), player("b", 0), player("c", 0)];
        let mut parameters = parameters(EndingCondition::Rounds, &players, &[]);
        parameters.current_turn_index = 1;
        parameters.current_round = 5;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::continues());
        parameters.current_round = 6;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::ends());
    }

    #[test]
    fn the_time_condition_counts_from_the_start_of_the_game() {
        let players = vec![player("a", 0)];
        let mut parameters = parameters(EndingCondition::Time, &players, &[]);
        parameters.current_turn_index = 1;
        parameters.game_start_ms = Some(0);
        parameters.now_ms = 59 * 60_000;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::continues());
        parameters.now_ms = 60 * 60_000;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::ends());
    }

    #[test]
    fn without_a_start_time_the_time_condition_does_not_end_the_game() {
        let players = vec![player("a", 0)];
        let mut parameters = parameters(EndingCondition::Time, &players, &[]);
        parameters.current_turn_index = 1;
        parameters.game_start_ms = None;
        parameters.now_ms = u64::MAX;
        assert_eq!(evaluate_ending(&parameters), EndingDecision::continues());
    }
}
