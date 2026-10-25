//! The view models of the bridge.
//!
//! WHAT: the view of the running round, the view of the reveal and the
//! scores.
//!
//! WHY the question phase has no answer field: the anti-spoiler guarantee
//! is structural. `PhomuRoundView` has no variant that could carry the
//! title, the artist or the year of the song, and the reveal has its own
//! type (C-1, docs/design/PLATFORM-ARCHITECTURE.md § 10.2).
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::view::PhomuRoundView;
//!
//! let view = PhomuRoundView::Question {
//!     round_number: 3,
//!     mode: "timeline".to_string(),
//!     hints: vec!["[XXX] sang 1985".to_string()],
//!     options: Vec::new(),
//!     points_possible: 5,
//!     answers_locked: false,
//! };
//! assert_eq!(view.phase(), "question");
//! ```

/// The view of the current round.
///
/// WHY there is no reveal variant: the question phase, the drawing phase and
/// the scoring phase carry no identity of the song, and the type says so.
/// The reveal has its own type, `PhomuRevealView`.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum PhomuRoundView {
    /// A card is being drawn.
    Drawing {
        /// The number of the round.
        round_number: u32,
        /// The identifier of the mode of the round.
        mode: String,
        /// Whether the drawing happens automatically.
        auto_draw: bool,
    },
    /// The question stands.
    Question {
        /// The number of the round.
        round_number: u32,
        /// The identifier of the mode of the round.
        mode: String,
        /// The censored hints of the song.
        hints: Vec<String>,
        /// The options the mode offers.
        options: Vec<String>,
        /// The number of points the round is worth.
        points_possible: u32,
        /// Whether the answers are already locked in.
        answers_locked: bool,
    },
    /// The round is scored.
    Scoring {
        /// The number of the round.
        round_number: u32,
        /// The identifier of the mode of the round.
        mode: String,
        /// The winner, if the ending condition named one.
        winner_id: Option<String>,
    },
}

impl PhomuRoundView {
    /// The phase the view belongs to.
    ///
    /// EXAMPLE: the phase of a drawing view is `"drawing"`.
    pub fn phase(&self) -> &'static str {
        match self {
            PhomuRoundView::Drawing { .. } => "drawing",
            PhomuRoundView::Question { .. } => "question",
            PhomuRoundView::Scoring { .. } => "scoring",
        }
    }
}

/// The view of the reveal phase.
///
/// WHY the identity is here and not in `PhomuRoundView`: the reveal is the
/// one phase that discloses the solution, and it has its own type.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhomuRevealView {
    /// The number of the round.
    #[serde(default)]
    pub round_number: u32,
    /// The identifier of the mode of the round.
    #[serde(default)]
    pub mode: String,
    /// The title of the song.
    #[serde(default)]
    pub title: String,
    /// The artist of the song.
    #[serde(default)]
    pub artist: String,
    /// The year of the release.
    #[serde(default)]
    pub year: i32,
    /// Whether the answer of the pilot was correct.
    #[serde(default)]
    pub is_correct: bool,
    /// The number of points that were awarded.
    #[serde(default)]
    pub points_awarded: u32,
}
