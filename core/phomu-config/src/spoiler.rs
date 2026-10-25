//! The constants of the anti-spoiler boundary.
//!
//! WHAT: the threshold of the automatic censoring, the artists with a short
//! name that are nevertheless always censored, the words that are never
//! censored and the replacement of a censored token.
//!
//! WHY: the censoring is a product promise (CORE-005) and its thresholds are
//! the rule that decides what a hint may say. They therefore live in the
//! base and not in a single shell
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-2).

/// The minimum length for the automatic censoring
/// (`src/config/spoiler-config.ts:13`).
///
/// A token that is shorter is only censored when it is listed in
/// [`SPOILER_EXCEPTIONS`].
///
/// EXAMPLE: the token `"Die"` is too short to be censored, the token
/// `"Laterne"` is long enough.
pub const SPOILER_MIN_LENGTH: usize = 4;

/// The artists with a short name that are nevertheless always censored
/// (`src/config/spoiler-config.ts:19-22`).
///
/// The list holds **38** entries; `docs/design/GAME-CONTRACT.md` § 3.4
/// quotes 45. The measured list of the reference implementation is
/// authoritative.
///
/// EXAMPLE: the artist `"BTS"` is censored although its name is shorter
/// than [`SPOILER_MIN_LENGTH`].
pub const SPOILER_EXCEPTIONS: [&str; 38] = [
    "BTS",
    "TLC",
    "U2",
    "REM",
    "R.E.M.",
    "SIA",
    "DMX",
    "HIM",
    "JLS",
    "ELO",
    "YES",
    "AIR",
    "ABC",
    "112",
    "JAY",
    "ZAY",
    "NWA",
    "N.W.A.",
    "NAS",
    "E17",
    "311",
    "LFO",
    "KRS",
    "GZA",
    "RZA",
    "MIA",
    "M.I.A.",
    "GNR",
    "G'N'R",
    "NEO",
    "BVB",
    "STS",
    "DÖF",
    "DAF",
    "Fettes Brot",
    "Die Ärzte",
    "2Pac",
    "50 Cent",
];

/// The words that are never censored, even when they are part of the title
/// (`src/config/spoiler-config.ts:25-28`).
///
/// The list holds **20** entries; `docs/design/GAME-CONTRACT.md` § 3.4
/// quotes 21.
///
/// EXAMPLE: the word `"THE"` is never censored, even in a title.
pub const SPOILER_IGNORE_WORDS: [&str; 20] = [
    "THE", "AND", "WITH", "FROM", "FEAT", "THAT", "THIS", "YOUR", "MINE", "SOME", "DER", "DIE",
    "DAS", "UND", "MIT", "VON", "FÜR", "EINE", "EINER", "EINES",
];

/// The replacement of a censored token (`src/utils/censor-utils.ts:56`).
///
/// EXAMPLE: the hint `"Die Band sang das"` becomes `"Die [XXX] sang das"`.
pub const SPOILER_REPLACEMENT: &str = "[XXX]";
