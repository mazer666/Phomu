//! The data model of the catalogue.
//!
//! WHAT: the types a catalogue entry consists of.
//!
//! WHY: the model is the contract between the catalogue artefact and the
//! rules. A field that does not exist in the model cannot be read by a
//! rule, and a rule that needs a field has to argue for it here first.

/// How well known a song is.
///
/// WHY: the difficulty decides which songs are drawn at which difficulty
/// setting; it is therefore part of the model of the catalogue and not of
/// the lobby (`src/types/song.ts:19`).
///
/// EXAMPLE: `Difficulty::Easy` is the difficulty of a song everybody knows.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Difficulty {
    /// Everybody knows it.
    Easy,
    /// Most people know it.
    Medium,
    /// Only the fans know it.
    Hard,
}

impl Difficulty {
    /// Every difficulty, in the order of the reference implementation
    /// (`src/utils/validate-song-data.ts:205`).
    pub const ALL: &'static [Difficulty] =
        &[Difficulty::Easy, Difficulty::Medium, Difficulty::Hard];

    /// The identifier of the difficulty.
    ///
    /// WHY: the identifier is the key of the difficulty in the catalogue
    /// artefact, therefore it has to be stable and has to be the same on
    /// every platform.
    ///
    /// EXAMPLE: `Difficulty::Hard.as_str()` is `"hard"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            Difficulty::Easy => "easy",
            Difficulty::Medium => "medium",
            Difficulty::Hard => "hard",
        }
    }

    /// The difficulty of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`. The trait would force a
    /// `Result` with a second error type into this leaf crate, which may not
    /// depend on the error taxonomy of `phomu-errors` (the star topology of
    /// `docs/design/BUILD-CONTRACT.md` § 1.1) — the same failure would then
    /// have two representations.
    ///
    /// EXAMPLE: `Difficulty::from_str("easy")` is `Some(Difficulty::Easy)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; a leaf crate may not carry a second error taxonomy"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "easy" => Some(Difficulty::Easy),
            "medium" => Some(Difficulty::Medium),
            "hard" => Some(Difficulty::Hard),
            _ => None,
        }
    }
}

/// The relation of a song to the work it is based on
/// (`src/types/song.ts:23`).
///
/// WHY: the Cover Confusion mode asks whether a song is a cover; the
/// relation therefore has to be part of the catalogue and not of the mode.
///
/// EXAMPLE: `RelationType::Cover` is the relation of a cover version.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum RelationType {
    /// The song is the original work.
    Original,
    /// The song is a cover of another work.
    Cover,
    /// The song samples another work.
    Sample,
    /// The song is a remix of another work.
    Remix,
}

impl RelationType {
    /// The identifier of the relation type.
    ///
    /// WHY: the identifier is the key of the relation in the catalogue
    /// artefact, therefore it has to be stable and has to be the same on
    /// every platform.
    ///
    /// EXAMPLE: `RelationType::Cover.as_str()` is `"cover"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            RelationType::Original => "original",
            RelationType::Cover => "cover",
            RelationType::Sample => "sample",
            RelationType::Remix => "remix",
        }
    }

    /// The relation type of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; a `Result` would force a second
    /// error type into this leaf crate.
    ///
    /// EXAMPLE: `RelationType::from_str("cover")` is
    /// `Some(RelationType::Cover)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; a leaf crate may not carry a second error taxonomy"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "original" => Some(RelationType::Original),
            "cover" => Some(RelationType::Cover),
            "sample" => Some(RelationType::Sample),
            "remix" => Some(RelationType::Remix),
            _ => None,
        }
    }
}

/// The confidence in the cover metadata of a song
/// (`src/types/song.ts:35`).
///
/// WHY: the maintainers have to be able to see how sure they are; the
/// confidence therefore belongs to the data and not to a comment.
///
/// EXAMPLE: `Confidence::High` means that the metadata was verified.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Confidence {
    /// The metadata is uncertain.
    Low,
    /// The metadata is plausible.
    Medium,
    /// The metadata was verified.
    High,
}

impl Confidence {
    /// The identifier of the confidence level.
    ///
    /// WHY: the identifier is the key of the confidence in the catalogue
    /// artefact, therefore it has to be stable and has to be the same on
    /// every platform.
    ///
    /// EXAMPLE: `Confidence::High.as_str()` is `"high"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            Confidence::Low => "low",
            Confidence::Medium => "medium",
            Confidence::High => "high",
        }
    }

    /// The confidence level of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; a `Result` would force a second
    /// error type into this leaf crate.
    ///
    /// EXAMPLE: `Confidence::from_str("low")` is `Some(Confidence::Low)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; a leaf crate may not carry a second error taxonomy"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "low" => Some(Confidence::Low),
            "medium" => Some(Confidence::Medium),
            "high" => Some(Confidence::High),
            _ => None,
        }
    }
}

/// The lyric lines of a song for the Lyrics Labyrinth mode
/// (`src/types/song.ts:97-102`).
///
/// WHY: the mode mixes the real lines with an invented one; the invented
/// line is therefore part of the catalogue and not of the mode.
///
/// EXAMPLE: a song with three real lines and one invented line can be
/// played in the Lyrics Labyrinth.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Lyrics {
    /// Exactly three real lines of the song.
    pub real: Vec<String>,
    /// One or four invented lines that sound plausible.
    pub fake: Vec<String>,
}

/// The part of the song that is played (`src/types/song.ts:121-126`).
///
/// WHY: the offsets are a rule and not a player detail — every platform
/// has to play the same part of the song (MEDIA-007).
///
/// EXAMPLE: the window from 30 to 60 seconds plays the chorus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PreviewTimestamp {
    /// The offset in seconds at which the playback starts.
    pub start: u32,
    /// The offset in seconds at which the playback stops.
    pub end: u32,
}

/// The metadata of the Cover Confusion mode (`src/types/song.ts:21-36`).
///
/// WHY: the mode needs to know the original artist and how sure the
/// maintainers are; both are properties of the song, not of the round.
///
/// EXAMPLE: a song with a `cover_mode` can be played in the Cover
/// Confusion mode.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverMode {
    /// The relation of the song to the original work.
    pub relation_type: RelationType,
    /// The identifier of the original song, if it is known.
    pub original_song_id: Option<String>,
    /// The artist of the original work.
    pub original_artist: Option<String>,
    /// The artist of the cover version.
    pub cover_artist: Option<String>,
    /// The year of the cover version.
    pub cover_year: Option<i32>,
    /// An optional sentence for the reveal. It is *content*, not UI text.
    pub reveal_prompt: Option<String>,
    /// The confidence in the metadata.
    pub confidence: Confidence,
}

/// The streaming links of a song (`src/types/song.ts:142-164`).
///
/// The YouTube link is mandatory; every other provider is optional. The
/// presence of a link is what the media policy uses to build the fallback
/// chain.
///
/// EXAMPLE: a song with only a YouTube link can still be played.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Links {
    /// The YouTube video identifier or URL.
    pub youtube: String,
    /// The YouTube link of the cover version, for the Cover Confusion mode.
    pub cover_link: Option<String>,
    /// A backup YouTube identifier if the primary one is region-locked.
    pub fallback_youtube_id: Option<String>,
    /// Further YouTube identifiers, in the order of the fallback.
    pub youtube_alternatives: Vec<String>,
    /// The Spotify track URI or URL.
    pub spotify: Option<String>,
    /// The Spotify Free preview URL.
    pub spotify_free_preview: Option<String>,
    /// The Apple Music track URL.
    pub apple_music: Option<String>,
    /// The Amazon Music URL.
    pub amazon_music: Option<String>,
    /// The Amazon Prime preview URL.
    pub amazon_prime_preview: Option<String>,
}

/// One entry of the catalogue (`src/types/song.ts:42-165`).
///
/// WHY: the model is the contract between the catalogue artefact and the
/// rules; a field that does not exist here cannot be read by a rule.
///
/// EXAMPLE: an entry with the identifier `"song-1"` is one song of the
/// catalogue artefact.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Song {
    /// The unique identifier of the entry.
    pub id: String,
    /// The title as it was released.
    pub title: String,
    /// The primary artist or band.
    pub artist: String,
    /// The year of the release.
    pub year: i32,
    /// The ISO 3166-1 alpha-2 country code of the artist.
    pub country: String,
    /// The musical genre.
    pub genre: String,
    /// The URL of the cover art.
    pub cover_url: Option<String>,
    /// How well known the song is.
    pub difficulty: Difficulty,
    /// The mood tags of the song, used by the Vibe-Check mode.
    pub mood: Vec<String>,
    /// The packs the song belongs to.
    pub packs: Vec<String>,
    /// Up to five hints, ordered from the hardest to the easiest.
    pub hints: Vec<String>,
    /// The verifiable sources of the hints.
    pub hint_evidence: Option<Vec<String>>,
    /// The lyric lines, if the catalogue has them.
    pub lyrics: Option<Lyrics>,
    /// Whether the artist is a one-hit wonder.
    pub is_one_hit_wonder: bool,
    /// The metadata of the Cover Confusion mode.
    pub cover_mode: Option<CoverMode>,
    /// The part of the song that is played.
    pub preview_timestamp: Option<PreviewTimestamp>,
    /// The modes the song supports.
    pub supported_modes: Vec<String>,
    /// Whether the song is on the physical card deck.
    pub is_qr_compatible: bool,
    /// The streaming links of the song.
    pub links: Links,
}

impl Song {
    /// The decade of the release year.
    ///
    /// WHY: the decade is the unit in which the Timeline mode groups the
    /// years; the calculation therefore belongs to the model and not to the
    /// shell that draws the timeline.
    ///
    /// EXAMPLE: a song from 1985 is in the decade `1980`.
    pub const fn decade(&self) -> i32 {
        self.year - (self.year % 10)
    }

    /// Whether the song carries lyric data.
    ///
    /// WHY: the Lyrics Labyrinth needs lyric data, and a song without it
    /// falls back to the bonus round (GAME-029).
    ///
    /// EXAMPLE: a song with `lyrics: None` has `has_lyrics() == false`.
    pub const fn has_lyrics(&self) -> bool {
        self.lyrics.is_some()
    }

    /// Whether the song supports a mode.
    ///
    /// WHY: the mode filter of the draw compares the modes of the song
    /// with the mode of the round; the membership therefore has to be
    /// decided in one place.
    ///
    /// EXAMPLE: `song.supports_mode("lyrics")` is `true` for a song whose
    /// `supported_modes` contain `"lyrics"`.
    pub fn supports_mode(&self, mode_id: &str) -> bool {
        self.supported_modes.iter().any(|mode| mode == mode_id)
    }

    /// Whether the song belongs to a pack.
    ///
    /// WHY: the pack filter of the draw compares the pack list of the song
    /// with the packs of the lobby; the membership therefore has to be
    /// decided in one place.
    ///
    /// EXAMPLE: `song.belongs_to_pack("Pack A")` is `true` for a song whose
    /// `packs` contain `"Pack A"`.
    pub fn belongs_to_pack(&self, pack_id: &str) -> bool {
        self.packs.iter().any(|pack| pack == pack_id)
    }
}

/// A content pack (`src/config/game-config.ts:89-279`).
///
/// WHY: the pack carries an identifier, a name and the key of its tagline. The
/// tagline itself is a text and therefore lives in the locale files of the
/// shell; the pack list itself is catalogue content, not game configuration
/// (docs/design/BUILD-CONTRACT.md § 5.3).
///
/// EXAMPLE: the pack with the identifier `"Global Hits 1950-2026"` is the
/// pack a lobby selects by default.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Pack {
    /// The identifier of the pack, as it appears in `song.packs`.
    pub id: String,
    /// The display name of the pack.
    pub name: String,
    /// The i18n key of the tagline of the pack.
    pub tagline_key: String,
}

#[cfg(test)]
mod tests;
