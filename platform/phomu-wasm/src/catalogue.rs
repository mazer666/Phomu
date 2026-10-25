//! The catalogue of the base, as the web shell hands it over.
//!
//! WHAT: the reader of the catalogue artefact and the summary of a song.
//!
//! WHY the shell hands over the bytes: the base performs no file system
//! access and no network access; the catalogue arrives as bytes
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 1).

use phomu_catalog::{
    Confidence, CoverMode, Difficulty, Links, Lyrics, Pack, PreviewTimestamp, RelationType, Song,
};
use serde_json::{Value, json};

/// The failure of a catalogue that cannot be read.
fn invalid(reason: &str) -> crate::BridgeError {
    crate::BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: std::collections::HashMap::from([("reason".to_string(), reason.to_string())]),
    }
}

/// Read one song of the artefact.
///
/// # Errors
/// Returns the failure of the base when a field carries a value the base
/// does not know.
pub fn read_song(value: &Value) -> Result<Song, crate::BridgeError> {
    let text = |field: &str| -> String {
        value
            .get(field)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    };
    let number =
        |field: &str| -> i64 { value.get(field).and_then(Value::as_i64).unwrap_or_default() };
    let list = |field: &str| -> Vec<String> {
        value
            .get(field)
            .and_then(Value::as_array)
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
        .ok_or_else(|| invalid(&format!("unknown difficulty {difficulty_text:?}")))?;

    let lyrics = value.get("lyrics").map(|lyrics| {
        let real = lyrics
            .get("real")
            .and_then(Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| entry.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        let fake = match lyrics.get("fake") {
            Some(Value::String(text)) => vec![text.clone()],
            Some(Value::Array(entries)) => entries
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
            .and_then(Value::as_str)
            .unwrap_or("original");
        let relation_type = RelationType::from_str(relation_text)?;
        let confidence_text = mode
            .get("confidence")
            .and_then(Value::as_str)
            .unwrap_or("medium");
        let confidence = Confidence::from_str(confidence_text)?;
        Some(CoverMode {
            relation_type,
            original_song_id: mode
                .get("originalSongId")
                .and_then(Value::as_str)
                .map(str::to_string),
            original_artist: mode
                .get("originalArtist")
                .and_then(Value::as_str)
                .map(str::to_string),
            cover_artist: mode
                .get("coverArtist")
                .and_then(Value::as_str)
                .map(str::to_string),
            cover_year: mode
                .get("coverYear")
                .and_then(Value::as_i64)
                .map(|year| year as i32),
            reveal_prompt: mode
                .get("revealPrompt")
                .and_then(Value::as_str)
                .map(str::to_string),
            confidence,
        })
    });

    let preview_timestamp = value
        .get("previewTimestamp")
        .map(|preview| PreviewTimestamp {
            start: preview.get("start").and_then(Value::as_u64).unwrap_or(0) as u32,
            end: preview.get("end").and_then(Value::as_u64).unwrap_or(0) as u32,
        });

    let links = value.get("links").cloned().unwrap_or(Value::Null);
    let link = |field: &str| -> Option<String> {
        links.get(field).and_then(Value::as_str).map(str::to_string)
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
            .and_then(Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| entry.as_str().map(str::to_string))
                    .collect()
            }),
        lyrics,
        is_one_hit_wonder: value
            .get("isOneHitWonder")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        cover_mode,
        preview_timestamp,
        supported_modes: list("supportedModes"),
        is_qr_compatible: value
            .get("isQRCompatible")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        links: Links {
            youtube: links
                .get("youtube")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            cover_link: link("coverLink"),
            fallback_youtube_id: link("fallbackYoutubeId"),
            youtube_alternatives: links
                .get("youtubeAlternatives")
                .and_then(Value::as_array)
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
pub fn summary_of(song: &Song) -> Value {
    json!({
        "id": song.id,
        "difficulty": song.difficulty.as_str(),
        "packs": song.packs,
        "supportedModes": song.supported_modes,
        "isQrCompatible": song.is_qr_compatible,
        "hasLyrics": song.has_lyrics(),
    })
}

/// The packs of the catalogue.
pub fn packs_of(catalogue: &[Song]) -> Vec<Pack> {
    let mut packs: Vec<Pack> = Vec::new();
    for song in catalogue {
        for id in &song.packs {
            if packs.iter().any(|pack| &pack.id == id) {
                continue;
            }
            packs.push(Pack {
                id: id.clone(),
                name: id.clone(),
                tagline_key: format!("packs.{id}.tagline"),
            });
        }
    }
    packs
}
