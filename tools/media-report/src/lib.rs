//! The media link audit of Phomu.
//!
//! WHAT: the audit of the media links of a catalogue. For every song it
//! builds the media sources, asks the base for the playback plan of every
//! provider and reports what can be played where.
//!
//! WHY: the media policy is a rule and lives in `phomu-media`. The tool
//! applies it to the catalogue and writes the evidence; it never decides
//! which provider a shell prefers (docs/design/PLATFORM-ARCHITECTURE.md
//! § 8.3).
//!
//! EXAMPLE:
//!
//! ```
//! use media_report::audit::audit_entry;
//! use phomu_media::{MediaSources, PlaybackWindow};
//!
//! let result = audit_entry(
//!     "song-one",
//!     &MediaSources::default(),
//!     PlaybackWindow::default(),
//!     "",
//! );
//! assert_eq!(result.song_id, "song-one");
//! assert_eq!(result.candidates, 0);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod audit;
pub mod catalogue;
