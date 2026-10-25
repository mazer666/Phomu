//! The game rules of the Phomu base.
//!
//! WHAT: the round automaton, the six modes as pure state machines, the
//! scoring, the team and round logic, the anti-spoiler boundary and the
//! session that ties them together.
//!
//! WHY: the base decides, the shell draws
//! (docs/design/PLATFORM-ARCHITECTURE.md § 1.1). A rule that exists once
//! cannot drift between six platforms. Everything in this crate is pure: it
//! opens no file, reads no clock and generates no randomness on its own —
//! the time and the seed arrive from the shell
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 1).
//!
//! **The only public surface is [`facade`].** Every other module of this
//! crate is private; the bridges export the façade and nothing else
//! (docs/design/BUILD-CONTRACT.md § 2.1).
//!
//! EXAMPLE: a round is played through the façade.
//!
//! ```
//! use phomu_core::facade::{GameConfig, Session};
//!
//! let session = Session::new(
//!     GameConfig::default(),
//!     Vec::new(),
//!     Vec::new(),
//!     Vec::new(),
//!     42,
//!     0,
//! )
//! .expect("an empty session is created");
//! assert_eq!(session.phase().as_str(), "drawing");
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod abi;
mod modes;
mod rules;
mod session;
mod spoiler;

pub mod facade;
