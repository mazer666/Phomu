//! The six game modes as pure state machines.
//!
//! WHAT: the mode identifiers ([`GameMode`]), the normalised answer of a
//! mode ([`ModeAnswer`]), the result of an answer ([`ModeOutcome`]) and the
//! single evaluation entry point ([`evaluate_mode_answer`]).
//!
//! WHY: the reference implementation keeps the rules of a mode inside its
//! React component — the validity predicate and the points live next to the
//! markup (`src/components/game/modes/`, 2 342 lines). A rule that is only
//! reachable through a component cannot be replayed by a second
//! implementation and cannot be compared with it. The base moves the rules
//! out: every mode is a pure function of the song, the answer and the
//! context.
//!
//! EXAMPLE: a Vibe-Check answer on a song whose moods contain the chosen
//! mood is worth two points.

mod evaluate;

pub mod cover_confusion;
pub mod hint_master;
pub mod lyrics;
pub mod survivor;
pub mod timeline;
pub mod vibe_check;

pub use evaluate::{deterministic_shuffle, evaluate_mode_answer, max_points};

/// The six modes of the game.
///
/// WHY: the set of the modes is closed — a round is played in exactly one
/// of the six, and a mode that does not exist cannot be selected
/// (`docs/design/GAME-CONTRACT.md` § 4).
///
/// EXAMPLE: `GameMode::Timeline` is the chronological timeline.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum GameMode {
    /// The chronological timeline.
    Timeline,
    /// The hint master — five levels, the pilot decides.
    HintMaster,
    /// The lyrics labyrinth — the player finds the invented line.
    Lyrics,
    /// The vibe check — the player names the mood.
    VibeCheck,
    /// The survivor — the player judges the career of the artist.
    Survivor,
    /// The cover confusion — the player finds the original artist.
    CoverConfusion,
}

impl GameMode {
    /// Every mode, in the order of the reference implementation
    /// (`src/config/game-config.ts:300-307`).
    ///
    /// EXAMPLE: `GameMode::ALL` has six entries.
    pub const ALL: &'static [GameMode] = &[
        GameMode::Timeline,
        GameMode::HintMaster,
        GameMode::Lyrics,
        GameMode::VibeCheck,
        GameMode::Survivor,
        GameMode::CoverConfusion,
    ];

    /// The identifier of the mode.
    ///
    /// WHY: the identifier is the key of the mode in the catalogue artefact
    /// and in the locale files of the shells.
    ///
    /// EXAMPLE: `GameMode::HintMaster.as_str()` is `"hint-master"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            GameMode::Timeline => "timeline",
            GameMode::HintMaster => "hint-master",
            GameMode::Lyrics => "lyrics",
            GameMode::VibeCheck => "vibe-check",
            GameMode::Survivor => "survivor",
            GameMode::CoverConfusion => "cover-confusion",
        }
    }

    /// The mode of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; the identifiers of the modes
    /// are read from the catalogue artefact, where an unknown identifier is
    /// a value to be reported and not an error to be raised.
    ///
    /// EXAMPLE: `GameMode::from_str("vibe-check")` is
    /// `Some(GameMode::VibeCheck)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; an unknown identifier is a value to report, not an error to raise"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "timeline" => Some(GameMode::Timeline),
            "hint-master" => Some(GameMode::HintMaster),
            "lyrics" => Some(GameMode::Lyrics),
            "vibe-check" => Some(GameMode::VibeCheck),
            "survivor" => Some(GameMode::Survivor),
            "cover-confusion" => Some(GameMode::CoverConfusion),
            _ => None,
        }
    }

    /// Whether the mode discloses the identity of the song in the question
    /// phase.
    ///
    /// WHY: the Vibe-Check asks for the mood of a song whose artist and
    /// title are visible — the identity is part of the question
    /// (`src/components/game/modes/VibeCheckMode.tsx:116-118`). The
    /// exception is a property of the mode and therefore identical on every
    /// platform (C-6, `docs/design/PLATFORM-ARCHITECTURE.md` § 10.2).
    ///
    /// EXAMPLE: `GameMode::VibeCheck.reveals_identity()` is `true`, every
    /// other mode is `false`.
    pub const fn reveals_identity(self) -> bool {
        matches!(self, GameMode::VibeCheck)
    }

    /// Whether the mode measures the time the answer took.
    ///
    /// WHY: only the Timeline mode passes an answer time, so that the time
    /// decay does not apply in the other modes (GAME-039).
    ///
    /// EXAMPLE: `GameMode::Timeline.measures_answer_time()` is `true`.
    pub const fn measures_answer_time(self) -> bool {
        matches!(self, GameMode::Timeline)
    }

    /// Whether the mode offers hints that cost points.
    ///
    /// WHY: the Hint-Master and the Cover Confusion offer hints that lower
    /// the value of the round; the other modes do not.
    ///
    /// EXAMPLE: `GameMode::HintMaster.uses_hints()` is `true`.
    pub const fn uses_hints(self) -> bool {
        matches!(self, GameMode::HintMaster | GameMode::CoverConfusion)
    }

    /// Whether the mode offers a cheat.
    ///
    /// WHY: the Lyrics Labyrinth and the Cover Confusion have no cheat in
    /// the reference implementation (GAME-037).
    ///
    /// EXAMPLE: `GameMode::Lyrics.has_cheat()` is `false`.
    pub const fn has_cheat(self) -> bool {
        matches!(
            self,
            GameMode::Timeline | GameMode::HintMaster | GameMode::VibeCheck | GameMode::Survivor
        )
    }
}

/// What the pilot knew in the Hint-Master mode.
///
/// WHY: without the differentiation between "I knew everything" and "I
/// knew the artist" the hit rate would be worthless (GAME-025).
///
/// EXAMPLE: `KnewWhat::Both` is the verdict of a pilot who knew the artist
/// and the title.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum KnewWhat {
    /// The artist and the title.
    Both,
    /// Only the artist.
    Artist,
    /// Only the title.
    Title,
    /// Nothing.
    None,
}

impl KnewWhat {
    /// The identifier of the answer.
    ///
    /// WHY: the identifier is the key of the verdict in the locale files of
    /// the shells.
    ///
    /// EXAMPLE: `KnewWhat::Artist.as_str()` is `"artist"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            KnewWhat::Both => "both",
            KnewWhat::Artist => "artist",
            KnewWhat::Title => "title",
            KnewWhat::None => "none",
        }
    }
}

/// The answer of a player, normalised over the six modes.
///
/// WHY: the six modes answer in six different ways; the normalisation is
/// what lets the session treat an answer the same way in every mode.
///
/// EXAMPLE: `ModeAnswer::Survivor { guessed_one_hit: true }` is the answer
/// of a player who believes the artist is a one-hit wonder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModeAnswer {
    /// The player placed the song in a slot of the timeline.
    Timeline {
        /// The slot the player chose.
        slot: usize,
    },
    /// The pilot judged what he knew after the hints.
    HintMaster {
        /// The hint level that was reached.
        level: u32,
        /// What the pilot knew.
        knew: KnewWhat,
    },
    /// The player picked the invented lyric line.
    Lyrics {
        /// Whether the picked line was the invented one.
        picked_fake: bool,
    },
    /// The bonus round for a song without lyric data.
    LyricsBonus {
        /// Whether the player recognised the song.
        claimed: bool,
    },
    /// The player picked a mood.
    VibeCheck {
        /// The mood the player picked.
        mood: String,
        /// Whether the cheat was used.
        cheat_used: bool,
    },
    /// The player judged the career of the artist.
    Survivor {
        /// Whether the player guessed "one-hit wonder".
        guessed_one_hit: bool,
    },
    /// The player named the original artist or judged himself.
    CoverConfusion {
        /// The number of hints that were used.
        hints_used: u32,
        /// The artist the player picked, if the variant was the multiple
        /// choice.
        picked_artist: Option<String>,
        /// The self-assessment, if the variant was the honour system.
        self_assess: Option<bool>,
    },
    /// The player judged whether the song is a cover.
    CoverConfusionVariation {
        /// Whether the player answered "cover".
        guess_cover: bool,
    },
}

/// The result of an answer of a mode.
///
/// WHY: the session needs the validity and the value of the answer to
/// credit the points; the mode decides both and the session applies them.
///
/// EXAMPLE: `ModeOutcome::correct(3)` is a correct answer worth three
/// points.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModeOutcome {
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The points the answer is worth.
    pub points: u32,
}

impl ModeOutcome {
    /// A correct answer with the given points.
    ///
    /// WHY: a correct answer and a wrong answer are the two results a mode
    /// can have; the constructor makes the difference explicit.
    ///
    /// EXAMPLE: `ModeOutcome::correct(4)` is worth four points.
    pub const fn correct(points: u32) -> Self {
        Self {
            is_correct: true,
            points,
        }
    }

    /// A wrong answer.
    ///
    /// WHY: a wrong answer is worth nothing in every mode — there is no
    /// negative value.
    ///
    /// EXAMPLE: `ModeOutcome::incorrect()` is worth nothing.
    pub const fn incorrect() -> Self {
        Self {
            is_correct: false,
            points: 0,
        }
    }
}

/// The state of the round a mode may read besides the song.
///
/// WHY: a mode is a pure function of the song, the answer and this
/// context; nothing else may influence the result
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-101).
///
/// EXAMPLE: `ModeContext::new(&[1970, 1980, 1990], 5)` describes a timeline
/// of three years with a cap of five points.
#[derive(Debug, Clone, Copy)]
pub struct ModeContext<'a> {
    /// The years of the shared timeline.
    pub timeline_years: &'a [i32],
    /// The maximum number of points in the Timeline mode.
    pub timeline_max_points: u32,
}

impl<'a> ModeContext<'a> {
    /// Builds the context.
    ///
    /// WHY: the context carries only what a mode may read besides the song
    /// — the timeline and the cap of the Timeline mode.
    ///
    /// EXAMPLE: `ModeContext::new(&[1970, 1980, 1990], 5)` describes a
    /// timeline of three years.
    pub const fn new(timeline_years: &'a [i32], timeline_max_points: u32) -> Self {
        Self {
            timeline_years,
            timeline_max_points,
        }
    }
}

#[cfg(test)]
mod tests;
