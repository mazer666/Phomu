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
//!     context: Default::default(),
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
        /// The context of the round — what the mode needs to draw itself.
        context: PhomuRoundContext,
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

/// The context of the round — what the mode needs to draw itself.
///
/// WHY the shell cannot compute it: the slots of the timeline depend on the
/// year of the song, and the year of the song is the answer of the round.
/// The base therefore computes them.
///
/// EXAMPLE: the context of a Timeline round carries the slots `0`, `1` and
/// `2` and the years `1970`, `1980` and `1990`.
#[derive(
    Debug, Clone, PartialEq, Eq, Default, uniffi::Record, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub struct PhomuRoundContext {
    /// The years that lie on the timeline.
    #[serde(default)]
    pub timeline_years: Vec<i32>,
    /// The slots of the timeline, in which the song may be placed.
    #[serde(default)]
    pub timeline_slots: Vec<u32>,
    /// The genre of the song.
    #[serde(default)]
    pub genre: String,
    /// The pack the song belongs to.
    #[serde(default)]
    pub pack: Option<String>,
}

/// Turn the context of the base into the context of the shell.
///
/// WHY a function of its own: the translation belongs to the view, and the
/// API of the core is not a rule of the bridge.
///
/// EXAMPLE: the slots `0` and `1` of the base become the slots `0` and `1`
/// of the shell.
pub fn from_core_context(context: &phomu_core::facade::RoundContext) -> PhomuRoundContext {
    PhomuRoundContext {
        timeline_years: context.timeline_years.clone(),
        timeline_slots: context
            .timeline_slots
            .iter()
            .map(|slot| *slot as u32)
            .collect(),
        genre: context.genre.clone(),
        pack: context.pack.clone(),
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
