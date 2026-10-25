//! The constants of the catalogue, of the cards and of the features that
//! are not active.
//!
//! WHAT: the bounds of the year of a catalogue entry, the format of the
//! physical cards and the switches of the features that the product does
//! not activate.
//!
//! WHY: the catalogue bounds belong to the game, not to the catalogue
//! artefact: a song from the year 1200 is invalid in every platform.

/// The earliest permissible year of a catalogue entry
/// (`src/config/song-year-range.ts:19`).
///
/// The catalogue contains classical works, therefore the lower bound lies
/// before 1900.
///
/// EXAMPLE: a song from 1985 is inside the bounds, a song from 1200 is not.
pub const CATALOG_MIN_SONG_YEAR: i32 = 1500;

/// The number of years above the current year that are permitted
/// (`src/config/song-year-range.ts:22`).
///
/// EXAMPLE: with the current year 2026 a song from 2027 is still permitted.
pub const CATALOG_MAX_SONG_YEAR_OFFSET: i32 = 1;

/// The width of a physical card, in millimetres
/// (`src/config/game-config.ts:322`).
///
/// EXAMPLE: a card is 59 millimetres wide.
pub const CARD_WIDTH_MM: u32 = 59;

/// The height of a physical card, in millimetres
/// (`src/config/game-config.ts:323`).
///
/// EXAMPLE: a card is 91 millimetres high.
pub const CARD_HEIGHT_MM: u32 = 91;

/// The bleed of a physical card, in millimetres
/// (`src/config/game-config.ts:324`).
///
/// EXAMPLE: the bleed of a card is three millimetres.
pub const CARD_BLEED_MM: u32 = 3;

/// The maximum number of cards per printed set
/// (`src/config/game-config.ts:325`).
///
/// EXAMPLE: a printed set holds at most 110 cards.
pub const MAX_CARDS_PER_SET: u32 = 110;

/// Whether the chips/betting mechanic is active
/// (`src/config/game-config.ts:319`).
///
/// EXAMPLE: the chips mechanic is switched off.
pub const ENABLE_CHIPS_BETTING: bool = false;

/// Whether a duplicate year is removed from the Timeline automatically
/// (`src/config/game-config.ts:316`).
///
/// EXAMPLE: a duplicate year is removed again immediately.
pub const FORCE_REMOVE_DUPLICATE_YEARS: bool = true;
