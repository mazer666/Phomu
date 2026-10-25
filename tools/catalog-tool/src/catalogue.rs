//! The catalogue file format and its mapping onto the model of the base.
//!
//! WHAT: the JSON shape of a catalogue file of the repository
//! (`src/data/songs/*.json`) and the conversion into the [`Song`] model of
//! `phomu-catalog`.
//!
//! WHY: the catalogue data is a versioned artefact that the shells consume
//! (docs/design/PLATFORM-ARCHITECTURE.md § 9). The artefact is written by
//! this tool and read by the shells; the *rules* about a catalogue entry —
//! which field is mandatory, which year is permitted, how many hints a song
//! has — live in `phomu-catalog` and are not repeated here. This module only
//! translates.
//!
//! EXAMPLE:
//!
//! ```
//! use catalog_tool::catalogue::SongFile;
//!
//! let file: SongFile = serde_json::from_str(r#"{"songs":[]}"#).unwrap_or_default();
//! assert!(file.songs.is_empty());
//! ```

use serde::Deserialize as _;

use phomu_catalog::{
    Confidence, CoverMode, Difficulty, Links, Lyrics, Pack, PreviewTimestamp, RelationType, Song,
};

/// One catalogue file: a list of entries.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongFile {
    /// The entries of the file.
    #[serde(default)]
    pub songs: Vec<SongEntry>,
}

/// One entry of a catalogue file, in the shape of the repository's files.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongEntry {
    /// The unique identifier of the entry.
    #[serde(default)]
    pub id: String,
    /// The title as it was released.
    #[serde(default)]
    pub title: String,
    /// The primary artist or band.
    #[serde(default)]
    pub artist: String,
    /// The year of the release.
    #[serde(default)]
    pub year: i32,
    /// The ISO 3166-1 alpha-2 country code of the artist.
    #[serde(default)]
    pub country: String,
    /// The musical genre.
    #[serde(default)]
    pub genre: String,
    /// The URL of the cover art.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,
    /// How well known the song is.
    #[serde(default)]
    pub difficulty: String,
    /// The mood tags of the song.
    #[serde(default)]
    pub mood: Vec<String>,
    /// The packs the song belongs to.
    #[serde(default)]
    pub packs: Vec<String>,
    /// The hints of the song, from the hardest to the easiest.
    #[serde(default)]
    pub hints: Vec<String>,
    /// The sources of the hints.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hint_evidence: Option<Vec<String>>,
    /// The lyric lines.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<LyricsEntry>,
    /// Whether the artist is a one-hit wonder.
    #[serde(default)]
    pub is_one_hit_wonder: bool,
    /// The metadata of the Cover Confusion mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_mode: Option<CoverModeEntry>,
    /// The part of the song that is played.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preview_timestamp: Option<PreviewTimestampEntry>,
    /// The modes the song supports.
    #[serde(default)]
    pub supported_modes: Vec<String>,
    /// Whether the song is on the physical card deck.
    #[serde(rename = "isQRCompatible", default)]
    pub is_qr_compatible: bool,
    /// The streaming links of the song.
    #[serde(default)]
    pub links: LinksEntry,
}

/// The lyric lines of an entry.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsEntry {
    /// The real lines of the song.
    #[serde(default)]
    pub real: Vec<String>,
    /// The invented lines; the repository stores them as a string or a list.
    #[serde(default, deserialize_with = "deserialize_fake_lyrics")]
    pub fake: Vec<String>,
}

/// The metadata of the Cover Confusion mode.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverModeEntry {
    /// The relation of the song to the original work.
    #[serde(default)]
    pub relation_type: String,
    /// The identifier of the original song.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_song_id: Option<String>,
    /// The artist of the original work.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_artist: Option<String>,
    /// The artist of the cover version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_artist: Option<String>,
    /// The year of the cover version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_year: Option<i32>,
    /// The sentence for the reveal.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reveal_prompt: Option<String>,
    /// The confidence in the metadata.
    #[serde(default)]
    pub confidence: String,
}

/// The part of the song that is played.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewTimestampEntry {
    /// The offset in seconds at which the playback starts.
    #[serde(default)]
    pub start: u32,
    /// The offset in seconds at which the playback stops.
    #[serde(default)]
    pub end: u32,
}

/// The streaming links of an entry.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinksEntry {
    /// The YouTube video identifier or URL.
    #[serde(default)]
    pub youtube: String,
    /// The YouTube link of the cover version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_link: Option<String>,
    /// The backup YouTube identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback_youtube_id: Option<String>,
    /// Further YouTube identifiers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub youtube_alternatives: Option<Vec<String>>,
    /// The Spotify track URI or URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spotify: Option<String>,
    /// The Spotify Free preview URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spotify_free_preview: Option<String>,
    /// The Apple Music track URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub apple_music: Option<String>,
    /// The Amazon Music URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amazon_music: Option<String>,
    /// The Amazon Prime preview URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amazon_prime_preview: Option<String>,
}

/// Read the invented lyric lines, which the repository stores as a string or
/// as a list of strings.
fn deserialize_fake_lyrics<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(serde::Deserialize)]
    #[serde(untagged)]
    enum OneOrMany {
        One(String),
        Many(Vec<String>),
    }

    match Option::<OneOrMany>::deserialize(deserializer)? {
        None => Ok(Vec::new()),
        Some(OneOrMany::One(text)) => Ok(vec![text]),
        Some(OneOrMany::Many(lines)) => Ok(lines),
    }
}

/// The reason why an entry could not be translated into the model.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TranslationError {
    /// The difficulty is not one of the known difficulties.
    UnknownDifficulty(String),
    /// The relation type of the cover metadata is unknown.
    UnknownRelationType(String),
    /// The confidence of the cover metadata is unknown.
    UnknownConfidence(String),
}

impl std::fmt::Display for TranslationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TranslationError::UnknownDifficulty(value) => {
                write!(f, "unknown difficulty {value:?}")
            }
            TranslationError::UnknownRelationType(value) => {
                write!(f, "unknown relation type {value:?}")
            }
            TranslationError::UnknownConfidence(value) => {
                write!(f, "unknown confidence {value:?}")
            }
        }
    }
}

impl std::error::Error for TranslationError {}

impl SongEntry {
    /// Translate the entry into the model of the base.
    ///
    /// WHY: the enumeration of the model is closed, so an unknown value is an
    /// error and not a silently dropped field.
    ///
    /// # Errors
    /// Returns an error when the entry names a difficulty, a relation type or
    /// a confidence that the base does not know.
    pub fn to_model(&self) -> Result<Song, TranslationError> {
        let difficulty = Difficulty::from_str(&self.difficulty)
            .ok_or_else(|| TranslationError::UnknownDifficulty(self.difficulty.clone()))?;

        let cover_mode = match &self.cover_mode {
            None => None,
            Some(entry) => Some(CoverMode {
                relation_type: RelationType::from_str(&entry.relation_type).ok_or_else(|| {
                    TranslationError::UnknownRelationType(entry.relation_type.clone())
                })?,
                original_song_id: entry.original_song_id.clone(),
                original_artist: entry.original_artist.clone(),
                cover_artist: entry.cover_artist.clone(),
                cover_year: entry.cover_year,
                reveal_prompt: entry.reveal_prompt.clone(),
                confidence: Confidence::from_str(&entry.confidence)
                    .ok_or_else(|| TranslationError::UnknownConfidence(entry.confidence.clone()))?,
            }),
        };

        let lyrics = self.lyrics.as_ref().map(|entry| Lyrics {
            real: entry.real.clone(),
            fake: entry.fake.clone(),
        });

        let preview_timestamp = self
            .preview_timestamp
            .as_ref()
            .map(|entry| PreviewTimestamp {
                start: entry.start,
                end: entry.end,
            });

        Ok(Song {
            id: self.id.clone(),
            title: self.title.clone(),
            artist: self.artist.clone(),
            year: self.year,
            country: self.country.clone(),
            genre: self.genre.clone(),
            cover_url: self.cover_url.clone(),
            difficulty,
            mood: self.mood.clone(),
            packs: self.packs.clone(),
            hints: self.hints.clone(),
            hint_evidence: self.hint_evidence.clone(),
            lyrics,
            is_one_hit_wonder: self.is_one_hit_wonder,
            cover_mode,
            preview_timestamp,
            supported_modes: self.supported_modes.clone(),
            is_qr_compatible: self.is_qr_compatible,
            links: Links {
                youtube: self.links.youtube.clone(),
                cover_link: self.links.cover_link.clone(),
                fallback_youtube_id: self.links.fallback_youtube_id.clone(),
                youtube_alternatives: self.links.youtube_alternatives.clone().unwrap_or_default(),
                spotify: self.links.spotify.clone(),
                spotify_free_preview: self.links.spotify_free_preview.clone(),
                apple_music: self.links.apple_music.clone(),
                amazon_music: self.links.amazon_music.clone(),
                amazon_prime_preview: self.links.amazon_prime_preview.clone(),
            },
        })
    }
}

/// The pack metadata file of the repository (`src/data/songs/packs.json`).
///
/// The file maps a pack identifier onto its metadata; the entries with an
/// empty object are the legacy identifiers without metadata.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackFile {
    /// The metadata of every pack, by pack identifier.
    #[serde(flatten)]
    pub packs: std::collections::BTreeMap<String, PackEntry>,
}

/// The metadata of one pack.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackEntry {
    /// The display name of the pack.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pack: Option<String>,
    /// The version of the pack.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// The description of the pack.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// The number of songs in the pack.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub song_count: Option<u32>,
    /// The state of the lyric data of the pack.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics_status: Option<String>,
}

impl PackFile {
    /// The packs of the file that carry a display name.
    ///
    /// The legacy identifiers have an empty object and are not packs of the
    /// catalogue.
    pub fn packs(&self) -> Vec<Pack> {
        self.packs
            .iter()
            .map(|(id, entry)| {
                let name = entry.pack.clone().unwrap_or_else(|| id.clone());
                Pack {
                    id: id.clone(),
                    name,
                    tagline_key: format!("packs.{id}.tagline"),
                }
            })
            .collect()
    }
}
