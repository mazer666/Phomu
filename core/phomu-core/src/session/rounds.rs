//! The rounds of a session and the cheats of a round.
//!
//! WHAT: the closing of a round, the drawing of the next one, the use of a
//! cheat and the maintenance of the shared timeline.
//!
//! WHY: the round boundary is where the rules of the game meet: the round
//! is logged, the ending condition is checked, the turn moves on, the teams
//! are shifted and the players are eliminated. All of it happens in one
//! place, so that the order of the steps cannot drift.

use phomu_errors::{ErrorCode, PhomuError, Result};

use crate::rules::phase::RoundPhase;
use crate::session::answers::Cheat;
use crate::session::model::RoundRecord;
use crate::session::round::ModeProgress;
use crate::session::state::Session;
use crate::spoiler::view::RoundView;

impl Session {
    /// Closes the round and prepares the next one.
    ///
    /// WHY: the round is logged before the next one begins, and a round
    /// without a drawn song is not logged (GAME-005).
    ///
    /// # Errors
    /// Returns the error `GameAlreadyOver` when the game has already ended
    /// and the error `NotAvailableInPhase` when the round is neither in the
    /// phase `reveal` nor in the phase `drawing`.
    ///
    /// EXAMPLE: the round history grows by one entry per finished round.
    pub fn next_round(&mut self, now_ms: u64) -> Result<RoundView> {
        if self.state.is_game_over {
            return Err(PhomuError::new(ErrorCode::GameAlreadyOver));
        }
        if self.state.round.phase != RoundPhase::Reveal
            && self.state.round.phase != RoundPhase::Drawing
        {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }

        if self.state.round.song.is_some() {
            let song = self
                .state
                .round
                .song
                .clone()
                .ok_or_else(|| PhomuError::new(ErrorCode::NoSongDrawn))?;
            self.state.round_history.push(RoundRecord {
                round_number: self.state.current_round,
                mode: self.state.round.mode,
                song,
                answers: self.state.round.answers.clone(),
                completed_at_ms: now_ms,
            });
        }

        let decision = crate::session::ending::evaluate_session_ending(&self.state, now_ms);
        if decision.should_end {
            return self.end_game(decision.winner_id);
        }

        self.state.current_round += 1;
        self.state.round.phase = RoundPhase::Drawing;
        self.state.round.song = None;
        self.state.round.answers.clear();
        self.state.round.answers_locked = false;
        self.state.round.progress = ModeProgress::default();
        self.state.round.mode = self.pick_mode();

        if !self.state.turn_order.is_empty() {
            self.state.current_turn_index =
                (self.state.current_turn_index + 1) % self.state.turn_order.len();
        }

        self.apply_team_shift();
        self.apply_elimination();

        self.round_view()
    }

    /// Uses a cheat and deducts its price.
    ///
    /// WHY: the help has to cost something, otherwise the pilot asks for the
    /// help and guesses immediately (GAME-021, GAME-022, GAME-024, GAME-033).
    /// In the mode without cheats the cheat is refused (GAME-037).
    ///
    /// # Errors
    /// Returns the error `ModeNotEnabled` when the cheats are switched off
    /// or when the mode of the round has no cheat, the error
    /// `NotAvailableInPhase` when the round does not accept answers and the
    /// error `InvalidTransition` when the cheat of the round has already
    /// been used.
    ///
    /// EXAMPLE: the decade hint costs two points.
    pub fn use_cheat(&mut self, cheat: Cheat) -> Result<i64> {
        if self.state.config.no_cheat_mode {
            return Err(
                PhomuError::new(ErrorCode::ModeNotEnabled).with_context("cheat", cheat.as_str())
            );
        }
        if !self.state.round.phase.accepts_answers() {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        if self.state.round.progress.cheat_used {
            return Err(
                PhomuError::new(ErrorCode::InvalidTransition).with_context("cheat", cheat.as_str())
            );
        }
        let mode = self.state.round.mode;
        if !mode.has_cheat() {
            return Err(
                PhomuError::new(ErrorCode::ModeNotEnabled).with_context("mode", mode.as_str())
            );
        }
        let entity_id = self
            .active_turn_id()
            .ok_or_else(|| PhomuError::new(ErrorCode::NoActivePlayer))?
            .to_string();
        let penalty = match cheat {
            Cheat::TimelineDecadeHint => phomu_config::CHEAT_PENALTY_TIMELINE_DECADE,
            Cheat::TimelineJoker => phomu_config::CHEAT_PENALTY_TIMELINE_JOKER,
            Cheat::HintMasterMusic => phomu_config::CHEAT_PENALTY_HINT_MASTER_MUSIC,
            Cheat::SurvivorArtist => phomu_config::CHEAT_PENALTY_SURVIVOR,
            Cheat::VibeCheckOptions => 0,
        };
        if cheat == Cheat::TimelineJoker {
            self.remove_joker_slot();
        }
        self.state.round.progress.cheat_used = true;
        self.credit_points(&entity_id, penalty);
        Ok(penalty)
    }

    /// The decade of the year of the song — the hint of the Timeline mode.
    ///
    /// WHY the base computes it: the year of the song is the answer of the
    /// Timeline mode. Only the base may turn it into a hint, because only
    /// the base knows the year.
    ///
    /// EXAMPLE: the song of 1985 offers the hint `1980`.
    pub fn decade_hint(&self) -> Option<i32> {
        self.state.round.song.as_ref().map(|song| song.decade())
    }

    /// The options of the Vibe-Check with the cheat applied.
    ///
    /// WHY the base builds them: the cheated list has to keep the correct
    /// mood of the song, and only the base knows which mood that is.
    ///
    /// EXAMPLE: the cheated list of the Vibe-Check has three options.
    pub fn vibe_options_with_cheat(&mut self) -> Vec<String> {
        let Some(song) = self.state.round.song.as_ref() else {
            return Vec::new();
        };
        let draw = self.rng.next_u64();
        crate::modes::vibe_check::build_options(&song.mood, true, draw)
    }

    /// Removes a year from the timeline.
    ///
    /// WHY: from more than ten years on the player may remove one year
    /// (GAME-020). The removal is voluntary.
    ///
    /// EXAMPLE: the year 1990 is removed from the timeline of the round.
    ///
    /// # Errors
    /// Returns the error `InvalidAnswer` when the timeline does not carry
    /// the year.
    pub fn remove_timeline_year(&mut self, year: i32) -> Result<()> {
        let Some(index) = self
            .state
            .timeline_years
            .iter()
            .position(|candidate| *candidate == year)
        else {
            return Err(
                PhomuError::new(ErrorCode::InvalidAnswer).with_context("year", year.to_string())
            );
        };
        self.state.timeline_years.remove(index);
        self.state.round.progress.removal_offered = false;
        Ok(())
    }

    /// Adds the year of a correct timeline answer to the timeline.
    ///
    /// WHY: after a correct placement the year of the song is added. If a
    /// duplicate arises, the duplicate is removed again immediately; from
    /// more than ten years on the player is offered the removal of one year
    /// (GAME-019, GAME-020).
    pub(crate) fn apply_timeline_year(&mut self, year: i32) {
        let effect = crate::modes::timeline::apply_year(&self.state.timeline_years, year);
        self.state.timeline_years.push(year);
        self.state.timeline_years.sort_unstable();
        if effect.is_duplicate {
            if let Some(index) = self
                .state
                .timeline_years
                .iter()
                .position(|candidate| *candidate == year)
            {
                self.state.timeline_years.remove(index);
            }
        }
        self.state.round.progress.removal_offered = effect.removal_offered;
    }

    /// Removes one wrong slot of the timeline with the joker.
    ///
    /// WHY: the joker removes exactly one wrong slot and costs one point
    /// (GAME-022). The slot is drawn from the seeded generator of the
    /// session, so that the joker is reproducible.
    fn remove_joker_slot(&mut self) {
        let valid = crate::modes::timeline::valid_slots(
            self.state
                .round
                .song
                .as_ref()
                .map(|song| song.year)
                .unwrap_or_default(),
            &self.state.timeline_years,
        );
        let slot_count = self.state.timeline_years.len() + 1;
        let wrong = crate::modes::timeline::joker_slots(&valid, slot_count);
        if wrong.is_empty() {
            return;
        }
        let index = self.rng.index(wrong.len());
        if let Some(slot) = wrong.get(index) {
            self.state.round.progress.joker_slot = Some(*slot);
        }
    }

    /// Starts the timeline with the given years.
    ///
    /// EXAMPLE: the timeline starts with the years 1970, 1980 and 1990.
    ///
    /// WHY: the timeline starts with three year numbers (GAME-017). The
    /// years themselves are drawn from the catalogue by the shell — the
    /// core has no catalogue — but the rule (three distinct years, sorted
    /// ascending) belongs to the base.
    ///
    /// # Errors
    /// Returns the error `InvalidAnswer` when the years are not three
    /// distinct numbers.
    pub fn init_timeline(&mut self, years: Vec<i32>) -> Result<()> {
        if years.len() != phomu_config::TIMELINE_INITIAL_YEARS {
            return Err(PhomuError::new(ErrorCode::InvalidAnswer)
                .with_context("years", years.len().to_string())
                .with_context("expected", phomu_config::TIMELINE_INITIAL_YEARS.to_string()));
        }
        let mut sorted = years;
        sorted.sort_unstable();
        sorted.dedup();
        if sorted.len() != phomu_config::TIMELINE_INITIAL_YEARS {
            return Err(
                PhomuError::new(ErrorCode::InvalidAnswer).with_context("years", "not distinct")
            );
        }
        self.state.timeline_years = sorted;
        Ok(())
    }
}
