//! The catalogue of the base, as the shell hands it over.
//!
//! WHAT: the reader of the catalogue artefact and the exported functions
//! that open it, list its packs and list its songs.
//!
//! WHY the shell hands over the bytes: the base performs no file system
//! access and no network access; the catalogue arrives as bytes
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 1). The shell never parses
//! the artefact itself — the bridge is the only channel for catalogue data
//! (BRIDGE-109).
//!
//! EXAMPLE:
//!
//! ```text
//! let handle = phomu_catalog_open("{\"songs\":[]}".to_string())?;
//! let packs = phomu_catalog_packs(handle)?;
//! ```

use phomu_catalog::{
    Confidence, CoverMode, Difficulty, Links, Lyrics, Pack, PreviewTimestamp, RelationType, Song,
};
use phomu_core::facade::ErrorCode;

use crate::error::{PhomuError, failure};

use crate::dto::{PhomuCatalogHandle, PhomuPackInfo, PhomuSongSummary};

/// The catalogue of a session: the songs and the packs.
#[derive(Debug, Clone, Default)]
pub struct Catalogue {
    /// The songs of the catalogue.
    pub songs: Vec<Song>,
    /// The packs of the catalogue.
    pub packs: Vec<Pack>,
}

/// The failure of a catalogue that cannot be read.
fn invalid_catalogue(reason: &str) -> PhomuError {
    failure(ErrorCode::InvalidSongData, &[("reason", reason)])
}

/// Read a catalogue from the JSON the shell hands over.
///
/// # Errors
/// Returns the failure `InvalidSongData` when the JSON is malformed or when
/// a song carries a value the base does not know.
pub fn read_catalogue(source: &str) -> Result<Catalogue, PhomuError> {
    let value: serde_json::Value =
        serde_json::from_str(source).map_err(|error| invalid_catalogue(&error.to_string()))?;
    let songs = value
        .get("songs")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| invalid_catalogue("the artefact has no songs"))?;

    let mut parsed = Vec::with_capacity(songs.len());
    for song in songs {
        parsed.push(read_song(song)?);
    }

    let packs = read_packs(&value);
    Ok(Catalogue {
        songs: parsed,
        packs,
    })
}

/// Read one song of the bytes a shell hands over for a scanned card.
///
/// # Errors
/// Returns the failure `InvalidSongData` when the JSON is malformed or when
/// the song carries a value the base does not know.
pub fn read_single_song(source: &str) -> Result<Song, PhomuError> {
    let value: serde_json::Value =
        serde_json::from_str(source).map_err(|error| invalid_catalogue(&error.to_string()))?;
    read_song(&value)
}

/// The packs of the artefact.
fn read_packs(value: &serde_json::Value) -> Vec<Pack> {
    let Some(entries) = value.get("packs").and_then(serde_json::Value::as_object) else {
        return Vec::new();
    };
    entries
        .iter()
        .map(|(id, entry)| {
            let name = entry
                .get("pack")
                .and_then(serde_json::Value::as_str)
                .unwrap_or(id.as_str())
                .to_string();
            Pack {
                id: id.clone(),
                name,
                tagline_key: format!("packs.{id}.tagline"),
            }
        })
        .collect()
}

/// Read one song of the artefact.
///
/// # Errors
/// Returns the failure `InvalidSongData` when a field carries a value the
/// base does not know.
fn read_song(value: &serde_json::Value) -> Result<Song, PhomuError> {
    let text = |field: &str| -> String {
        value
            .get(field)
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default()
            .to_string()
    };
    let number = |field: &str| -> i64 {
        value
            .get(field)
            .and_then(serde_json::Value::as_i64)
            .unwrap_or_default()
    };
    let list = |field: &str| -> Vec<String> {
        value
            .get(field)
            .and_then(serde_json::Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| entry.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default()
    };

    let difficulty_text = text("difficulty");
    let difficulty = Difficulty::from_str(&difficulty_text)
        .ok_or_else(|| invalid_catalogue(&format!("unknown difficulty {difficulty_text:?}")))?;

    let lyrics = value.get("lyrics").map(|lyrics| {
        let real = lyrics
            .get("real")
            .and_then(serde_json::Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| entry.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        let fake = match lyrics.get("fake") {
            Some(serde_json::Value::String(text)) => vec![text.clone()],
            Some(serde_json::Value::Array(entries)) => entries
                .iter()
                .filter_map(|entry| entry.as_str().map(str::to_string))
                .collect(),
            _ => Vec::new(),
        };
        Lyrics { real, fake }
    });

    let cover_mode = value.get("coverMode").and_then(|mode| {
        let relation_text = mode
            .get("relationType")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("original");
        let relation_type = RelationType::from_str(relation_text)?;
        let confidence_text = mode
            .get("confidence")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("medium");
        let confidence = Confidence::from_str(confidence_text)?;
        Some(CoverMode {
            relation_type,
            original_song_id: mode
                .get("originalSongId")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string),
            original_artist: mode
                .get("originalArtist")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string),
            cover_artist: mode
                .get("coverArtist")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string),
            cover_year: mode
                .get("coverYear")
                .and_then(serde_json::Value::as_i64)
                .map(|year| year as i32),
            reveal_prompt: mode
                .get("revealPrompt")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string),
            confidence,
        })
    });

    let preview_timestamp = value
        .get("previewTimestamp")
        .map(|preview| PreviewTimestamp {
            start: preview
                .get("start")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0) as u32,
            end: preview
                .get("end")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0) as u32,
        });

    let links = value
        .get("links")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let link = |field: &str| -> Option<String> {
        links
            .get(field)
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
    };

    Ok(Song {
        id: text("id"),
        title: text("title"),
        artist: text("artist"),
        year: number("year") as i32,
        country: text("country"),
        genre: text("genre"),
        cover_url: link("coverUrl"),
        difficulty,
        mood: list("mood"),
        packs: list("packs"),
        hints: list("hints"),
        hint_evidence: value
            .get("hintEvidence")
            .and_then(serde_json::Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| entry.as_str().map(str::to_string))
                    .collect()
            }),
        lyrics,
        is_one_hit_wonder: value
            .get("isOneHitWonder")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        cover_mode,
        preview_timestamp,
        supported_modes: list("supportedModes"),
        is_qr_compatible: value
            .get("isQRCompatible")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        links: Links {
            youtube: links
                .get("youtube")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default()
                .to_string(),
            cover_link: link("coverLink"),
            fallback_youtube_id: link("fallbackYoutubeId"),
            youtube_alternatives: links
                .get("youtubeAlternatives")
                .and_then(serde_json::Value::as_array)
                .map(|entries| {
                    entries
                        .iter()
                        .filter_map(|entry| entry.as_str().map(str::to_string))
                        .collect()
                })
                .unwrap_or_default(),
            spotify: link("spotify"),
            spotify_free_preview: link("spotifyFreePreview"),
            apple_music: link("appleMusic"),
            amazon_music: link("amazonMusic"),
            amazon_prime_preview: link("amazonPrimePreview"),
        },
    })
}

/// The summary of one song, as the shell sees it.
///
/// WHY there is no title, no artist and no year: the summary is what a shell
/// shows before the reveal (docs/design/BUILD-CONTRACT.md § 2.3).
pub fn summary_of(song: &Song) -> PhomuSongSummary {
    PhomuSongSummary {
        id: song.id.clone(),
        difficulty: song.difficulty.as_str().to_string(),
        packs: song.packs.clone(),
        supported_modes: song.supported_modes.clone(),
        is_qr_compatible: song.is_qr_compatible,
        has_lyrics: song.has_lyrics(),
    }
}

/// The information of one pack, as the shell sees it.
pub fn pack_info(pack: &Pack, song_count: u32) -> PhomuPackInfo {
    PhomuPackInfo {
        id: pack.id.clone(),
        name: pack.name.clone(),
        tagline_key: pack.tagline_key.clone(),
        song_count,
    }
}

/// The handle of an open catalogue.
pub fn handle_of(id: u64) -> PhomuCatalogHandle {
    PhomuCatalogHandle { id }
}
