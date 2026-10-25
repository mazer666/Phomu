//! The inputs of a vector.
//!
//! WHAT: the input of a vector ([`Op`]), the filters of a filter probe
//! ([`FilterOptions`]) and the answer of a player ([`VectorAnswer`]).
//!
//! WHY: the inputs are the script of a vector — the list of what the
//! implementation has to do. They live in their own module because the
//! script is the part of the format that grows with every new mode of the
//! game (QA-09 backlog item 2.9).

use serde::Deserialize;

use super::VectorConfig;

/// One input of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "op", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Op {
    /// The game starts.
    StartGame,
    /// A song is drawn.
    DrawSong {
        /// The identifier of the song.
        song_id: String,
        /// Where the song comes from.
        #[serde(default)]
        source: Option<String>,
    },
    /// The round moves into another phase.
    AdvancePhase {
        /// The phase.
        phase: String,
    },
    /// An answer is recorded without the evaluation of a mode.
    SubmitAnswer {
        /// The player who answered.
        player_id: String,
        /// The stored label of the answer.
        answer: String,
        /// Whether the answer was correct.
        is_correct: bool,
        /// The points of the answer.
        points_awarded: i64,
        /// The time the answer took.
        #[serde(default)]
        answered_in_seconds: Option<u32>,
    },
    /// Points are credited to a player or to a team.
    AwardPoints {
        /// The player or the team.
        entity_id: String,
        /// The number of points.
        points: i64,
    },
    /// The round is closed.
    NextRound,
    /// The game ends.
    EndGame {
        /// The winner.
        #[serde(default)]
        winner_id: Option<String>,
    },
    /// The song is skipped.
    SkipBrokenSong,
    /// The timeline is started.
    InitTimeline {
        /// The years.
        years: Vec<i32>,
    },
    /// A year is added to the timeline.
    AddTimelineYear {
        /// The year.
        year: i32,
    },
    /// A year is removed from the timeline.
    RemoveTimelineYear {
        /// The year.
        year: i32,
    },
    /// A player joins a team.
    AssignPlayerToTeam {
        /// The player.
        player_id: String,
        /// The team.
        #[serde(default)]
        team_id: Option<String>,
    },
    /// A team is removed.
    RemoveTeam {
        /// The team.
        team_id: String,
    },
    /// The scores are reset.
    ResetScores,
    /// The configuration is replaced.
    SetConfig {
        /// The new configuration.
        config: VectorConfig,
    },
    /// The clock is set.
    SetNow {
        /// The moment, in milliseconds since the epoch.
        ms: u64,
    },
    /// A player answers in a mode.
    Answer {
        /// The mode of the answer.
        mode: String,
        /// The answer.
        answer: VectorAnswer,
        /// The time the answer took.
        #[serde(default)]
        answered_in_seconds: Option<u32>,
    },
    /// A cheat is used.
    Cheat {
        /// The name of the cheat.
        cheat: String,
    },
    /// A hint is censored.
    CensorHint {
        /// The hint.
        hint: String,
        /// The artist.
        artist: String,
        /// The title.
        title: String,
    },
    /// The catalogue is filtered.
    FilterSongs {
        /// The filters.
        options: FilterOptions,
    },
}

/// The filters of a `filterSongs` probe.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterOptions {
    /// The packs.
    #[serde(default)]
    pub selected_packs: Vec<String>,
    /// The difficulty.
    #[serde(default)]
    pub difficulty: Option<String>,
    /// Whether only songs with a physical card may be drawn.
    #[serde(default, rename = "onlyQRCompatible")]
    pub only_qr_compatible: bool,
    /// The mode.
    #[serde(default)]
    pub current_mode: Option<String>,
}

/// The answer of a player in a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum VectorAnswer {
    /// The player placed the song in a slot of the timeline.
    #[serde(rename = "timeline")]
    Timeline {
        /// The slot.
        #[serde(default)]
        slot: Option<usize>,
    },
    /// The pilot judged what he knew.
    #[serde(rename = "hint-master")]
    HintMaster {
        /// The hint level.
        level: u32,
        /// What the pilot knew.
        knew: String,
    },
    /// The player picked a lyric line.
    #[serde(rename = "lyrics")]
    Lyrics {
        /// Which line was picked.
        picked: String,
    },
    /// The bonus round of a song without lyrics.
    #[serde(rename = "lyrics-bonus")]
    LyricsBonus {
        /// Whether the player recognised the song.
        claimed: bool,
    },
    /// The player picked a mood.
    #[serde(rename = "vibe-check")]
    VibeCheck {
        /// The mood.
        mood: String,
        /// Whether the cheat was used.
        #[serde(default)]
        cheat_used: bool,
    },
    /// The player judged the career of the artist.
    #[serde(rename = "survivor")]
    Survivor {
        /// Whether the player guessed "one-hit wonder".
        guessed_one_hit: bool,
    },
    /// The player named the original artist.
    #[serde(rename = "cover-confusion")]
    CoverConfusion {
        /// The number of hints.
        hints_used: u32,
        /// The artist the player picked.
        #[serde(default)]
        picked_artist: Option<String>,
        /// The self-assessment.
        #[serde(default)]
        self_assess: Option<bool>,
    },
    /// The player judged whether the song is a cover.
    #[serde(rename = "cover-confusion-variation")]
    CoverConfusionVariation {
        /// Whether the player answered "cover".
        guess_cover: bool,
    },
}
