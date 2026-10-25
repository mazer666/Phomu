//! The reading of the catalogue files for the media audit.
//!
//! WHAT: the minimal reader that extracts the media relevant fields of a
//! catalogue file: the identifier of the song, its links and its preview
//! timestamp.
//!
//! WHY: the tool reads the artefact and hands the links to the media policy
//! of the base. It does not re-implement the catalogue model, and it does
//! not validate the catalogue — that is the job of `catalog-tool`.

use std::fs;
use std::path::Path;

use serde::Deserialize;

/// The media relevant fields of one catalogue entry.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaEntry {
    /// The unique identifier of the entry.
    #[serde(default)]
    pub id: String,
    /// The preview window of the song.
    #[serde(default)]
    pub preview_timestamp: Option<PreviewTimestamp>,
    /// The streaming links of the song.
    #[serde(default)]
    pub links: Links,
}

/// The preview window of a song.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewTimestamp {
    /// The offset in seconds at which the playback starts.
    #[serde(default)]
    pub start: u32,
    /// The offset in seconds at which the playback stops.
    #[serde(default)]
    pub end: u32,
}

/// The streaming links of a song.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Links {
    /// The YouTube video identifier or URL.
    #[serde(default)]
    pub youtube: String,
    /// The YouTube link of the cover version.
    #[serde(default)]
    pub cover_link: Option<String>,
    /// The backup YouTube identifier.
    #[serde(default)]
    pub fallback_youtube_id: Option<String>,
    /// Further YouTube identifiers.
    #[serde(default)]
    pub youtube_alternatives: Option<Vec<String>>,
    /// The Spotify track URI or URL.
    #[serde(default)]
    pub spotify: Option<String>,
    /// The Spotify Free preview URL.
    #[serde(default)]
    pub spotify_free_preview: Option<String>,
    /// The Apple Music track URL.
    #[serde(default)]
    pub apple_music: Option<String>,
    /// The Amazon Music URL.
    #[serde(default)]
    pub amazon_music: Option<String>,
    /// The Amazon Prime preview URL.
    #[serde(default)]
    pub amazon_prime_preview: Option<String>,
}

/// One catalogue file.
#[derive(Debug, Default, Deserialize)]
struct SongFile {
    /// The entries of the file.
    #[serde(default)]
    songs: Vec<MediaEntry>,
}

/// Read every catalogue file of a directory.
///
/// A file that has no `songs` list is not a catalogue file — the repository
/// keeps the pack metadata in `packs.json` — and is skipped.
///
/// # Errors
/// Returns a message when the directory cannot be read or when a file is
/// malformed.
pub fn read_entries(directory: &Path) -> Result<Vec<MediaEntry>, String> {
    let entries = fs::read_dir(directory)
        .map_err(|error| format!("cannot read the directory {directory:?}: {error}"))?;

    let mut paths: Vec<std::path::PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .is_some_and(|extension| extension == "json")
        })
        .collect();
    paths.sort();

    let mut songs = Vec::new();
    for path in &paths {
        let text = fs::read_to_string(path)
            .map_err(|error| format!("cannot read the file {path:?}: {error}"))?;
        let value: serde_json::Value = serde_json::from_str(&text)
            .map_err(|error| format!("the file {path:?} is not valid JSON: {error}"))?;
        if !value.get("songs").is_some_and(|songs| songs.is_array()) {
            continue;
        }
        let file: SongFile = serde_json::from_value(value)
            .map_err(|error| format!("the file {path:?} is not a catalogue file: {error}"))?;
        songs.extend(file.songs);
    }
    Ok(songs)
}
