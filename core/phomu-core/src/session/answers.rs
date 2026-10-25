//! The answers of a round and the transitions that follow them.
//!
//! WHAT: the submission of an answer, the locking of the answers and the
//! release of the solution.
//!
//! WHY: the reveal is the moment the solution becomes visible, and the
//! guarantee that it only happens after the answers are locked in is the
//! anti-spoiler promise of the product (GAME-002, CORE-006). The rule is
//! enforced here, in the state machine — not in the shell, and not by
//! hiding a field.

use phomu_errors::{ErrorCode, PhomuError, Result};

use crate::modes::{GameMode, ModeAnswer, ModeOutcome, evaluate_mode_answer};
use crate::rules::phase::RoundPhase;
use crate::session::dto::ScoreSnapshot;
use crate::session::model::{AnswerValue, PlayerAnswer};
use crate::session::state::Session;
use crate::spoiler::view::RoundView;

/// A cheat a player may use.
///
/// WHY: the cheats differ in their price and in their effect; the set is
/// closed, so that the core can decide what a cheat costs
/// (docs/design/GAME-CONTRACT.md` § 4).
///
/// EXAMPLE: `Cheat::TimelineJoker` is the joker of the Timeline mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cheat {
    /// The decade hint of the Timeline mode.
    TimelineDecadeHint,
    /// The joker of the Timeline mode.
    TimelineJoker,
    /// The music cheat of the Hint-Master mode.
    HintMasterMusic,
    /// The artist reveal of the Survivor mode.
    SurvivorArtist,
    /// The option halving of the Vibe-Check mode.
    VibeCheckOptions,
}

impl Cheat {
    /// The identifier of the cheat.
    ///
    /// WHY: the identifier is the key of the cheat in the persisted state of
    /// the round and in the locale files of the shells.
    ///
    /// EXAMPLE: `Cheat::TimelineJoker.as_str()` is `"timeline-joker"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            Cheat::TimelineDecadeHint => "timeline-decade-hint",
            Cheat::TimelineJoker => "timeline-joker",
            Cheat::HintMasterMusic => "hint-master-music",
            Cheat::SurvivorArtist => "survivor-artist",
            Cheat::VibeCheckOptions => "vibe-check-options",
        }
    }
}

impl Session {
    /// Submits the answer of the active player.
    ///
    /// WHY: the points are awarded here and not in the mode: the mode
    /// decides what the answer is worth, the session applies the time decay
    /// and credits the points (GAME-015, GAME-038).
    ///
    /// # Errors
    /// Returns the error `GameAlreadyOver` when the game has ended, the
    /// error `NotAvailableInPhase` when the round is not in the phase
    /// `question` or when its answers are already locked in, the error
    /// `NoActivePlayer` when the turn order is empty, the error
    /// `NoSongDrawn` when no song has been drawn and the error
    /// `InvalidAnswer` when the answer does not fit the mode of the round.
    ///
    /// EXAMPLE: a correct Survivor answer of the pilot raises the score of
    /// the pilot by three points.
    pub fn submit_answer(
        &mut self,
        answer: &ModeAnswer,
        answered_in_seconds: Option<u32>,
    ) -> Result<ScoreSnapshot> {
        if self.state.is_game_over {
            return Err(PhomuError::new(ErrorCode::GameAlreadyOver));
        }
        if !self.state.round.phase.accepts_answers() {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        // The lock is enforced in the state machine and not only in the
        // rendering: a shell that tries to answer a locked round gets an
        // error, it cannot slip an answer in (GAME-002, ADR-0003).
        if self.state.round.answers_locked {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str())
                .with_context("reason", "answersLocked"));
        }
        let entity_id = self
            .active_turn_id()
            .ok_or_else(|| PhomuError::new(ErrorCode::NoActivePlayer))?
            .to_string();
        let mode = self.state.round.mode;
        let song_year = self
            .state
            .round
            .song
            .as_ref()
            .map(|song| song.year)
            .unwrap_or_default();
        let outcome: ModeOutcome = {
            let song = self
                .state
                .round
                .song
                .as_ref()
                .ok_or_else(|| PhomuError::new(ErrorCode::NoSongDrawn))?;
            let context = crate::modes::ModeContext::new(
                &self.state.timeline_years,
                self.state.config.timeline_max_points,
            );
            evaluate_mode_answer(mode, answer, song, &context)?
        };

        let base_points = outcome.points;
        let measured_time = if mode.measures_answer_time() {
            answered_in_seconds
        } else {
            None
        };
        let points = crate::session::ending::points_after_decay(
            &self.state,
            base_points,
            outcome.is_correct,
            measured_time,
        );

        let record = PlayerAnswer {
            player_id: entity_id.clone(),
            answer: if outcome.is_correct {
                AnswerValue::Correct
            } else {
                AnswerValue::Incorrect
            },
            is_correct: outcome.is_correct,
            points_awarded: points,
            answered_in_seconds: measured_time,
        };
        self.state.round.answers.push(record);

        if outcome.is_correct && points > 0 {
            self.credit_points(&entity_id, i64::from(points));
        }

        if mode == GameMode::Timeline && outcome.is_correct {
            self.apply_timeline_year(song_year);
        }

        let expected = self.state.config.expected_answers(self.state.players.len());
        if self.state.round.answers.len() >= expected {
            self.lock_answers()?;
        }

        let is_team = self.state.teams.iter().any(|team| team.id == entity_id);
        let player_id = if is_team {
            None
        } else {
            Some(entity_id.clone())
        };
        let team_id = if is_team {
            Some(entity_id.clone())
        } else {
            self.player_team(&entity_id)
        };
        Ok(ScoreSnapshot {
            round_number: self.state.current_round,
            player_id,
            is_correct: outcome.is_correct,
            points_awarded: points,
            player_score: if is_team {
                0
            } else {
                self.player_score(&entity_id)
            },
            team_id: team_id.clone(),
            team_score: self.team_score(&team_id),
            phase: self.state.round.phase,
        })
    }

    /// Locks the answers of the round in.
    ///
    /// WHY: from this moment no further answer is accepted, and the round
    /// is ready for the reveal. The lock is both a state of the round
    /// (`answers_locked`) and a phase (`locked-in`): the phase makes the
    /// guarantee observable for a shell, the flag makes it enforceable in
    /// the state machine.
    ///
    /// The reference implementation types `locked-in` but never enters it
    /// (`docs/design/GAME-CONTRACT.md` § 2.1, deviation A6). The shared core
    /// closes that deviation: the phase is entered when the last expected
    /// answer arrives. This is the deliberate difference to the reference
    /// and is listed as an intentional deviation in the conformance report.
    ///
    /// # Errors
    /// Returns the error `NotAvailableInPhase` when the round is not in the
    /// phase `question` and the error `AnswersNotLocked` when fewer answers
    /// have been submitted than the round expects.
    ///
    /// EXAMPLE: after the last answer of a round with one player, the phase
    /// is `locked-in` and a further answer is refused.
    pub fn lock_answers(&mut self) -> Result<()> {
        if self.state.round.answers_locked {
            return Ok(());
        }
        if !self.state.round.phase.accepts_answers() {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        let expected = self.state.config.expected_answers(self.state.players.len());
        let answers = self.state.round.answers.len();
        if answers < expected {
            return Err(PhomuError::new(ErrorCode::AnswersNotLocked)
                .with_context("answers", answers.to_string())
                .with_context("expected", expected.to_string()));
        }
        self.state.round.answers_locked = true;
        self.state.round.phase = RoundPhase::LockedIn;
        Ok(())
    }

    /// Releases the solution of the round.
    ///
    /// WHY: the reveal is only permitted when the answers are locked in. A
    /// shell that asks for the reveal before that receives the error
    /// `AnswersNotLocked` — the guarantee is in the state machine and not in
    /// the rendering (C-3).
    ///
    /// # Errors
    /// Returns the error `AnswersNotLocked` when the answers of the round
    /// are not locked in yet, and the error `NoSongDrawn` when the round has
    /// no song.
    ///
    /// EXAMPLE: the reveal of a locked round hands out the solution.
    pub fn reveal(&mut self) -> Result<RoundView> {
        if self.state.round.phase == RoundPhase::Reveal {
            return self.round_view();
        }
        if !self.state.round.answers_locked {
            return Err(PhomuError::new(ErrorCode::AnswersNotLocked)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        self.state.round.phase = RoundPhase::Reveal;
        self.round_view()
    }

    /// Reveals the round without an answer — the timeout of the question.
    ///
    /// EXAMPLE: the timeout of a round that nobody answered reveals the
    /// round without a score.
    ///
    /// WHY: when the question round expires, the round is revealed without
    /// being scored as wrong (`src/app/game/page.tsx:232-236`). The answers
    /// are locked in first, so that the reveal never happens while an answer
    /// could still arrive.
    ///
    /// # Errors
    /// Returns the error `AnswersNotLocked` when the round could not be
    /// locked in, and the error `NoSongDrawn` when the round has no song.
    pub fn force_reveal(&mut self) -> Result<RoundView> {
        if self.state.round.phase.accepts_answers() {
            // The timeout locks the round: no further answer is accepted.
            self.state.round.answers_locked = true;
        }
        self.reveal()
    }
}
