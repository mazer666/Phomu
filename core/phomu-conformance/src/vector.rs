//! The model of a conformance vector.
//!
//! WHAT: the JSON model of a vector — the situation (`given`), the inputs
//! (`when`) and the expected observation (`then`).
//!
//! WHY: the format is the one of the corpus in `vectors/`; it is described
//! by `vectors/schema.json` and by `vectors/README.md`. The model of this
//! module is the Rust reading of that schema, so that the Rust runner and
//! the TypeScript runner read the same files.
//!
//! The corpus is the property of the conformance worker; this crate is the
//! runner that replays it against the core.

use std::collections::BTreeMap;

use phomu_core::facade::{Cheat, Difficulty, GameMode, KnewWhat, ModeAnswer, Song};
use serde::Deserialize;

include!(concat!(env!("OUT_DIR"), "/vectors_generated.rs"));

/// The reason why a vector could not be read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VectorError {
    /// The identifier of the vector.
    pub id: String,
    /// What went wrong.
    pub reason: String,
}

impl std::fmt::Display for VectorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "the vector {} is invalid: {}", self.id, self.reason)
    }
}

impl std::error::Error for VectorError {}

/// A conformance vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vector {
    /// The version of the format.
    pub schema_version: u32,
    /// The identifier of the vector.
    pub id: String,
    /// The behaviour area.
    pub area: String,
    /// What the vector proves.
    pub title: String,
    /// Where the behaviour is documented in the reference implementation.
    #[serde(default)]
    pub reference: String,
    /// Whether both implementations have to produce the same observation.
    pub portable: bool,
    /// Why the vector is not portable.
    #[serde(default)]
    pub portability_note: String,
    /// The situation the vector starts from.
    #[serde(default)]
    pub given: Given,
    /// The inputs, in the order in which they are executed.
    #[serde(default)]
    pub when: Vec<Op>,
    /// The expected observation.
    pub then: Observation,
}

/// The situation a vector starts from.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Given {
    /// The partial configuration of the session.
    #[serde(default)]
    pub config: VectorConfig,
    /// The players of the session.
    #[serde(default)]
    pub players: Vec<VectorPlayer>,
    /// The teams of the session.
    #[serde(default)]
    pub teams: Vec<VectorTeam>,
    /// The order of the turns.
    #[serde(default)]
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    #[serde(default)]
    pub current_turn_index: usize,
    /// The number of the round.
    #[serde(default)]
    pub current_round: u32,
    /// The phase of the round.
    #[serde(default)]
    pub round_phase: Option<String>,
    /// The mode of the round.
    #[serde(default)]
    pub current_mode: Option<String>,
    /// The identifier of the song of the round.
    #[serde(default)]
    pub current_song: Option<String>,
    /// The years of the timeline.
    #[serde(default)]
    pub timeline_years: Vec<i32>,
    /// The identifiers of the songs that have been played.
    #[serde(default)]
    pub played_song_ids: Vec<String>,
    /// Where the song of the round came from.
    #[serde(default)]
    pub current_song_source: Option<String>,
    /// Whether the drawing phase draws automatically.
    #[serde(default)]
    pub auto_draw_intent: bool,
    /// The moment the game started.
    #[serde(default)]
    pub game_start_time: Option<u64>,
    /// The experience points of the session.
    #[serde(default, rename = "totalXP")]
    pub total_xp: i64,
    /// Whether the game has ended.
    #[serde(default)]
    pub is_game_over: bool,
    /// The winner of the game.
    #[serde(default)]
    pub winner_id: Option<String>,
    /// The song fixtures of the vector.
    #[serde(default)]
    pub songs: BTreeMap<String, VectorSong>,
    /// The catalogue a `filterSongs` probe runs against.
    #[serde(default)]
    pub catalogue: Vec<VectorSong>,
}

/// A player of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorPlayer {
    /// The identifier of the player.
    pub id: String,
    /// The name of the player.
    #[serde(default)]
    pub name: String,
    /// The score of the player.
    #[serde(default)]
    pub score: i64,
    /// The team of the player.
    #[serde(default)]
    pub team_id: Option<String>,
    /// Whether the player has been eliminated.
    #[serde(default)]
    pub is_eliminated: bool,
    /// Whether the player watches instead of playing.
    #[serde(default)]
    pub is_spectator: bool,
    /// Whether the player is the pilot.
    #[serde(default)]
    pub is_pilot: bool,
}

/// A team of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorTeam {
    /// The identifier of the team.
    pub id: String,
    /// The name of the team.
    #[serde(default)]
    pub name: String,
    /// The members of the team.
    #[serde(default)]
    pub player_ids: Vec<String>,
    /// The score of the team.
    #[serde(default)]
    pub score: i64,
    /// The colour of the team.
    #[serde(default)]
    pub color: Option<String>,
}

/// The partial configuration of a vector.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorConfig {
    /// The modes that are active.
    #[serde(default)]
    pub selected_modes: Vec<String>,
    /// The team mode.
    #[serde(default)]
    pub team_mode: Option<String>,
    /// The ending condition.
    #[serde(default)]
    pub ending_condition: Option<String>,
    /// The target score.
    #[serde(default)]
    pub target_points: Option<i64>,
    /// The number of rounds per player or per team.
    #[serde(default)]
    pub target_rounds: Option<u32>,
    /// The number of minutes.
    #[serde(default)]
    pub target_time_minutes: Option<u32>,
    /// Whether the time decay is active.
    #[serde(default)]
    pub time_decay_enabled: Option<bool>,
    /// The number of seconds after which the first decay step applies.
    #[serde(default)]
    pub time_decay_grace_seconds: Option<u32>,
    /// The width of one decay step in seconds.
    #[serde(default)]
    pub time_decay_step_seconds: Option<u32>,
    /// The number of points deducted per decay step.
    #[serde(default)]
    pub time_decay_step_points: Option<u32>,
    /// The lower bound of the points of a correct answer.
    #[serde(default)]
    pub min_points_per_correct: Option<u32>,
    /// The maximum number of points of the Timeline mode.
    #[serde(default)]
    pub timeline_max_points: Option<u32>,
    /// Whether the cheats are hidden.
    #[serde(default)]
    pub no_cheat_mode: Option<bool>,
    /// The difficulty filter.
    #[serde(default)]
    pub difficulty: Option<String>,
}

/// A song of a vector.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorSong {
    /// The identifier of the song.
    pub id: String,
    /// The title.
    #[serde(default)]
    pub title: String,
    /// The artist.
    #[serde(default)]
    pub artist: String,
    /// The year.
    #[serde(default)]
    pub year: i32,
    /// The country.
    #[serde(default)]
    pub country: Option<String>,
    /// The genre.
    #[serde(default)]
    pub genre: Option<String>,
    /// The difficulty.
    #[serde(default)]
    pub difficulty: Option<String>,
    /// The moods.
    #[serde(default)]
    pub mood: Vec<String>,
    /// The packs.
    #[serde(default)]
    pub packs: Vec<String>,
    /// The hints.
    #[serde(default)]
    pub hints: Vec<String>,
    /// The lyric lines.
    #[serde(default)]
    pub lyrics: Option<VectorLyrics>,
    /// Whether the artist is a one-hit wonder.
    #[serde(default)]
    pub is_one_hit_wonder: bool,
    /// The modes the song supports.
    #[serde(default)]
    pub supported_modes: Vec<String>,
    /// Whether the song is on the physical card deck.
    #[serde(default, rename = "isQRCompatible")]
    pub is_qr_compatible: bool,
    /// The links of the song.
    #[serde(default)]
    pub links: Option<VectorLinks>,
}

/// The lyric lines of a vector.
#[derive(Debug, Clone, Deserialize)]
pub struct VectorLyrics {
    /// The real lines.
    #[serde(default)]
    pub real: Vec<String>,
    /// The invented lines. The catalogue allows one line or a list
    /// (`src/types/song.ts:101`).
    #[serde(default, deserialize_with = "deserialize_string_or_list")]
    pub fake: Vec<String>,
}

/// Reads a value that is either a string or a list of strings.
fn deserialize_string_or_list<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum OneOrMany {
        One(String),
        Many(Vec<String>),
    }
    match OneOrMany::deserialize(deserializer)? {
        OneOrMany::One(value) => Ok(vec![value]),
        OneOrMany::Many(values) => Ok(values),
    }
}

/// The links of a vector.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorLinks {
    /// The YouTube link.
    #[serde(default)]
    pub youtube: Option<String>,
    /// The cover link.
    #[serde(default)]
    pub cover_link: Option<String>,
}

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

/// The expected observation of a vector.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Observation {
    /// The phase after every input.
    #[serde(default)]
    pub phases: Vec<String>,
    /// The number of the round.
    #[serde(default)]
    pub current_round: u32,
    /// The mode of the round.
    #[serde(default)]
    pub current_mode: String,
    /// The song of the round.
    #[serde(default)]
    pub current_song_id: Option<String>,
    /// Where the song came from.
    #[serde(default)]
    pub current_song_source: Option<String>,
    /// Whether the drawing phase draws automatically.
    #[serde(default)]
    pub auto_draw_intent: bool,
    /// The score of every player.
    #[serde(default)]
    pub player_scores: BTreeMap<String, i64>,
    /// The score of every team.
    #[serde(default)]
    pub team_scores: BTreeMap<String, i64>,
    /// The team of every player.
    #[serde(default)]
    pub player_teams: BTreeMap<String, Option<String>>,
    /// The members of every team.
    #[serde(default)]
    pub team_members: BTreeMap<String, Vec<String>>,
    /// The order of the turns.
    #[serde(default)]
    pub turn_order: Vec<String>,
    /// The index of the turn that is played.
    #[serde(default)]
    pub current_turn_index: usize,
    /// The winner of the game.
    #[serde(default)]
    pub winner_id: Option<String>,
    /// Whether the game has ended.
    #[serde(default)]
    pub is_game_over: bool,
    /// The years of the timeline.
    #[serde(default)]
    pub timeline_years: Vec<i32>,
    /// The identifiers of the songs that have been played.
    #[serde(default)]
    pub played_song_ids: Vec<String>,
    /// The answers that were recorded.
    #[serde(default)]
    pub answers: Vec<AnswerRecord>,
    /// The number of logged rounds.
    #[serde(default)]
    pub round_count: usize,
    /// The experience points of the session.
    #[serde(default, rename = "totalXP")]
    pub total_xp: i64,
    /// The result of the censoring probe.
    #[serde(default)]
    pub censor_hint: Option<String>,
    /// The result of the filter probe.
    #[serde(default)]
    pub filtered_song_ids: Option<Vec<String>>,
    /// The error of the vector level.
    #[serde(default)]
    pub error: Option<VectorErrorValue>,
}

/// One recorded answer.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRecord {
    /// The player who answered.
    pub player_id: String,
    /// The stored label of the answer.
    pub answer: String,
    /// The class of the result.
    #[serde(default)]
    pub outcome: Option<String>,
    /// Whether the answer was correct.
    pub is_correct: bool,
    /// The points of the answer.
    pub points_awarded: u32,
    /// The time the answer took.
    #[serde(default)]
    pub answered_in_seconds: Option<u32>,
}

/// The error of the vector level.
#[derive(Debug, Clone, Deserialize)]
pub struct VectorErrorValue {
    /// The code of the error.
    pub code: String,
    /// The message of the error.
    #[serde(default)]
    pub message: String,
}

impl Vector {
    /// Reads a vector from its JSON representation.
    ///
    /// # Errors
    /// Returns the error `VectorError` when the text is not a valid vector.
    ///
    /// EXAMPLE: a vector is read from a string.
    pub fn from_json(id: &str, text: &str) -> Result<Self, VectorError> {
        serde_json::from_str::<Vector>(text).map_err(|error| VectorError {
            id: id.to_string(),
            reason: error.to_string(),
        })
    }

    /// The song of an identifier of the fixtures of the vector.
    pub fn song(&self, id: &str) -> Option<Song> {
        self.given.songs.get(id).map(build_song).or_else(|| {
            self.given
                .catalogue
                .iter()
                .find(|song| song.id == id)
                .map(build_song)
        })
    }

    /// The catalogue of the vector.
    pub fn catalogue(&self) -> Vec<Song> {
        self.given.catalogue.iter().map(build_song).collect()
    }

    /// The answer of a vector as the answer of the core.
    ///
    /// # Errors
    /// Returns the error `VectorError` when the answer of the vector names
    /// a mode or a value that the core does not know.
    pub fn mode_answer(answer: &VectorAnswer) -> Result<ModeAnswer, VectorError> {
        let converted = match answer {
            VectorAnswer::Timeline { slot } => ModeAnswer::Timeline {
                slot: slot.unwrap_or_default(),
            },
            VectorAnswer::HintMaster { level, knew } => {
                let knew = match knew.as_str() {
                    "both" => KnewWhat::Both,
                    "artist" => KnewWhat::Artist,
                    "title" => KnewWhat::Title,
                    "none" => KnewWhat::None,
                    other => {
                        return Err(VectorError {
                            id: "answer".to_string(),
                            reason: format!("the verdict {other} does not exist"),
                        });
                    }
                };
                ModeAnswer::HintMaster {
                    level: *level,
                    knew,
                }
            }
            VectorAnswer::Lyrics { picked } => ModeAnswer::Lyrics {
                picked_fake: picked == "fake",
            },
            VectorAnswer::LyricsBonus { claimed } => ModeAnswer::LyricsBonus { claimed: *claimed },
            VectorAnswer::VibeCheck { mood, cheat_used } => ModeAnswer::VibeCheck {
                mood: mood.clone(),
                cheat_used: *cheat_used,
            },
            VectorAnswer::Survivor { guessed_one_hit } => ModeAnswer::Survivor {
                guessed_one_hit: *guessed_one_hit,
            },
            VectorAnswer::CoverConfusion {
                hints_used,
                picked_artist,
                self_assess,
            } => ModeAnswer::CoverConfusion {
                hints_used: *hints_used,
                picked_artist: picked_artist.clone(),
                self_assess: *self_assess,
            },
            VectorAnswer::CoverConfusionVariation { guess_cover } => {
                ModeAnswer::CoverConfusionVariation {
                    guess_cover: *guess_cover,
                }
            }
        };
        Ok(converted)
    }

    /// The cheat of a vector.
    pub fn cheat(name: &str) -> Option<Cheat> {
        match name {
            "timeline-decade-hint" => Some(Cheat::TimelineDecadeHint),
            "timeline-joker" => Some(Cheat::TimelineJoker),
            "hint-master-music" => Some(Cheat::HintMasterMusic),
            "survivor-artist" => Some(Cheat::SurvivorArtist),
            "vibe-check-options" => Some(Cheat::VibeCheckOptions),
            _ => None,
        }
    }

    /// The mode of an identifier.
    pub fn mode(name: &str) -> Option<GameMode> {
        GameMode::from_str(name)
    }
}

/// Builds the song of the core from the song of a vector.
fn build_song(song: &VectorSong) -> Song {
    let lyrics = song
        .lyrics
        .as_ref()
        .map(|lyrics| phomu_core::facade::Lyrics {
            real: lyrics.real.clone(),
            fake: lyrics.fake.clone(),
        });
    let difficulty = song
        .difficulty
        .as_deref()
        .and_then(Difficulty::from_str)
        .unwrap_or(Difficulty::Easy);
    Song {
        id: song.id.clone(),
        title: song.title.clone(),
        artist: song.artist.clone(),
        year: song.year,
        country: song.country.clone().unwrap_or_else(|| "DE".to_string()),
        genre: song.genre.clone().unwrap_or_else(|| "Pop".to_string()),
        cover_url: None,
        difficulty,
        mood: song.mood.clone(),
        packs: song.packs.clone(),
        hints: song.hints.clone(),
        hint_evidence: None,
        lyrics,
        is_one_hit_wonder: song.is_one_hit_wonder,
        cover_mode: None,
        preview_timestamp: None,
        supported_modes: song.supported_modes.clone(),
        is_qr_compatible: song.is_qr_compatible,
        links: phomu_core::facade::Links {
            youtube: song
                .links
                .as_ref()
                .and_then(|links| links.youtube.clone())
                .unwrap_or_default(),
            cover_link: song
                .links
                .as_ref()
                .and_then(|links| links.cover_link.clone()),
            ..phomu_core::facade::Links::default()
        },
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{VECTOR_FILES, Vector};

    #[test]
    fn every_vector_is_valid_json() {
        assert!(!VECTOR_FILES.is_empty());
        for (id, text) in VECTOR_FILES {
            let vector = Vector::from_json(id, text).expect("the vector is valid");
            assert_eq!(&vector.id, id);
        }
    }
}
