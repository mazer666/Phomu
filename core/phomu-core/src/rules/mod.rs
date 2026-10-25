//! The rules of the game.
//!
//! WHAT: the round phases and their transitions, the central scoring, the
//! team and turn logic and the ending conditions.
//!
//! WHY: these are the rules that the reference implementation spreads over
//! the store, the page and the mode components. In the base they live in
//! one place and can be tested without a browser.

pub mod phase;
pub mod scoring;
pub mod teams;
pub mod winner;
