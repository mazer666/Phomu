//! The session of the fixture.
//!
//! WHAT: a session with three public operations — two that change the state
//! and one that only reads it — and one crate-private helper that the gate
//! has to ignore.
//!
//! WHY: the fixture has to be small enough to be read at a glance and big
//! enough to exercise the parser of the gate: a `pub fn`, a `pub const fn`
//! and a `pub(crate) fn` that must not show up as an operation.

/// A session of the fixture.
pub struct Session {
    pub(crate) score: i64,
    pub(crate) rounds: u32,
}

impl Session {
    /// Starts the game.
    pub fn start_game(&mut self) -> Result<(), String> {
        self.rounds += 1;
        Ok(())
    }

    /// Resets the scores of the session.
    pub const fn reset_scores(&mut self) {
        self.score = 0;
    }

    /// The score of the session.
    pub const fn score(&self) -> i64 {
        self.score
    }

    /// The crate-private helper — the gate must not see it.
    pub(crate) fn credit(&mut self, points: i64) {
        self.score += points;
    }
}
