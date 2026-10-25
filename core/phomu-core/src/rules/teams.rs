//! The team and turn logic.
//!
//! WHAT: the three team modes ([`TeamMode`]), the construction of the turn
//! order, the redistribution of the players in the shifting team mode and
//! the elimination rule ([`EliminationRule`]).
//!
//! WHY: the turn order decides whose turn it is, and the scoreboard has to
//! agree on every device (docs/design/PLATFORM-ARCHITECTURE.md § 4.1).

use crate::session::model::{Player, Team};

/// How the players are grouped.
///
/// WHY: the mode decides whose turn it is and where the points flow to;
/// it is therefore part of the rules and not of the lobby
/// (`docs/design/GAME-CONTRACT.md` § 6.2).
///
/// EXAMPLE: `TeamMode::Individual` lets every player play for themselves.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum TeamMode {
    /// Every player plays for themselves.
    Individual,
    /// The teams stay as they are for the whole game.
    Fixed,
    /// The players are redistributed at every round change.
    Shifting,
}

impl TeamMode {
    /// Every team mode, in the order of the reference implementation
    /// (`src/types/player.ts:9-12`).
    ///
    /// EXAMPLE: `TeamMode::ALL` has three entries.
    pub const ALL: &'static [TeamMode] =
        &[TeamMode::Individual, TeamMode::Fixed, TeamMode::Shifting];

    /// The identifier of the team mode.
    ///
    /// WHY: the identifier is the key of the mode in the persisted state of
    /// a session.
    ///
    /// EXAMPLE: `TeamMode::Shifting.as_str()` is `"shifting"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            TeamMode::Individual => "individual",
            TeamMode::Fixed => "fixed",
            TeamMode::Shifting => "shifting",
        }
    }

    /// The team mode of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; an unknown identifier is a
    /// value to report and not an error to raise.
    ///
    /// EXAMPLE: `TeamMode::from_str("shifting")` is
    /// `Some(TeamMode::Shifting)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; an unknown identifier is a value to report, not an error to raise"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "individual" => Some(TeamMode::Individual),
            "fixed" => Some(TeamMode::Fixed),
            "shifting" => Some(TeamMode::Shifting),
            _ => None,
        }
    }
}

/// Builds the order in which the players take their turn.
///
/// WHY: in the individual mode the order contains the player identifiers,
/// in the team modes the team identifiers
/// (`src/stores/game-store.ts:258-261`).
///
/// EXAMPLE: in the individual mode the order is the order of the players.
pub fn build_turn_order(team_mode: TeamMode, players: &[Player], teams: &[Team]) -> Vec<String> {
    match team_mode {
        TeamMode::Individual => players.iter().map(|player| player.id.clone()).collect(),
        TeamMode::Fixed | TeamMode::Shifting => teams.iter().map(|team| team.id.clone()).collect(),
    }
}

/// The result of a redistribution of the players.
///
/// WHY: the redistribution changes the teams and the players together; a
/// result that carried only one of them would let the two drift apart.
///
/// EXAMPLE: the result carries the teams with their new members and the
/// players with their new team.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShiftResult {
    /// The teams with their new members.
    pub teams: Vec<Team>,
    /// The players with their new team.
    pub players: Vec<Player>,
}

/// Redistributes the players over the teams and recomputes the team scores.
///
/// WHY: the reference implementation redistributes the players but leaves
/// the team scores untouched, so that the relation "the team score is the
/// sum of the points of its members" no longer holds from the first
/// redistribution on (`docs/design/GAME-CONTRACT.md` § 6.2, deviation A8).
/// The base recomputes the team scores, so that the relation of GAME-007
/// holds at every moment of the game.
///
/// The redistribution needs at least two teams — with one team every player
/// would land in the same team anyway, and the reference implementation
/// skips the redistribution in that case
/// (`src/stores/game-store.ts:352`).
///
/// EXAMPLE: three players and two teams end up as two and one.
pub fn shift_teams(teams: &[Team], players: &[Player], draw: u64) -> ShiftResult {
    if teams.len() < 2 {
        return ShiftResult {
            teams: teams.to_vec(),
            players: players.to_vec(),
        };
    }

    let mut order: Vec<&Player> = players.iter().collect();
    order.sort_by_key(|player| crate::session::rng::mix(draw ^ hash_of(&player.id)));

    let mut new_teams: Vec<Team> = teams
        .iter()
        .map(|team| Team {
            id: team.id.clone(),
            name: team.name.clone(),
            player_ids: Vec::new(),
            score: 0,
            color: team.color.clone(),
        })
        .collect();

    for (index, player) in order.iter().enumerate() {
        let team_index = index % new_teams.len();
        if let Some(team) = new_teams.get_mut(team_index) {
            team.player_ids.push(player.id.clone());
        }
    }

    let mut new_players: Vec<Player> = Vec::with_capacity(players.len());
    for player in players {
        let team_id = new_teams
            .iter()
            .find(|team| team.player_ids.contains(&player.id))
            .map(|team| team.id.clone());
        let mut updated = player.clone();
        updated.team_id = team_id;
        new_players.push(updated);
    }

    for team in &mut new_teams {
        team.score = team_score(&team.player_ids, &new_players);
    }

    ShiftResult {
        teams: new_teams,
        players: new_players,
    }
}

/// The sum of the points of the members of a team.
fn team_score(player_ids: &[String], players: &[Player]) -> i64 {
    player_ids
        .iter()
        .filter_map(|id| players.iter().find(|player| &player.id == id))
        .map(|player| player.score)
        .sum()
}

/// The rule that decides who leaves the game.
///
/// WHY: the reference implementation has the fields but no rule
/// (`docs/design/GAME-CONTRACT.md` § 6.5, deviation A7); the rule is
/// optional and switched off by default.
///
/// EXAMPLE: `EliminationRule::None` eliminates nobody.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EliminationRule {
    /// Nobody is eliminated. This is the behaviour of the reference
    /// implementation: the fields `isEliminated` and `isSpectator` exist,
    /// but no code path sets them
    /// (`docs/design/GAME-CONTRACT.md` § 6.5, deviation A7).
    None,
    /// Everybody whose score lies below the threshold is eliminated at the
    /// end of a rotation.
    BelowScore {
        /// The threshold below which a player is eliminated.
        threshold: i64,
    },
}

/// Applies the elimination rule to the players.
///
/// WHY: the reference implementation has the fields but no rule that sets
/// them (`docs/design/GAME-CONTRACT.md` § 6.5, deviation A7); the base
/// offers the rule so that a shell can switch it on.
///
/// An eliminated player becomes a spectator: they keep playing along, but
/// their answers do not count towards the scoreboard
/// (`src/types/player.ts:31-43`).
///
/// EXAMPLE: with a threshold of 5 and a player with 3 points the player is
/// eliminated.
pub fn apply_elimination(rule: EliminationRule, players: &[Player]) -> Vec<Player> {
    players
        .iter()
        .map(|player| {
            let mut updated = player.clone();
            let eliminate = match rule {
                EliminationRule::None => false,
                EliminationRule::BelowScore { threshold } => updated.score < threshold,
            };
            if eliminate {
                updated.is_eliminated = true;
                updated.is_spectator = true;
            }
            updated
        })
        .collect()
}

/// A stable hash of an identifier, used to make the redistribution
/// reproducible.
fn hash_of(id: &str) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in id.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{EliminationRule, TeamMode, apply_elimination, build_turn_order, shift_teams};
    use crate::session::model::{Player, Team};

    fn player(id: &str, score: i64, team_id: Option<&str>) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            score,
            team_id: team_id.map(str::to_string),
            is_eliminated: false,
            is_spectator: false,
            is_pilot: false,
            color: None,
            avatar: None,
        }
    }

    fn team(id: &str, player_ids: &[&str], score: i64) -> Team {
        Team {
            id: id.to_string(),
            name: id.to_string(),
            player_ids: player_ids.iter().map(|p| (*p).to_string()).collect(),
            score,
            color: None,
        }
    }

    #[test]
    fn the_individual_mode_orders_the_players() {
        let players = vec![player("a", 0, None), player("b", 0, None)];
        let order = build_turn_order(TeamMode::Individual, &players, &[]);
        assert_eq!(order, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn the_team_modes_order_the_teams() {
        let teams = vec![team("t1", &[], 0), team("t2", &[], 0)];
        assert_eq!(
            build_turn_order(TeamMode::Fixed, &[], &teams),
            vec!["t1".to_string(), "t2".to_string()]
        );
        assert_eq!(
            build_turn_order(TeamMode::Shifting, &[], &teams),
            vec!["t1".to_string(), "t2".to_string()]
        );
    }

    #[test]
    fn the_redistribution_spreads_the_players_over_the_teams() {
        let teams = vec![team("t1", &[], 0), team("t2", &[], 0)];
        let players = vec![
            player("a", 3, None),
            player("b", 5, None),
            player("c", 7, None),
        ];
        let result = shift_teams(&teams, &players, 42);
        let total: usize = result.teams.iter().map(|t| t.player_ids.len()).sum();
        assert_eq!(total, 3);
        let first = result
            .teams
            .first()
            .map(|t| t.player_ids.len())
            .unwrap_or(0);
        let second = result.teams.get(1).map(|t| t.player_ids.len()).unwrap_or(0);
        assert_eq!(first + second, 3);
    }

    #[test]
    fn the_redistribution_recomputes_the_team_scores() {
        let teams = vec![team("t1", &[], 0), team("t2", &[], 0)];
        let players = vec![
            player("a", 3, None),
            player("b", 5, None),
            player("c", 7, None),
        ];
        let result = shift_teams(&teams, &players, 42);
        let sum: i64 = result.teams.iter().map(|t| t.score).sum();
        assert_eq!(sum, 15, "the team scores are the sum of the member scores");
    }

    #[test]
    fn a_single_team_is_not_redistributed() {
        let teams = vec![team("t1", &["a"], 3)];
        let players = vec![player("a", 3, Some("t1"))];
        let result = shift_teams(&teams, &players, 42);
        let team = result.teams.first();
        assert_eq!(
            team.map(|team| team.player_ids.clone()),
            Some(vec!["a".to_string()])
        );
        assert_eq!(team.map(|team| team.score), Some(3));
    }

    #[test]
    fn without_a_rule_nobody_is_eliminated() {
        let players = vec![player("a", 0, None)];
        let result = apply_elimination(EliminationRule::None, &players);
        let player = result.first();
        assert!(!player.is_some_and(|player| player.is_eliminated));
        assert!(!player.is_some_and(|player| player.is_spectator));
    }

    #[test]
    fn a_player_below_the_threshold_is_eliminated() {
        let players = vec![player("a", 3, None), player("b", 9, None)];
        let result = apply_elimination(EliminationRule::BelowScore { threshold: 5 }, &players);
        let first = result.first();
        let second = result.get(1);
        assert!(first.is_some_and(|player| player.is_eliminated));
        assert!(first.is_some_and(|player| player.is_spectator));
        assert!(!second.is_some_and(|player| player.is_eliminated));
    }
}
