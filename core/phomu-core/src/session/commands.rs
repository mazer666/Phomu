//! The commands of a session that the lobby and the power user need.
//!
//! WHAT: the commands that change the session outside of a round — the
//! team administration, the reset of the scores, the change of the
//! configuration, the crediting of points and the rehydration of a stored
//! state.
//!
//! WHY: the conformance vectors and the future bridges have to be able to
//! put a session into a given state and to act on it the way the lobby and
//! the power-user menu do. The rules stay in the core; the shell only names
//! the command.

use phomu_errors::{ErrorCode, PhomuError, Result};

use crate::rules::phase::RoundPhase;
use crate::rules::scoring::award_points;
use crate::session::config::GameConfig;
use crate::session::model::SessionState;
use crate::session::model::{AnswerValue, PlayerAnswer};
use crate::session::state::Session;

impl Session {
    /// Creates a session from a stored state.
    ///
    /// WHY: the state is persisted on every platform and rehydrated after a
    /// crash or a process restart. A state carries a schema version, and a
    /// state of an unknown version is rejected with a typed error
    /// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-103).
    ///
    /// # Errors
    /// Returns the error `InvalidConfiguration` when the state carries a
    /// schema version that the base does not know.
    ///
    /// EXAMPLE: a reloaded session continues with the same generator.
    pub fn from_state(state: SessionState, seed: u64) -> Result<Self> {
        if state.schema_version != crate::session::state::SCHEMA_VERSION {
            return Err(PhomuError::new(ErrorCode::InvalidConfiguration)
                .with_context("schemaVersion", state.schema_version.to_string())
                .with_context(
                    "expected",
                    crate::session::state::SCHEMA_VERSION.to_string(),
                ));
        }
        let rng_state = state.rng_state;
        Ok(Self {
            state,
            rng: crate::session::rng::Rng::new(seed),
        })
        .map(|mut session| {
            session.rng.set_state(rng_state);
            session
        })
    }

    /// Moves the round into another phase.
    ///
    /// WHY: the transition table of the automaton decides which phases may
    /// follow each other. The reveal locks the answers in first, so that
    /// the solution is never released while an answer could still arrive
    /// (GAME-002).
    ///
    /// The edge `question → reveal` is **not** taken through this command:
    /// the reveal lock refuses it until the answers of the round are locked
    /// in. The end of the question round — the timeout — is a command of its
    /// own ([`Session::force_reveal`]), because the timeout ends the round
    /// without an answer and is not the same event as the release of a
    /// locked round.
    ///
    /// # Errors
    /// Returns the error `InvalidTransition` when the automaton does not
    /// allow the transition and the error `AnswersNotLocked` when the round
    /// has not collected all expected answers.
    ///
    /// EXAMPLE: the phase `reveal` is reached from the phase `question`.
    pub fn advance_phase(&mut self, phase: RoundPhase) -> Result<()> {
        let current = self.state.round.phase;
        if current == phase {
            return Ok(());
        }
        if !current.can_transition_to(phase) {
            return Err(PhomuError::new(ErrorCode::InvalidTransition)
                .with_context("from", current.as_str())
                .with_context("to", phase.as_str()));
        }
        match phase {
            RoundPhase::LockedIn => {
                self.lock_answers()?;
                self.state.round.phase = RoundPhase::LockedIn;
            }
            RoundPhase::Reveal => {
                if current == RoundPhase::Question {
                    self.lock_answers()?;
                }
                self.state.round.phase = RoundPhase::Reveal;
            }
            RoundPhase::Drawing => {
                self.state.round.phase = RoundPhase::Drawing;
                self.state.round.answers.clear();
                self.state.round.answers_locked = false;
            }
            RoundPhase::Scoring => {
                self.state.round.phase = RoundPhase::Scoring;
                self.state.is_game_over = true;
            }
            RoundPhase::Question => {
                self.state.round.phase = RoundPhase::Question;
            }
        }
        Ok(())
    }

    /// Records an answer without evaluating a mode.
    ///
    /// WHY: the power-user menu can correct an answer after the fact
    /// (`src/app/game/page.tsx:197-215`). The recording of the answer and
    /// the evaluation of a mode are two different things.
    ///
    /// # Errors
    /// Returns the error `NotAvailableInPhase` when the round is not in the
    /// phase `question` or when its answers are already locked in.
    ///
    /// EXAMPLE: an answer that is corrected is worth one point.
    pub fn submit_answer_raw(
        &mut self,
        player_id: &str,
        answer: &str,
        is_correct: bool,
        points_awarded: i64,
        answered_in_seconds: Option<u32>,
    ) -> Result<()> {
        if self.state.round.phase != RoundPhase::Question {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        if self.state.round.answers_locked {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str())
                .with_context("reason", "answersLocked"));
        }
        self.state.round.answers.push(PlayerAnswer {
            player_id: player_id.to_string(),
            answer: AnswerValue::Text(answer.to_string()),
            is_correct,
            points_awarded: points_awarded.max(0) as u32,
            answered_in_seconds,
        });
        Ok(())
    }

    /// Credits points to a player or to a team.
    ///
    /// WHY: the cheat deductions and the override of the power user credit
    /// points directly (`src/stores/game-store.ts:451-476`). A score never
    /// becomes negative (GAME-006).
    ///
    /// # Errors
    /// Returns the error `UnknownPlayer` when the session knows neither a
    /// player nor a team with that identifier.
    ///
    /// EXAMPLE: crediting −5 points to a score of 3 yields zero.
    pub fn award_points(&mut self, entity_id: &str, points: i64) -> Result<()> {
        let known = self.state.players.iter().any(|p| p.id == entity_id)
            || self.state.teams.iter().any(|t| t.id == entity_id);
        if !known {
            return Err(PhomuError::new(ErrorCode::UnknownPlayer)
                .with_context("entityId", entity_id.to_string()));
        }
        if let Some(team) = self
            .state
            .teams
            .iter_mut()
            .find(|candidate| candidate.id == entity_id)
        {
            team.score = award_points(team.score, points);
            return Ok(());
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
        Ok(())
    }

    /// Adds a year to the timeline.
    ///
    /// WHY: the years are added in the ascending order, so that the slot
    /// of the Timeline mode stays comparable with the year of the song.
    ///
    /// # Errors
    /// Currently never fails; the signature keeps the shape of the other
    /// commands of the session.
    ///
    /// EXAMPLE: the year 1985 is added in the ascending order.
    pub fn add_timeline_year(&mut self, year: i32) -> Result<()> {
        self.state.timeline_years.push(year);
        self.state.timeline_years.sort_unstable();
        Ok(())
    }

    /// Removes a team and clears the memberships.
    ///
    /// WHY: a player without a team plays for themselves
    /// (`src/stores/game-store.ts:562-570`).
    ///
    /// EXAMPLE: the team `t0` is removed and its players play on their own.
    ///
    /// # Errors
    /// Returns the error `UnknownTeam` when the session does not know the
    /// team.
    pub fn remove_team(&mut self, team_id: &str) -> Result<()> {
        if !self.state.teams.iter().any(|team| team.id == team_id) {
            return Err(
                PhomuError::new(ErrorCode::UnknownTeam).with_context("teamId", team_id.to_string())
            );
        }
        self.state.teams.retain(|team| team.id != team_id);
        for player in &mut self.state.players {
            if player.team_id.as_deref() == Some(team_id) {
                player.team_id = None;
            }
        }
        Ok(())
    }

    /// Resets the scores of the session.
    ///
    /// WHY: the reset clears the scores, the round history, the played
    /// songs and the timeline, but keeps the experience points and the
    /// configuration (`src/stores/game-store.ts:479-493`).
    ///
    /// EXAMPLE: after the reset every player has the score zero and the
    /// round history is empty.
    pub fn reset_scores(&mut self) {
        for player in &mut self.state.players {
            player.score = 0;
        }
        for team in &mut self.state.teams {
            team.score = 0;
        }
        self.state.current_round = 0;
        self.state.round_history.clear();
        self.state.played_song_ids.clear();
        self.state.round.answers.clear();
        self.state.round.song = None;
        self.state.round.answers_locked = false;
        self.state.is_game_over = false;
        self.state.winner_id = None;
        self.state.round.phase = RoundPhase::Drawing;
        self.state.timeline_years.clear();
    }

    /// Replaces the configuration of the session.
    ///
    /// WHY: the configuration is read-only during a game and is changed in
    /// the lobby (docs/design/BUILD-CONTRACT.md § 5.1, rule K-4).
    ///
    /// EXAMPLE: the lobby replaces the configuration before the game
    /// starts.
    pub fn set_config(&mut self, config: GameConfig) {
        self.state.config = config;
    }
}
