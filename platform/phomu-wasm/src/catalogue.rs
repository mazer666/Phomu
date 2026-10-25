//! The catalogue of the base, as the web shell hands it over.
//!
//! WHAT: the reader of the catalogue artefact and the summary of a song.
//!
//! WHY the shell hands over the bytes: the base performs no file system
//! access and no network access; the catalogue arrives as bytes
//! (docs/design/BUILD-CONTRACT.md § 1.2, rule 1).
//!
//! WHY the artefact is compressed: the catalogue is the answer key of the
//! game. A shell that holds it can solve every round offline. The bytes
//! therefore travel compressed, and only the bridge inflates them — the
//! shell never sees a title, an artist or a lyric line
//! (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).

use std::io::Read;

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

/// The failure of a catalogue that cannot be inflated.
fn corrupt(reason: &str) -> crate::BridgeError {
    crate::BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: std::collections::HashMap::from([("reason".to_string(), reason.to_string())]),
    }
}

/// Reads a compressed catalogue artefact.
///
/// WHY the artefact is compressed: the catalogue is the answer key. It must
/// not lie around in the build output as plain text, and it must not reach
/// the shell in plain text either — the bridge inflates it and hands the
/// songs to the base (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// EXAMPLE: the bytes of `public/data/catalogue.json.gz` become the songs
/// of the session.
///
/// # Errors
/// Returns the failure of the base when the bytes are not a gzip stream, not
/// a JSON document or not a catalogue.
pub fn read_catalogue(compressed: &[u8]) -> Result<Vec<Song>, crate::BridgeError> {
    let mut plain = Vec::new();
    let mut decoder = flate2::read::GzDecoder::new(compressed);
    decoder
        .read_to_end(&mut plain)
        .map_err(|reason| corrupt(&format!("the catalogue is not gzip: {reason}")))?;
    let value: Value = serde_json::from_slice(&plain)
        .map_err(|reason| corrupt(&format!("the catalogue is not JSON: {reason}")))?;
    let songs = value
        .get("songs")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut parsed = Vec::with_capacity(songs.len());
    for song in &songs {
        parsed.push(read_song(song)?);
    }
    Ok(parsed)
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

/// The full entry of a song, as the reveal phase needs it.
///
/// WHY the reveal carries the whole entry: the reveal is the phase in which
/// the solution is released. The entry is therefore handed out here and not
/// before — the question phase never sees it
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// EXAMPLE: the reveal of a Lyrics Labyrinth round shows which line was the
/// invented one.
pub fn song_to_json(song: &Song) -> Value {
    json!({
        "id": song.id,
        "title": song.title,
        "artist": song.artist,
        "year": song.year,
        "country": song.country,
        "genre": song.genre,
        "coverUrl": song.cover_url,
        "difficulty": song.difficulty.as_str(),
        "mood": song.mood,
        "packs": song.packs,
        "hints": song.hints,
        "hintEvidence": song.hint_evidence,
        "lyrics": song.lyrics.as_ref().map(|lyrics| json!({
            "real": lyrics.real,
            "fake": lyrics.fake,
        })),
        "isOneHitWonder": song.is_one_hit_wonder,
        "coverMode": song.cover_mode.as_ref().map(|cover| json!({
            "relationType": cover.relation_type.as_str(),
            "originalSongId": cover.original_song_id,
            "originalArtist": cover.original_artist,
            "coverArtist": cover.cover_artist,
            "coverYear": cover.cover_year,
            "revealPrompt": cover.reveal_prompt,
            "confidence": cover.confidence.as_str(),
        })),
        "previewTimestamp": song.preview_timestamp.map(|window| json!({
            "start": window.start,
            "end": window.end,
        })),
        "supportedModes": song.supported_modes,
        "isQRCompatible": song.is_qr_compatible,
        "links": json!({
            "youtube": song.links.youtube,
            "coverLink": song.links.cover_link,
            "fallbackYoutubeId": song.links.fallback_youtube_id,
            "youtubeAlternatives": song.links.youtube_alternatives,
            "spotify": song.links.spotify,
            "spotifyFreePreview": song.links.spotify_free_preview,
            "appleMusic": song.links.apple_music,
            "amazonMusic": song.links.amazon_music,
            "amazonPrimePreview": song.links.amazon_prime_preview,
        }),
    })
}

/// The entry of a song, as the catalogue browser needs it.
///
/// WHY no hints and no lyrics: the browser shows what a visitor may see —
/// the title, the artist and the cover. The hints and the lyric lines are
/// the question and the answer of the game and stay in the base
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// EXAMPLE: the browser lists a song with its title and its cover.
pub fn browse_of(song: &Song) -> Value {
    json!({
        "id": song.id,
        "title": song.title,
        "artist": song.artist,
        "year": song.year,
        "country": song.country,
        "genre": song.genre,
        "coverUrl": song.cover_url,
        "difficulty": song.difficulty.as_str(),
        "mood": song.mood,
        "packs": song.packs,
        "supportedModes": song.supported_modes,
        "isQRCompatible": song.is_qr_compatible,
        "hasLyrics": song.has_lyrics(),
        "links": json!({
            "youtube": song.links.youtube,
            "coverLink": song.links.cover_link,
            "spotify": song.links.spotify,
            "spotifyFreePreview": song.links.spotify_free_preview,
            "appleMusic": song.links.apple_music,
            "amazonMusic": song.links.amazon_music,
            "amazonPrimePreview": song.links.amazon_prime_preview,
        }),
    })
}

/// The artists of the catalogue, without duplicates.
///
/// WHY the pool exists: the Cover Confusion mode offers the artist of the
/// song and two other artists of the catalogue. The pool therefore belongs
/// to the catalogue and not to the shell
/// (`core/phomu-core/src/session/prompt.rs`).
///
/// EXAMPLE: the pool of a catalogue of two songs is `["A", "B"]`.
pub fn artist_pool(catalogue: &[Song]) -> Vec<String> {
    let mut artists: Vec<String> = Vec::new();
    for song in catalogue {
        if !artists.iter().any(|artist| artist == &song.artist) {
            artists.push(song.artist.clone());
        }
    }
    artists
}

/// The years of the catalogue, without duplicates and in ascending order.
///
/// WHY the scale exists: the Timeline mode draws its axis from the years of
/// the catalogue. The scale is the same for every round and therefore
/// carries no information about the round that is running.
///
/// EXAMPLE: the scale of a catalogue with the years 1990 and 1985 is
/// `[1985, 1990]`.
pub fn year_scale(catalogue: &[Song]) -> Vec<i32> {
    let mut years: Vec<i32> = Vec::new();
    for song in catalogue {
        if !years.contains(&song.year) {
            years.push(song.year);
        }
    }
    years.sort_unstable();
    years
}

