//! The state of the running round.
//!
//! WHAT: the progress of the mode ([`ModeProgress`]) and the state of the
//! round ([`RoundState`]).
//!
//! WHY: the round carries the song — and the song carries the solution.
//! The song therefore never leaves the core during the question phase, and
//! it is never persisted (docs/design/PLATFORM-ARCHITECTURE.md § 10.2,
//! rule C-4).

use phomu_catalog::Song;

use crate::modes::GameMode;
use crate::rules::phase::RoundPhase;
use crate::session::model::PlayerAnswer;
use crate::session::model::SongSource;

/// The progress of the mode of the running round.
///
/// WHY: the six modes share the same fields, so that the shell can read
/// the progress of a round without knowing the mode.
///
/// EXAMPLE: the progress of a round of the Hint-Master carries the hint
/// level that was reached.
///
/// The six modes share the same fields: the number of hints, the cheat, the
/// options and the selection. The mode decides what they mean.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ModeProgress {
    /// The number of hints that were revealed.
    pub hints_used: u32,
    /// The level the Hint-Master mode has reached.
    pub hint_level: u32,
    /// Whether a cheat was used.
    pub cheat_used: bool,
    /// The options the mode offers.
    pub options: Vec<String>,
    /// The index of the option the player picked.
    pub selected: Option<usize>,
    /// The variant of the Cover Confusion mode.
    pub cover_variation: Option<crate::modes::cover_confusion::CoverVariation>,
    /// The slot the joker removed in the Timeline mode.
    pub joker_slot: Option<usize>,
    /// Whether the player may remove a year from the timeline.
    pub removal_offered: bool,
}

/// The state of the running round.
///
/// WHY: the round carries the song — and the song carries the solution.
/// The song therefore never leaves the core during the question phase.
///
/// EXAMPLE: a round in the drawing phase has no song and no answer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoundState {
    /// The phase of the round.
    pub phase: RoundPhase,
    /// The song of the round. It contains the solution — it is therefore
    /// never persisted and never leaves the core in the question phase.
    pub song: Option<Song>,
    /// The mode of the round.
    pub mode: GameMode,
    /// The answers that were submitted.
    pub answers: Vec<PlayerAnswer>,
    /// Whether the answers are locked in.
    pub answers_locked: bool,
    /// Where the song came from.
    pub song_source: Option<SongSource>,
    /// The progress of the mode.
    pub progress: ModeProgress,
}

impl Default for RoundState {
    /// A round in the drawing phase without a song.
    fn default() -> Self {
        Self {
            phase: RoundPhase::Drawing,
            song: None,
            mode: GameMode::Timeline,
            answers: Vec::new(),
            answers_locked: false,
            song_source: None,
            progress: ModeProgress::default(),
        }
    }
}
