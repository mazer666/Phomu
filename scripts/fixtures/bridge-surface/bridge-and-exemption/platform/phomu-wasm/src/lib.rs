//! The bridge of the fixture.
//!
//! WHAT: the exported symbols of a bridge that reaches the operations of the
//! fixture session.
//!
//! WHY: the fixture has to carry a bridge, because the gate compares the
//! declaration with the symbols the bridges export.

use crate::core::phomu_core::session::Session;

/// Starts the game.
pub fn phomu_session_start(session: &mut Session) -> Result<(), String> {
    session.start_game()
}

/// Resets the scores of the session.
pub fn phomu_session_reset_scores(session: &mut Session) {
    session.reset_scores();
}

/// The score of the session.
pub fn phomu_session_score(session: &Session) -> i64 {
    session.score()
}
