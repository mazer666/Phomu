//! The session: the state and the automaton that moves it.
//!
//! WHAT: the state of a session ([`SessionState`]) and the [`Session`] that
//! changes it.
//!
//! WHY: the session is the one place where the rules of the game meet. It
//! owns the phase automaton, the scoring, the turn order and the ending
//! conditions; the shell only sends commands and draws the view models.
//!
//! The session reads no clock and draws no randomness on its own: the time
//! and the seed arrive with the commands
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 1).

use phomu_catalog::Song;
use phomu_errors::{ErrorCode, PhomuError, Result};

use crate::modes::GameMode;
use crate::rules::phase::RoundPhase;
use crate::rules::teams;
use crate::session::config::GameConfig;
use crate::session::dto::SessionSnapshot;
use crate::session::model::{Player, SessionState, SongSource, Team};
use crate::session::rng::Rng;
use crate::session::round::{ModeProgress, RoundState};
use crate::spoiler::view::{RoundView, ScoringView};

/// The version of the state schema.
///
/// WHY: the state is persisted on every platform and rehydrated after a
/// crash. A state without a version cannot be migrated
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-103).
pub const SCHEMA_VERSION: u32 = 1;

/// A running session.
///
/// WHY: the session is the piece that the bridges hold; it owns the phase
/// automaton, the scoring, the turn order and the ending conditions.
///
/// EXAMPLE: a new session is in the phase `drawing` and has no player.
#[derive(Debug, Clone)]
pub struct Session {
    pub(crate) state: SessionState,
    pub(crate) rng: Rng,
}

impl Session {
    /// Creates a session.
    ///
    /// WHY: the seed and the time are parameters, because the core reads no
    /// clock and draws no randomness on its own.
    ///
    /// # Errors
    /// Returns the error `InvalidPlayerCount` when the session is created
    /// with more players than `MAX_PLAYERS`.
    ///
    /// EXAMPLE: a session with two players and the seed 42.
    pub fn new(
        config: GameConfig,
        players: Vec<Player>,
        teams: Vec<Team>,
        artist_pool: Vec<String>,
        seed: u64,
        now_ms: u64,
    ) -> Result<Self> {
        if players.len() > phomu_config::MAX_PLAYERS {
            return Err(PhomuError::new(ErrorCode::InvalidPlayerCount)
                .with_context("players", players.len().to_string())
                .with_context("maximum", phomu_config::MAX_PLAYERS.to_string()));
        }
        let session_id = format!("session-{seed:016x}");
        let mut session = Self {
            state: SessionState {
                schema_version: SCHEMA_VERSION,
                session_id,
                players,
                teams,
                turn_order: Vec::new(),
                current_turn_index: 0,
                config,
                current_round: 0,
                round: RoundState::default(),
                round_history: Vec::new(),
                played_song_ids: Vec::new(),
                is_game_over: false,
                winner_id: None,
                total_xp: 0,
                timeline_years: Vec::new(),
                game_start_ms: None,
                seed,
                rng_state: seed,
                artist_pool,
                auto_draw_intent: false,
            },
            rng: Rng::new(seed),
        };
        session.state.round.mode = session.pick_mode();
        let _ = now_ms;
        Ok(session)
    }

    /// The state of the session.
    ///
    /// WHY: the state is read-only for the shell; the shell changes it
    /// through the commands of the session
    /// (docs/design/BUILD-CONTRACT.md § 2.4, rule B-1).
    ///
    /// EXAMPLE: the state of a new session is in the phase `drawing`.
    pub const fn state(&self) -> &SessionState {
        &self.state
    }

    /// The phase of the running round.
    ///
    /// EXAMPLE: a new session is in the phase `drawing`.
    pub const fn phase(&self) -> RoundPhase {
        self.state.round.phase
    }

    /// The mode of the running round.
    ///
    /// EXAMPLE: a session that was created without modes plays the
    /// Timeline mode.
    pub const fn current_mode(&self) -> GameMode {
        self.state.round.mode
    }

    /// The identifier of the entity whose turn it is.
    ///
    /// WHY: in the individual mode the turn belongs to a player, in the
    /// team modes it belongs to a team (`src/stores/game-store.ts:258-261`).
    ///
    /// EXAMPLE: the active turn of a session with one player is the
    /// identifier of that player.
    pub fn active_turn_id(&self) -> Option<&str> {
        self.state
            .turn_order
            .get(self.state.current_turn_index)
            .map(String::as_str)
    }

    /// The current state of the generator.
    ///
    /// WHY: the state is part of the persisted state, so that a session that
    /// is reloaded continues with the same sequence
    /// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
    ///
    /// EXAMPLE: the state of a new session is its seed.
    pub fn rng_state(&self) -> u64 {
        self.rng.state()
    }

    /// Restores the state of the generator.
    ///
    /// WHY: a reloaded session has to continue with the same sequence,
    /// otherwise the same seed would produce a different game after a
    /// crash (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
    ///
    /// EXAMPLE: a reloaded session continues with the same sequence.
    pub fn restore_rng_state(&mut self, state: u64) {
        self.rng.set_state(state);
        self.state.rng_state = state;
    }

    /// The state as the shell sees it.
    ///
    /// WHY: the snapshot is a value; the core hands it out and forgets it
    /// (docs/design/BUILD-CONTRACT.md § 2.4, rule B-1).
    ///
    /// EXAMPLE: the snapshot of a new session has the schema version 1.
    pub fn snapshot(&self) -> SessionSnapshot {
        SessionSnapshot {
            schema_version: self.state.schema_version,
            session_id: self.state.session_id.clone(),
            phase: self.state.round.phase,
            current_round: self.state.current_round,
            current_mode: self.state.round.mode,
            players: self.state.players.clone(),
            teams: self.state.teams.clone(),
            turn_order: self.state.turn_order.clone(),
            current_turn_index: self.state.current_turn_index,
            is_game_over: self.state.is_game_over,
            winner_id: self.state.winner_id.clone(),
            timeline_years: self.state.timeline_years.clone(),
            answers_locked: self.state.round.answers_locked,
            total_xp: self.state.total_xp,
        }
    }

    /// Assigns a player to a team.
    ///
    /// WHY: the membership of a team and the team of a player have to stay
    /// in sync, otherwise the points flow to the wrong team
    /// (`src/stores/game-store.ts:572-592`).
    ///
    /// # Errors
    /// Returns the error `UnknownPlayer` when the session does not know the
    /// player.
    ///
    /// EXAMPLE: a player who joins a team is removed from the old one.
    pub fn assign_player_to_team(&mut self, player_id: &str, team_id: Option<&str>) -> Result<()> {
        let player = self
            .state
            .players
            .iter_mut()
            .find(|player| player.id == player_id)
            .ok_or_else(|| {
                PhomuError::new(ErrorCode::UnknownPlayer)
                    .with_context("playerId", player_id.to_string())
            })?;
        let old_team_id = player.team_id.clone();
        player.team_id = team_id.map(str::to_string);
        for team in &mut self.state.teams {
            if Some(&team.id) == old_team_id.as_ref() {
                team.player_ids.retain(|id| id != player_id);
            }
            if Some(team.id.as_str()) == team_id
                && !team.player_ids.iter().any(|id| id == player_id)
            {
                team.player_ids.push(player_id.to_string());
            }
        }
        Ok(())
    }

    /// Starts the game.
    ///
    /// WHY: the game needs players — an empty game screen is a dead screen
    /// (GAME-003).
    ///
    /// # Errors
    /// Returns the error `InvalidPlayerCount` when the session has no
    /// player.
    ///
    /// EXAMPLE: a session with two players starts in the drawing phase.
    pub fn start_game(&mut self, now_ms: u64) -> Result<RoundView> {
        if self.state.players.is_empty() {
            return Err(PhomuError::new(ErrorCode::InvalidPlayerCount).with_context("players", "0"));
        }
        self.state.turn_order = teams::build_turn_order(
            self.state.config.team_mode,
            &self.state.players,
            &self.state.teams,
        );
        self.state.current_turn_index = 0;
        self.state.current_round = 1;
        self.state.round = RoundState {
            phase: RoundPhase::Drawing,
            mode: self.pick_mode(),
            ..RoundState::default()
        };
        self.state.is_game_over = false;
        self.state.winner_id = None;
        self.state.game_start_ms = Some(now_ms);
        Ok(self.drawing_view(false))
    }

    /// Draws a song and opens the question phase.
    ///
    /// WHY: the song enters the core here and never leaves it during the
    /// question phase — the anti-spoiler guarantee is structural, not a
    /// rendering rule (docs/design/PLATFORM-ARCHITECTURE.md § 10.2).
    ///
    /// # Errors
    /// Returns the error `GameAlreadyOver` when the game has ended, the
    /// error `InvalidTransition` when the round is not in the phase
    /// `drawing` and the error `NoSongDrawn` when the song could not be
    /// stored.
    ///
    /// EXAMPLE: a drawn song moves the round into the question phase.
    pub fn draw_song(&mut self, song: Song, source: SongSource) -> Result<RoundView> {
        if self.state.is_game_over {
            return Err(PhomuError::new(ErrorCode::GameAlreadyOver));
        }
        if self.state.round.phase != RoundPhase::Drawing {
            return Err(PhomuError::new(ErrorCode::InvalidTransition)
                .with_context("from", self.state.round.phase.as_str())
                .with_context("to", RoundPhase::Question.as_str()));
        }
        let mode = self.state.round.mode;
        let progress = self.build_progress(mode, &song);
        let song_id = song.id.clone();
        self.state.played_song_ids.push(song_id);
        self.state.round.song = Some(song);
        self.state.round.song_source = Some(source);
        self.state.round.answers.clear();
        self.state.round.answers_locked = false;
        self.state.round.phase = RoundPhase::Question;
        self.state.round.progress = progress;
        let song = self
            .state
            .round
            .song
            .as_ref()
            .ok_or_else(|| PhomuError::new(ErrorCode::NoSongDrawn))?;
        Ok(RoundView::Question(self.question_view(song)))
    }

    /// The view model of the running round.
    ///
    /// WHY: the view model is built in the core, so that every shell sees
    /// the same fields and no shell can add one that carries the solution.
    ///
    /// # Errors
    /// Returns the error `NoSongDrawn` when the round is in the phase
    /// `question` but has no song.
    ///
    /// EXAMPLE: the view of a new session is the drawing phase.
    pub fn round_view(&self) -> Result<RoundView> {
        match self.state.round.phase {
            RoundPhase::Drawing => Ok(self.drawing_view(false)),
            RoundPhase::Question | RoundPhase::LockedIn => {
                let song = self
                    .state
                    .round
                    .song
                    .as_ref()
                    .ok_or_else(|| PhomuError::new(ErrorCode::NoSongDrawn))?;
                let mut view = self.question_view(song);
                view.answers_locked = self.state.round.answers_locked;
                Ok(RoundView::Question(view))
            }
            RoundPhase::Reveal => Ok(self.reveal_view()),
            RoundPhase::Scoring => Ok(RoundView::Scoring(ScoringView {
                round_number: self.state.current_round,
                winner_id: self.state.winner_id.clone(),
            })),
        }
    }

    /// Ends the game.
    ///
    /// WHY: the experience points of the session are the sum of the scores
    /// of the players (`src/stores/game-store.ts:380-383`).
    ///
    /// # Errors
    /// Currently never fails; the signature keeps the shape of the other
    /// commands of the session.
    ///
    /// EXAMPLE: the session ends in the phase `scoring`.
    pub fn end_game(&mut self, winner_id: Option<String>) -> Result<RoundView> {
        let session_xp: i64 = self.state.players.iter().map(|player| player.score).sum();
        self.state.total_xp += session_xp;
        self.state.is_game_over = true;
        self.state.winner_id = winner_id;
        self.state.round.phase = RoundPhase::Scoring;
        Ok(RoundView::Scoring(ScoringView {
            round_number: self.state.current_round,
            winner_id: self.state.winner_id.clone(),
        }))
    }

    /// Skips a broken song.
    ///
    /// WHY: a blocked video must not stop the party. With a drawn song a new
    /// song is drawn immediately, with a scanned card the pilot scans again
    /// (GAME-013, `src/stores/game-store.ts:405-416`).
    ///
    /// # Errors
    /// Returns the error `NotAvailableInPhase` when the round is neither in
    /// the phase `question` nor in the phase `locked-in`.
    ///
    /// EXAMPLE: a broken song returns the round to the drawing phase.
    pub fn skip_broken_song(&mut self) -> Result<RoundView> {
        if self.state.round.phase != RoundPhase::Question
            && self.state.round.phase != RoundPhase::LockedIn
        {
            return Err(PhomuError::new(ErrorCode::NotAvailableInPhase)
                .with_context("phase", self.state.round.phase.as_str()));
        }
        let source = self.state.round.song_source;
        self.state.round.phase = RoundPhase::Drawing;
        self.state.round.answers.clear();
        self.state.round.answers_locked = false;
        let auto_draw = source != Some(SongSource::Qr);
        self.state.auto_draw_intent = auto_draw;
        if auto_draw {
            self.state.round.song = None;
        }
        self.state.round.progress = ModeProgress::default();
        Ok(self.drawing_view(auto_draw))
    }
}
