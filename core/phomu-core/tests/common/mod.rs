//! The fixtures of the integration tests.
//!
//! WHY: the tests of the base need the same catalogue entries over and
//! over again. One place that builds them keeps the tests readable and
//! makes a change of the model visible in one file.

#![allow(dead_code)]

use phomu_core::facade::{Difficulty, Links, Lyrics, Song};

/// A catalogue entry with every field filled.
pub fn song(id: &str, title: &str, artist: &str, year: i32) -> Song {
    Song {
        id: id.to_string(),
        title: title.to_string(),
        artist: artist.to_string(),
        year,
        country: "DE".to_string(),
        genre: "Pop".to_string(),
        cover_url: None,
        difficulty: Difficulty::Easy,
        mood: vec!["Chill".to_string(), "Epic".to_string()],
        packs: vec!["Global Hits 1950-2026".to_string()],
        hints: vec![
            "Ein Synthesizer".to_string(),
            "Ein Klavier".to_string(),
            "Eine Schlagzeugmaschine".to_string(),
            "Ein Verzerrer".to_string(),
            "Fast schon der Refrain".to_string(),
        ],
        hint_evidence: Some(vec![
            "https://example.org/1".to_string(),
            "https://example.org/2".to_string(),
            "https://example.org/3".to_string(),
            "https://example.org/4".to_string(),
            "https://example.org/5".to_string(),
        ]),
        lyrics: Some(Lyrics {
            real: vec![
                "Erste Zeile".to_string(),
                "Zweite Zeile".to_string(),
                "Dritte Zeile".to_string(),
            ],
            fake: vec!["Erfundene Zeile".to_string()],
        }),
        is_one_hit_wonder: true,
        cover_mode: None,
        preview_timestamp: None,
        supported_modes: vec![
            "timeline".to_string(),
            "hint-master".to_string(),
            "lyrics".to_string(),
            "vibe-check".to_string(),
            "survivor".to_string(),
            "cover-confusion".to_string(),
        ],
        is_qr_compatible: true,
        links: Links {
            youtube: "abcdefghijk".to_string(),
            ..Links::default()
        },
    }
}

/// A catalogue entry without lyric data.
pub fn song_without_lyrics(id: &str) -> Song {
    let mut entry = song(id, "Titel", "Künstler", 1990);
    entry.lyrics = None;
    entry
}

/// The players of a session.
pub fn players(count: usize) -> Vec<phomu_core::facade::Player> {
    (0..count)
        .map(|index| {
            phomu_core::facade::Player::new(format!("p{index}"), format!("Spieler {index}"))
        })
        .collect()
}

/// The teams of a session.
pub fn teams(count: usize) -> Vec<phomu_core::facade::Team> {
    (0..count)
        .map(|index| phomu_core::facade::Team::new(format!("t{index}"), format!("Team {index}")))
        .collect()
}

/// The pool of the artists of the catalogue.
pub fn artist_pool() -> Vec<String> {
    vec![
        "Alpha".to_string(),
        "Beta".to_string(),
        "Gamma".to_string(),
        "Delta".to_string(),
        "Epsilon".to_string(),
    ]
}
