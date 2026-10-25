//! The songs of a vector.
//!
//! WHAT: the song fixture of a vector ([`VectorSong`]), its lyric lines
//! ([`VectorLyrics`]), its links ([`VectorLinks`]) and the translation into
//! the song of the core ([`build_song`]).
//!
//! WHY: the song of a vector is the only place where the catalogue data of
//! a vector meets the catalogue model of the core. The translation lives in
//! its own module because it is the seam where a difference between the
//! two implementations of the catalogue would appear (QA-09 backlog item
//! 2.9).

use phomu_core::facade::{Difficulty, Song};
use serde::Deserialize;

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

/// Builds the song of the core from the song of a vector.
pub(crate) fn build_song(song: &VectorSong) -> Song {
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
