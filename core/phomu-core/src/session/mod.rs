//! The session of a game.
//!
//! WHAT: the state of a session, the data model around it, the
//! configuration and the generator.
//!
//! WHY: the session is the piece that the bridges hold. It owns the phase
//! automaton and it is the only place where the rules of the game meet.
//!
//! The modules are grouped by the responsibility they carry: the *commands*
//! change the state, the *views* read it, the *rules* decide.

pub mod answers;
pub mod commands;
pub mod config;
pub mod dto;
pub mod ending;
pub mod model;
pub mod persist;
pub mod prompt;
pub mod rng;
pub mod round;
pub mod rounds;
pub mod scores;
pub mod state;
