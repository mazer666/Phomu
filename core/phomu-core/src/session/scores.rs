//! The scores of a session.
//!
//! WHAT: the crediting of points, the reading of the scores of a player and
//! of a team, the redistribution of the players in the shifting team mode
//! and the elimination rule.
//!
//! WHY: the scoreboard has to agree on every device
//! (docs/design/PLATFORM-ARCHITECTURE.md § 4.1). The points of a player
//! flow to their team (GAME-007), a score never becomes negative (GAME-006)
//! and the sum of the points of the members of a team is the score of the
//! team — also after a redistribution.

use crate::rules::scoring::award_points;
use crate::rules::teams::{self, EliminationRule, TeamMode};
use crate::session::state::Session;

impl Session {
    /// Credits points to the entity of the turn.
    ///
    /// WHY: the points of a player flow to their team (GAME-007), and a
    /// score never becomes negative (GAME-006). In the team modes the turn
    /// belongs to the team, and only the team is credited
    /// (`src/stores/game-store.ts:451-476`).
    pub(crate) fn credit_points(&mut self, entity_id: &str, points: i64) {
        if let Some(team) = self
            .state
            .teams
            .iter_mut()
            .find(|candidate| candidate.id == entity_id)
        {
            team.score = award_points(team.score, points);
            return;
        }
        if let Some(player) = self
            .state
            .players
            .iter_mut()
            .find(|candidate| candidate.id == entity_id)
        {
            player.score = award_points(player.score, points);
            let team_id = player.team_id.clone();
            if let Some(team_id) = team_id {
                if let Some(team) = self
                    .state
                    .teams
                    .iter_mut()
                    .find(|candidate| candidate.id == team_id)
                {
                    team.score = award_points(team.score, points);
                }
            }
        }
    }

    /// The score of a player.
    pub(crate) fn player_score(&self, player_id: &str) -> i64 {
        self.state
            .players
            .iter()
            .find(|player| player.id == player_id)
            .map(|player| player.score)
            .unwrap_or_default()
    }

    /// The team of a player.
    pub(crate) fn player_team(&self, player_id: &str) -> Option<String> {
        self.state
            .players
            .iter()
            .find(|player| player.id == player_id)
            .and_then(|player| player.team_id.clone())
    }

    /// The score of a team.
    pub(crate) fn team_score(&self, team_id: &Option<String>) -> Option<i64> {
        let team_id = team_id.as_ref()?;
        self.state
            .teams
            .iter()
            .find(|team| &team.id == team_id)
            .map(|team| team.score)
    }

    /// Redistributes the players in the shifting team mode.
    pub(crate) fn apply_team_shift(&mut self) {
        if self.state.config.team_mode != TeamMode::Shifting {
            return;
        }
        let draw = self.rng.next_u64();
        let result = teams::shift_teams(&self.state.teams, &self.state.players, draw);
        self.state.teams = result.teams;
        self.state.players = result.players;
    }

    /// Applies the elimination rule.
    pub(crate) fn apply_elimination(&mut self) {
        let rule = self.state.config.elimination_rule;
        if rule == EliminationRule::None {
            return;
        }
        self.state.players = teams::apply_elimination(rule, &self.state.players);
    }
}
