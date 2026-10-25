//! The anti-spoiler boundary of the base.
//!
//! WHAT: the censoring of a hint ([`censor`]) and the view models that a
//! shell receives ([`view`]).
//!
//! WHY: the anti-spoiler guarantee is a product promise (CORE-005,
//! MEDIA-015). The base makes it structural: the question-phase view model
//! has no field that could carry the solution, and the censoring happens in
//! the base, so that every platform censors identically
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rules C-1 and C-2).

pub mod censor;
pub mod view;
