//! The catalogue build and validation tool of Phomu.
//!
//! WHAT: the tool that reads the catalogue files of the repository, hands
//! every entry to the validation rules of the base and writes a report or a
//! normalised catalogue artefact.
//!
//! WHY: the catalogue is the largest asset of the product and it is shipped
//! as a versioned artefact (docs/design/PLATFORM-ARCHITECTURE.md § 9). The
//! rules about a catalogue entry live in `phomu-catalog`; this tool only
//! reads, translates, calls and reports. It is a build-time artefact and is
//! never linked into a release build.
//!
//! EXAMPLE:
//!
//! ```
//! use catalog_tool::validate::{Bounds, validate_entries};
//!
//! let summary = validate_entries(&[], &Bounds::new(1500, 1), 2026);
//! assert_eq!(summary.songs, 0);
//! assert_eq!(summary.errors, 0);
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod catalogue;
pub mod report;
pub mod validate;
