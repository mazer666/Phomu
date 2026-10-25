//! The data transfer objects of a session.
//!
//! WHAT: the two snapshots a shell receives — the state of the session
//! ([`SessionSnapshot`]) and the result of an answer
//! ([`ScoreSnapshot`]).
//!
//! WHY: the shell may read the state but never change it. The snapshots are
//! values; the core hands them out and forgets them
//! (docs/design/BUILD-CONTRACT.md § 2.4, rule B-1).

use crate::modes::GameMode;
use crate::rules::phase::RoundPhase;
use crate::session::model::{Player, Team};

/// The result of an answer.
///
/// WHY: the shell needs the new score of the player and of the team to
/// draw the scoreboard; the snapshot carries both and nothing else.
///
/// EXAMPLE: the snapshot of a correct answer carries the points that were
/// awarded and the score of the player.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScoreSnapshot {
    /// The number of the round.
    pub round_number: u32,
    /// The player who answered. It is `None` in the team modes, where the
    /// team of the turn answers.
    pub player_id: Option<String>,
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The number of points that were awarded.
    pub points_awarded: u32,
    /// The score of the player after the answer.
    pub player_score: i64,
    /// The team of the player, if any.
    pub team_id: Option<String>,
    /// The score of the team after the answer.
    pub team_score: Option<i64>,
    /// The phase after the answer.
    pub phase: RoundPhase,
}

/// The state of a session as the shell sees it.
///
/// WHY: the shell may read the state but never change it; the snapshot is
/// a value that the core hands out and forgets
/// (docs/design/BUILD-CONTRACT.md § 2.4, rule B-1).
///
/// EXAMPLE: the snapshot of a new session has the schema version 1 and the
/// phase `drawing`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionSnapshot {
    /// The version of the state schema.
    pub schema_version: u32,
    /// The identifier of the session.
    pub session_id: String,
    /// The phase of the round.
    pub phase: RoundPhase,
    /// The number of the round.
    pub current_round: u32,
    /// The mode of the round.
    pub current_mode: GameMode,
    /// The players of the session.
    pub players: Vec<Player>,
    /// The teams of the session.
    pub teams: Vec<Team>,
    /// The identifiers of the players or teams, in the order of their turns.
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    pub current_turn_index: usize,
    /// Whether the game has ended.
    pub is_game_over: bool,
    /// The winner, if the ending condition named one.
    pub winner_id: Option<String>,
    /// The years of the shared timeline.
    pub timeline_years: Vec<i32>,
    /// Whether the answers of the round are locked in.
    pub answers_locked: bool,
    /// The experience points of the session.
    pub total_xp: i64,
}
