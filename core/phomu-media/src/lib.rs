//! The media provider policy of the Phomu base.
//!
//! WHAT: the providers and their kinds ([`MusicProvider`], [`ProviderKind`],
//! [`MediaSource`]), the sources a song offers ([`MediaSources`]), the plan
//! the shell has to play ([`MediaPlan`]) and the rules that decide what
//! happens when a provider fails ([`ProviderFailure`],
//! [`MediaPlan::next_candidate`]).
//!
//! WHY: the policy is a rule and the player surface is not. The reference
//! implementation mixes both in `src/components/game/MusicPlayer.tsx` (783
//! lines); a native shell cannot reuse a browser iframe. The base therefore
//! decides *what* is played and *in which order*, the shell decides *how*
//! (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
//!
//! This crate contains no playback implementation and no player SDK. It
//! performs no I/O.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_media::{MediaPlan, MediaSources, MusicProvider, PlaybackWindow};
//!
//! let sources = MediaSources {
//!     youtube: Some("abcdefghijk".to_string()),
//!     ..MediaSources::default()
//! };
//! let plan = MediaPlan::build(MusicProvider::Youtube, &sources, PlaybackWindow::default());
//! assert_eq!(plan.candidates().len(), 1);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod failure;
mod plan;
mod provider;

pub use failure::{AutoSkipDecision, ProviderFailure};
pub use plan::{MediaPlan, PlaybackWindow, ProviderCandidate};
pub use provider::{MediaSource, MediaSources, MusicProvider, ProviderKind, provider_kind};
