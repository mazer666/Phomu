//! The selection rules of the catalogue.
//!
//! WHAT: the criteria of a draw ([`SelectionCriteria`]), the result of a
//! draw ([`Selection`]) and the function that performs it
//! ([`select_song`]).
//!
//! WHY: the draw is a rule with a fixed order of filters and a fixed
//! fallback chain. The reference implementation is `src/utils/song-picker.ts:28-85`;
//! the base ports it unchanged and additionally *reports* which filter had
//! to be discarded, so that a shell can tell the players that the mode runs
//! on unsupported songs (open point OPEN-07 in `docs/spec/SRS.md`).

use crate::model::{Difficulty, Song};

/// The legacy lobby identifiers and the pack they stand for today.
///
/// The legacy identifiers do not occur in the `packs` list of any song and
/// therefore produced empty selections
/// (`src/config/game-config.ts:284-297`).
const PACK_ALIASES: [(&str, &str); 12] = [
    ("global-hits", "Global Hits 1950-2026"),
    ("80s-flashback", "80s Flashback"),
    ("90s-rave", "90s Unplugged"),
    ("guilty-pleasures", "Indie & Alternative"),
    ("rock-anthens", "Rock Anthems"),
    ("summer-vibes", "Dance Floor Fillers"),
    ("global-beats", "World, Reggae & Soul"),
    ("movie-magic", "Movie Hits"),
    ("legendary-voices", "60s & 70s Soul & Rock Legends"),
    ("modern-charts", "2010s & 2020s Chart Toppers"),
    ("eurovision-icons", "Schlager & Evergreens"),
    ("tiktok-viral", "Hip Hop Essentials"),
];

/// Replaces the legacy lobby identifiers by the current pack keys.
///
/// WHY: a stored session of an older version still carries the legacy
/// identifiers; without the mapping the pack filter would empty the pool
/// and the draw would silently fall back to the whole catalogue
/// (`src/config/game-config.ts:284-297`).
///
/// EXAMPLE: `normalize_pack_ids(&["global-hits".to_string()])` is
/// `["Global Hits 1950-2026"]`.
pub fn normalize_pack_ids(pack_ids: &[String]) -> Vec<String> {
    pack_ids
        .iter()
        .map(|id| {
            PACK_ALIASES
                .iter()
                .find(|(legacy, _)| legacy == id)
                .map_or(id.clone(), |(_, current)| (*current).to_string())
        })
        .collect()
}

/// What a draw has to respect.
///
/// WHY: the criteria are the *input* of the draw and never change during a
/// session; the draw itself is the only thing that interprets them, so that
/// two shells that draw with the same criteria draw the same song
/// (docs/design/PLATFORM-ARCHITECTURE.md § 9).
///
/// EXAMPLE: an empty `selected_packs` list means "every pack".
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SelectionCriteria {
    /// The identifiers of the songs that have already been played.
    pub played_ids: Vec<String>,
    /// The packs the session draws from. An empty list means "every pack".
    pub selected_packs: Vec<String>,
    /// The difficulty the songs have to have. `None` means "every difficulty".
    pub difficulty: Option<Difficulty>,
    /// Whether only songs with a physical card may be drawn.
    pub only_qr_compatible: bool,
    /// The identifier of the mode the song has to support.
    pub mode_id: Option<String>,
}

/// A filter that had to be discarded because it would have emptied the pool.
///
/// WHY: a discarded filter is not an error — the draw still produces a song
/// — but the shell has to be able to tell the players that the round runs
/// on songs that do not meet the criteria of the lobby.
///
/// EXAMPLE: a draw that had to ignore the difficulty filter reports
/// `Fallback::DifficultyFilter`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Fallback {
    /// The pack filter was discarded; the whole catalogue is used.
    PackFilter,
    /// The QR filter was discarded.
    QrFilter,
    /// The difficulty filter was discarded.
    DifficultyFilter,
    /// The mode filter was discarded.
    ModeFilter,
    /// The "not yet played" filter was discarded; the last five played songs
    /// may be drawn again.
    PlayedFilter,
}

/// The result of a draw.
///
/// WHY: the result names the discarded filters, so that a shell can tell the
/// players that the mode runs on songs that do not meet the criteria of the
/// lobby (open point OPEN-07 in `docs/spec/SRS.md`).
///
/// EXAMPLE: a draw with an empty pool returns `None`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Selection {
    /// The drawn song.
    pub song: Song,
    /// The index of the song inside the pool it was drawn from.
    pub index: usize,
    /// The number of songs the draw was made from.
    pub pool_size: usize,
    /// The filters that had to be discarded, in the order in which they were
    /// tried.
    pub fallbacks: Vec<Fallback>,
}

/// Draws a song that matches the criteria.
///
/// WHY: the draw is a rule with a fixed order of filters and a fixed
/// fallback chain. The reference implementation keeps it in
/// `src/utils/song-picker.ts:28-85`; a shell that draws its own song draws
/// a different song.
///
/// The order of the filters and the fallback chain are the ones of
/// `src/utils/song-picker.ts:36-84`:
///
/// 1. the pack filter — if it empties the pool, the whole catalogue is used;
/// 2. the QR filter — discarded if it empties the pool;
/// 3. the difficulty filter — discarded if it empties the pool;
/// 4. the mode filter — for the Lyrics Labyrinth a song without lyrics is
///    excluded, for every other mode the song has to support the mode; the
///    filter is discarded if it empties the pool, except for the Lyrics
///    Labyrinth, which falls back to the songs that have lyrics;
/// 5. the "not yet played" filter — if every song has been played, the last
///    five played songs are allowed again.
///
/// The draw is deterministic: the same pool and the same `draw` value always
/// produce the same song. The shell supplies the `draw` value from its
/// seeded generator, which makes a round reproducible
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
///
/// Returns `None` when the catalogue is empty or when no song satisfies the
/// criteria — the caller maps that onto the error `CatalogueEmpty`.
///
/// EXAMPLE: a catalogue with one song and no criteria draws that song.
pub fn select_song(songs: &[Song], criteria: &SelectionCriteria, draw: u64) -> Option<Selection> {
    let (pool, mut fallbacks) = filter_pool(songs, criteria);
    if pool.is_empty() {
        return None;
    }

    // 5. Prefer songs that have not been played yet.
    let available: Vec<&Song> = pool
        .iter()
        .copied()
        .filter(|song| !criteria.played_ids.contains(&song.id))
        .collect();
    let final_pool: Vec<&Song> = if !available.is_empty() {
        available
    } else {
        let recent = recently_played(&criteria.played_ids);
        let fallback: Vec<&Song> = pool
            .iter()
            .copied()
            .filter(|song| !recent.contains(&song.id))
            .collect();
        fallbacks.push(Fallback::PlayedFilter);
        if fallback.is_empty() {
            pool.clone()
        } else {
            fallback
        }
    };

    if final_pool.is_empty() {
        return None;
    }

    let index = (draw % final_pool.len() as u64) as usize;
    let song = (*final_pool.get(index)?).clone();
    Some(Selection {
        song,
        index,
        pool_size: final_pool.len(),
        fallbacks,
    })
}

/// The pool of the songs that survive the filters of the criteria.
///
/// WHY: the probe of the conformance vectors needs the pool itself and not
/// a drawn song. The chain of the filters is the one of `select_song`, so
/// that the probe and the draw cannot drift apart.
///
/// EXAMPLE: the pool of a pack filter contains the songs of the pack.
pub fn filter_pool<'a>(
    songs: &'a [Song],
    criteria: &SelectionCriteria,
) -> (Vec<&'a Song>, Vec<Fallback>) {
    if songs.is_empty() {
        return (Vec::new(), Vec::new());
    }

    let mut fallbacks: Vec<Fallback> = Vec::new();

    // 1. Pack filter. An empty selection means "every pack".
    let pack_ids = normalize_pack_ids(&criteria.selected_packs);
    let base_pool: Vec<&Song> = if pack_ids.is_empty() {
        songs.iter().collect()
    } else {
        let filtered: Vec<&Song> = songs
            .iter()
            .filter(|song| song.packs.iter().any(|pack| pack_ids.contains(pack)))
            .collect();
        if filtered.is_empty() {
            fallbacks.push(Fallback::PackFilter);
            songs.iter().collect()
        } else {
            filtered
        }
    };

    // 2. QR filter — a soft fallback.
    let mut pool = base_pool.clone();
    if criteria.only_qr_compatible {
        let filtered: Vec<&Song> = base_pool
            .iter()
            .copied()
            .filter(|song| song.is_qr_compatible)
            .collect();
        if !filtered.is_empty() {
            pool = filtered;
        } else {
            fallbacks.push(Fallback::QrFilter);
        }
    }

    // 3. Difficulty filter — a soft fallback.
    if let Some(difficulty) = criteria.difficulty {
        let filtered: Vec<&Song> = pool
            .iter()
            .copied()
            .filter(|song| song.difficulty == difficulty)
            .collect();
        if !filtered.is_empty() {
            pool = filtered;
        } else {
            fallbacks.push(Fallback::DifficultyFilter);
        }
    }

    // 4. Mode filter — a soft fallback, with a hard fallback for the Lyrics
    //    Labyrinth, which requires lyric data.
    if let Some(mode_id) = criteria.mode_id.as_deref() {
        let filtered: Vec<&Song> = if mode_id == "lyrics" {
            pool.iter()
                .copied()
                .filter(|song| song.has_lyrics())
                .collect()
        } else {
            pool.iter()
                .copied()
                .filter(|song| song.supports_mode(mode_id))
                .collect()
        };
        if !filtered.is_empty() {
            pool = filtered;
        } else if mode_id == "lyrics" {
            // The hard fallback ignores the difficulty and the QR filter.
            let absolute: Vec<&Song> = base_pool
                .iter()
                .copied()
                .filter(|song| song.has_lyrics())
                .collect();
            if !absolute.is_empty() {
                pool = absolute;
            } else {
                fallbacks.push(Fallback::ModeFilter);
            }
        } else {
            fallbacks.push(Fallback::ModeFilter);
        }
    }

    (pool, fallbacks)
}

/// The last played songs that stay excluded when the pool is exhausted.
///
/// WHY: the reference implementation lets the last five played songs be
/// drawn again (`src/utils/song-picker.ts:117`).
///
/// EXAMPLE: with the played songs `["a", "b", "c"]` the result is `["c"]`.
fn recently_played(played_ids: &[String]) -> Vec<String> {
    const RECENT: usize = 5;
    if played_ids.len() <= RECENT {
        return played_ids.to_vec();
    }
    let start = played_ids.len() - RECENT;
    played_ids
        .get(start..)
        .map(<[String]>::to_vec)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests;
