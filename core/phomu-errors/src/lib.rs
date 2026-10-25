//! The error taxonomy of the Phomu base.
//!
//! WHAT: a closed enumeration of the failures the base can produce
//! ([`ErrorCode`]), an error value that carries the code, the i18n message
//! key and a context list ([`PhomuError`]).
//!
//! WHY: six shells have to classify a failure in the same way. A free-text
//! error message cannot be classified; a numeric code can. The numbers are
//! part of the ABI that the bridges expose, therefore they are stable:
//!
//! * **A number is never reused.** A retired code keeps its number and is
//!   never handed out again, so that an old shell does not read a new
//!   meaning into an old number.
//! * **A number is never renumbered.** A new failure gets a new number at
//!   the end of its range.
//! * Removing a variant is a breaking change of the ABI and needs a major
//!   version bump of the core (docs/design/BUILD-CONTRACT.md § 3.3).
//!
//! The number ranges are:
//!
//! | Range | Meaning |
//! |---|---|
//! | `1000..=1099` | the input or the configuration is wrong |
//! | `1100..=1199` | the state or the phase does not allow the operation |
//! | `1200..=1299` | the catalogue is empty, incomplete or inconsistent |
//! | `1300..=1399` | the media could not be played |
//! | `1400..=1499` | an internal invariant was violated |
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_errors::{ErrorCode, PhomuError};
//!
//! let error = PhomuError::new(ErrorCode::AnswersNotLocked)
//!     .with_context("round", "3");
//! assert_eq!(error.code(), ErrorCode::AnswersNotLocked);
//! assert_eq!(error.message_key(), "errors.answersNotLocked");
//! ```

#![forbid(unsafe_code)]
#![deny(missing_docs)]

use std::error::Error;
use std::fmt;

/// The stable numeric code of a failure.
///
/// WHY: the numeric value is the ABI: a bridge hands the number to the
/// shell and the shell maps it onto its own error handling. The numbers are
/// never reused — see the [crate documentation](crate).
///
/// EXAMPLE: `ErrorCode::AnswersNotLocked` is the number 1102.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[repr(u16)]
pub enum ErrorCode {
    // ── 1000–1099: the input or the configuration is wrong ──────────────
    /// The session configuration is inconsistent or out of range.
    InvalidConfiguration = 1001,
    /// The number of players is outside the permitted range.
    InvalidPlayerCount = 1002,
    /// The number of teams is outside the permitted range.
    InvalidTeamCount = 1003,
    /// The referenced player does not exist in the session.
    UnknownPlayer = 1004,
    /// The referenced team does not exist in the session.
    UnknownTeam = 1005,
    /// The referenced game mode does not exist.
    UnknownMode = 1006,
    /// The answer does not fit the mode or the phase it was given in.
    InvalidAnswer = 1007,
    /// The difficulty is not one of the known difficulties.
    InvalidDifficulty = 1008,
    /// A selection was empty where at least one entry is required.
    EmptySelection = 1009,
    /// The random draw could not be turned into a valid selection.
    InvalidDraw = 1010,

    // ── 1100–1199: the state or the phase does not allow it ─────────────
    /// The operation is not available in the current round phase.
    NotAvailableInPhase = 1101,
    /// The answers of the round are not locked in yet.
    AnswersNotLocked = 1102,
    /// The round has no song drawn.
    NoSongDrawn = 1103,
    /// The game has already ended.
    GameAlreadyOver = 1104,
    /// There is no active player (the turn order is empty).
    NoActivePlayer = 1105,
    /// The player has already answered in this round.
    DuplicateAnswer = 1106,
    /// The requested phase transition is not part of the automaton.
    InvalidTransition = 1107,
    /// The round is not complete and cannot be closed yet.
    RoundNotComplete = 1108,
    /// The mode is not enabled for this session.
    ModeNotEnabled = 1109,

    // ── 1200–1299: the catalogue ───────────────────────────────────────
    /// The catalogue contains no song at all.
    CatalogueEmpty = 1201,
    /// The requested song does not exist in the catalogue.
    SongNotFound = 1202,
    /// The song does not satisfy the catalogue schema.
    InvalidSongData = 1203,
    /// The requested pack does not exist in the catalogue.
    PackNotFound = 1204,
    /// Two songs of the catalogue carry the same identifier.
    DuplicateSongId = 1205,

    // ── 1300–1399: the media ───────────────────────────────────────────
    /// The provider is not available for this song.
    MediaUnavailable = 1301,
    /// The provider refused the playback (blocked or restricted).
    MediaBlocked = 1302,
    /// The playback failed.
    MediaFailed = 1303,
    /// The playback did not start within the permitted time.
    MediaTimedOut = 1304,
    /// Every provider of the fallback chain has been tried.
    MediaProvidersExhausted = 1305,

    // ── 1400–1499: internal ────────────────────────────────────────────
    /// An internal invariant was violated. This is the code a panic is
    /// converted into at the bridge boundary.
    Internal = 1401,
}

impl ErrorCode {
    /// Every code of the taxonomy, in ascending numeric order.
    ///
    /// WHY: a shell that wants to build a complete error table needs the
    /// whole list, and a test that checks the taxonomy against the message
    /// key space needs it as well.
    ///
    /// EXAMPLE: `ErrorCode::ALL` has 30 entries.
    pub const ALL: &'static [ErrorCode] = &[
        ErrorCode::InvalidConfiguration,
        ErrorCode::InvalidPlayerCount,
        ErrorCode::InvalidTeamCount,
        ErrorCode::UnknownPlayer,
        ErrorCode::UnknownTeam,
        ErrorCode::UnknownMode,
        ErrorCode::InvalidAnswer,
        ErrorCode::InvalidDifficulty,
        ErrorCode::EmptySelection,
        ErrorCode::InvalidDraw,
        ErrorCode::NotAvailableInPhase,
        ErrorCode::AnswersNotLocked,
        ErrorCode::NoSongDrawn,
        ErrorCode::GameAlreadyOver,
        ErrorCode::NoActivePlayer,
        ErrorCode::DuplicateAnswer,
        ErrorCode::InvalidTransition,
        ErrorCode::RoundNotComplete,
        ErrorCode::ModeNotEnabled,
        ErrorCode::CatalogueEmpty,
        ErrorCode::SongNotFound,
        ErrorCode::InvalidSongData,
        ErrorCode::PackNotFound,
        ErrorCode::DuplicateSongId,
        ErrorCode::MediaUnavailable,
        ErrorCode::MediaBlocked,
        ErrorCode::MediaFailed,
        ErrorCode::MediaTimedOut,
        ErrorCode::MediaProvidersExhausted,
        ErrorCode::Internal,
    ];

    /// The stable numeric value of the code.
    ///
    /// EXAMPLE: `ErrorCode::InvalidDraw.code()` is `1010`.
    pub const fn code(self) -> u16 {
        self as u16
    }

    /// The i18n message key that belongs to this code.
    ///
    /// WHY: the base never assembles a sentence; it names the key and the
    /// shell resolves the text in its own locale files
    /// (docs/design/BUILD-CONTRACT.md § 6.1, rule L-7).
    ///
    /// EXAMPLE: `ErrorCode::NotAvailableInPhase.message_key()` is
    /// `"errors.notAvailableInPhase"`.
    pub const fn message_key(self) -> &'static str {
        match self {
            ErrorCode::InvalidConfiguration => "errors.invalidConfiguration",
            ErrorCode::InvalidPlayerCount => "errors.invalidPlayerCount",
            ErrorCode::InvalidTeamCount => "errors.invalidTeamCount",
            ErrorCode::UnknownPlayer => "errors.unknownPlayer",
            ErrorCode::UnknownTeam => "errors.unknownTeam",
            ErrorCode::UnknownMode => "errors.unknownMode",
            ErrorCode::InvalidAnswer => "errors.invalidAnswer",
            ErrorCode::InvalidDifficulty => "errors.invalidDifficulty",
            ErrorCode::EmptySelection => "errors.emptySelection",
            ErrorCode::InvalidDraw => "errors.invalidDraw",
            ErrorCode::NotAvailableInPhase => "errors.notAvailableInPhase",
            ErrorCode::AnswersNotLocked => "errors.answersNotLocked",
            ErrorCode::NoSongDrawn => "errors.noSongDrawn",
            ErrorCode::GameAlreadyOver => "errors.gameAlreadyOver",
            ErrorCode::NoActivePlayer => "errors.noActivePlayer",
            ErrorCode::DuplicateAnswer => "errors.duplicateAnswer",
            ErrorCode::InvalidTransition => "errors.invalidTransition",
            ErrorCode::RoundNotComplete => "errors.roundNotComplete",
            ErrorCode::ModeNotEnabled => "errors.modeNotEnabled",
            ErrorCode::CatalogueEmpty => "errors.catalogueEmpty",
            ErrorCode::SongNotFound => "errors.songNotFound",
            ErrorCode::InvalidSongData => "errors.invalidSongData",
            ErrorCode::PackNotFound => "errors.packNotFound",
            ErrorCode::DuplicateSongId => "errors.duplicateSongId",
            ErrorCode::MediaUnavailable => "errors.mediaUnavailable",
            ErrorCode::MediaBlocked => "errors.mediaBlocked",
            ErrorCode::MediaFailed => "errors.mediaFailed",
            ErrorCode::MediaTimedOut => "errors.mediaTimedOut",
            ErrorCode::MediaProvidersExhausted => "errors.mediaProvidersExhausted",
            ErrorCode::Internal => "errors.internal",
        }
    }
}

/// The result type of every fallible operation of the base.
///
/// WHY: every fallible operation of the base returns the same error type, so
/// that a bridge can map every failure onto its own error handling without
/// knowing the operation.
///
/// EXAMPLE: `phomu_errors::Result<u32>` is the result of every operation of
/// the base that can fail.
pub type Result<T> = std::result::Result<T, PhomuError>;

/// A failure of the base: a stable code, the message key and the context.
///
/// WHY: the context carries the values that a shell needs to render a
/// helpful message — the round number, the player identifier, the provider
/// — without the base having to assemble a sentence
/// (docs/design/BUILD-CONTRACT.md § 6.1, rule L-7).
///
/// The context carries the values that a shell needs to render a helpful
/// message — the round number, the player identifier, the provider — without
/// the base having to assemble a sentence.
///
/// EXAMPLE:
///
/// ```
/// use phomu_errors::{ErrorCode, PhomuError};
///
/// let error = PhomuError::new(ErrorCode::UnknownPlayer)
///     .with_context("playerId", "p-42");
/// assert_eq!(error.code(), ErrorCode::UnknownPlayer);
/// assert!(error.to_string().contains("p-42"));
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PhomuError {
    code: ErrorCode,
    context: Vec<(String, String)>,
}

impl PhomuError {
    /// Creates an error for a code.
    ///
    /// WHY: the message key is taken from the code, so that the code and
    /// the key can never drift apart — a shell that resolves the key always
    /// finds the text of the code.
    ///
    /// EXAMPLE: `PhomuError::new(ErrorCode::UnknownMode)` carries the key
    /// `"errors.unknownMode"`.
    pub fn new(code: ErrorCode) -> Self {
        Self {
            code,
            context: Vec::new(),
        }
    }

    /// The stable code of the failure.
    ///
    /// EXAMPLE: the code of an `UnknownPlayer` error is `1004`.
    pub const fn code(&self) -> ErrorCode {
        self.code
    }

    /// The i18n message key of the failure.
    ///
    /// EXAMPLE: the key of an `UnknownPlayer` error is
    /// `"errors.unknownPlayer"`.
    pub const fn message_key(&self) -> &'static str {
        self.code.message_key()
    }

    /// The context of the failure, in the order it was added.
    ///
    /// WHY: the order is the order in which the caller added the values;
    /// a shell renders the context in that order.
    ///
    /// EXAMPLE: an error with the context `("round", "3")` has a context of
    /// one entry.
    pub fn context(&self) -> &[(String, String)] {
        &self.context
    }

    /// Adds one context value and returns the error.
    ///
    /// WHY: a later value with the same key replaces the earlier one, so
    /// that the context never carries the same key twice — a shell can
    /// render the context as a list of pairs.
    ///
    /// EXAMPLE: `PhomuError::new(ErrorCode::UnknownPlayer)
    /// .with_context("playerId", "p-42")` carries the context
    /// `("playerId", "p-42")`.
    pub fn with_context(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        let key = key.into();
        let value = value.into();
        if let Some(slot) = self.context.iter_mut().find(|(k, _)| *k == key) {
            slot.1 = value;
        } else {
            self.context.push((key, value));
        }
        self
    }

    /// The value of one context key, if it is present.
    ///
    /// WHY: a shell reads a single value of the context — the round number
    /// for a message — without having to walk the whole list.
    ///
    /// EXAMPLE: `error.context_value("playerId")` is `Some("p-42")` for the
    /// error above and `None` for every other key.
    pub fn context_value(&self, key: &str) -> Option<&str> {
        self.context
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

impl fmt::Display for PhomuError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.code.message_key(), self.code.code())?;
        for (key, value) in &self.context {
            write!(f, " {key}={value}")?;
        }
        Ok(())
    }
}

impl Error for PhomuError {}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{ErrorCode, PhomuError};

    #[test]
    fn every_code_has_a_distinct_number() {
        let mut numbers: Vec<u16> = ErrorCode::ALL.iter().map(|c| c.code()).collect();
        let count = numbers.len();
        numbers.sort_unstable();
        numbers.dedup();
        assert_eq!(numbers.len(), count, "two error codes share a number");
    }

    #[test]
    fn every_code_is_listed_in_all() {
        for code in ErrorCode::ALL {
            assert!(code.message_key().starts_with("errors."));
        }
    }

    #[test]
    fn every_code_has_a_unique_message_key() {
        let mut keys: Vec<&str> = ErrorCode::ALL.iter().map(|c| c.message_key()).collect();
        let count = keys.len();
        keys.sort_unstable();
        keys.dedup();
        assert_eq!(keys.len(), count, "two error codes share a message key");
    }

    #[test]
    fn context_is_replaced_instead_of_duplicated() {
        let error = PhomuError::new(ErrorCode::UnknownPlayer)
            .with_context("playerId", "a")
            .with_context("playerId", "b");
        assert_eq!(error.context().len(), 1);
        assert_eq!(error.context_value("playerId"), Some("b"));
        assert_eq!(error.context_value("round"), None);
    }

    #[test]
    fn display_contains_code_key_and_context() {
        let error = PhomuError::new(ErrorCode::AnswersNotLocked).with_context("round", "3");
        let text = error.to_string();
        assert!(text.contains("errors.answersNotLocked"));
        assert!(text.contains("1102"));
        assert!(text.contains("round=3"));
    }
}
