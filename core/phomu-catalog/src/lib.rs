//! The catalogue model of the Phomu base.
//!
//! WHAT: the model of a catalogue entry ([`Song`]), of a pack ([`Pack`]) and
//! of the metadata around them, the rules that decide which song is drawn
//! ([`SelectionCriteria`], [`select_song`]) and the validation of a
//! catalogue entry ([`validate_song`]).
//!
//! WHY: the selection is a rule, not a convenience. The reference
//! implementation keeps it in `src/utils/song-picker.ts:28-85`; a shell
//! that draws its own song draws a different song. The catalogue *data* is
//! a versioned artefact that the shell delivers — this crate performs no
//! file system access and reads no clock (docs/design/BUILD-CONTRACT.md
//! § 1.2, rule 1).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_catalog::{SelectionCriteria, Song, select_song};
//!
//! // A catalogue without a song yields no selection.
//! let catalogue: Vec<Song> = Vec::new();
//! let criteria = SelectionCriteria::default();
//! let selection = select_song(&catalogue, &criteria, 0);
//! assert!(selection.is_none(), "an empty catalogue yields no selection");
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

mod limits;
mod model;
mod selection;
mod song_limits;
mod text;
mod validation;

pub use limits::{
    KNOWN_SUPPORTED_MODES, LimitKind, LimitViolation, SONG_FIELD_LIMITS, SongFieldLimit,
    known_supported_mode,
};
pub use model::{
    Confidence, CoverMode, Difficulty, Links, Lyrics, Pack, PreviewTimestamp, RelationType, Song,
};
pub use selection::{
    Fallback, Selection, SelectionCriteria, filter_pool, normalize_pack_ids, select_song,
};
pub use song_limits::collect_song_limit_violations;
pub use text::{
    is_country_code, is_http_url, is_youtube_placeholder, is_youtube_url, is_youtube_video_id,
    normalize_for_comparison,
};
pub use validation::{
    SongValidation, ValidationIssue, ValidationIssueKind, ValidationSeverity, YearBounds,
    validate_catalogue, validate_song,
};
