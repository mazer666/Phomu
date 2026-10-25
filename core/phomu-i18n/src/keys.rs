//! The closed enumeration of the message keys.
//!
//! WHAT: [`MessageKey`] — one variant per key the base can emit.
//!
//! WHY: the enumeration is the mechanism that makes the key space closed
//! (docs/design/BUILD-CONTRACT.md § 6.1, rule L-1). A key that is not a
//! variant cannot be produced, therefore a shell never has to defend itself
//! against an unknown key.

use crate::Language;

/// A message key the base can emit.
///
/// WHY: the string form is the contract with the locale files of the
/// shells: a dot-separated, camelCase identifier without a placeholder. The
/// enumeration is what makes the key space closed.
///
/// EXAMPLE: `MessageKey::GameFeedbackCorrect` is the key of the text that
/// tells the players that the answer was correct.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum MessageKey {
    // ── The error keys ───────────────────────────────────────────────
    // The keys of the error taxonomy. They are listed here as well so that
    // a shell can resolve an error without a second lookup table; the
    // correspondence to `phomu_errors::ErrorCode` is checked by a test in
    // `phomu-core`.
    /// The configuration is inconsistent.
    ErrorsInvalidConfiguration,
    /// The number of players is invalid.
    ErrorsInvalidPlayerCount,
    /// The number of teams is invalid.
    ErrorsInvalidTeamCount,
    /// The player does not exist.
    ErrorsUnknownPlayer,
    /// The team does not exist.
    ErrorsUnknownTeam,
    /// The mode does not exist.
    ErrorsUnknownMode,
    /// The answer is invalid.
    ErrorsInvalidAnswer,
    /// The difficulty is invalid.
    ErrorsInvalidDifficulty,
    /// The selection is empty.
    ErrorsEmptySelection,
    /// The random draw is invalid.
    ErrorsInvalidDraw,
    /// The operation is not available in this phase.
    ErrorsNotAvailableInPhase,
    /// The answers are not locked in.
    ErrorsAnswersNotLocked,
    /// No song has been drawn.
    ErrorsNoSongDrawn,
    /// The game has already ended.
    ErrorsGameAlreadyOver,
    /// There is no active player.
    ErrorsNoActivePlayer,
    /// The player has already answered.
    ErrorsDuplicateAnswer,
    /// The phase transition is invalid.
    ErrorsInvalidTransition,
    /// The round is not complete.
    ErrorsRoundNotComplete,
    /// The mode is not enabled.
    ErrorsModeNotEnabled,
    /// The catalogue is empty.
    ErrorsCatalogueEmpty,
    /// The song does not exist.
    ErrorsSongNotFound,
    /// The song data is invalid.
    ErrorsInvalidSongData,
    /// The pack does not exist.
    ErrorsPackNotFound,
    /// Two songs share an identifier.
    ErrorsDuplicateSongId,
    /// The media provider is unavailable.
    ErrorsMediaUnavailable,
    /// The media provider refused the playback.
    ErrorsMediaBlocked,
    /// The playback failed.
    ErrorsMediaFailed,
    /// The playback did not start in time.
    ErrorsMediaTimedOut,
    /// Every provider has been tried.
    ErrorsMediaProvidersExhausted,
    /// An internal invariant was violated.
    ErrorsInternal,

    // ── The phases ──────────────────────────────────────────────────
    /// The round is drawing a card.
    GamePhaseDrawing,
    /// The question stands.
    GamePhaseQuestion,
    /// The answers are locked in.
    GamePhaseLockedIn,
    /// The solution is revealed.
    GamePhaseReveal,
    /// The game is over.
    GamePhaseScoring,

    // ── The feedback ────────────────────────────────────────────────
    /// The answer was correct.
    GameFeedbackCorrect,
    /// The answer was wrong.
    GameFeedbackIncorrect,
    /// The last round of the rotation is announced.
    GameRoundLastRound,
    /// The round was discarded and a new question is drawn.
    GameRoundDiscarded,

    // ── The modes ───────────────────────────────────────────────────
    /// The Timeline mode.
    GameModeTimeline,
    /// The Hint-Master mode.
    GameModeHintMaster,
    /// The Lyrics Labyrinth mode.
    GameModeLyrics,
    /// The Vibe-Check mode.
    GameModeVibeCheck,
    /// The Survivor mode.
    GameModeSurvivor,
    /// The Cover Confusion mode.
    GameModeCoverConfusion,

    // ── The cheats ──────────────────────────────────────────────────
    /// The decade hint was used.
    GameCheatDecadeHint,
    /// The joker was used.
    GameCheatJoker,
    /// The music cheat was used.
    GameCheatMusic,
    /// The artist was revealed.
    GameCheatArtist,

    // ── The media ───────────────────────────────────────────────────
    /// The provider is unavailable for this song.
    GameMediaUnavailable,
    /// The provider blocked the playback.
    GameMediaBlocked,
    /// The playback failed.
    GameMediaFailed,
    /// The playback did not start in time.
    GameMediaTimedOut,
    /// The song is skipped automatically.
    GameMediaAutoSkip,
    /// No provider can play this song.
    GameMediaNoVideo,

    // ── The game end ────────────────────────────────────────────────
    /// The winner of the game.
    GameOverWinner,
    /// The game ended without a winner.
    GameOverDraw,
    /// The teams were shuffled for the next round.
    GameTeamShifted,
}

impl MessageKey {
    /// Every key of the space, in a stable order.
    ///
    /// EXAMPLE: `MessageKey::ALL` has 58 entries.
    pub const ALL: &'static [MessageKey] = &[
        MessageKey::ErrorsInvalidConfiguration,
        MessageKey::ErrorsInvalidPlayerCount,
        MessageKey::ErrorsInvalidTeamCount,
        MessageKey::ErrorsUnknownPlayer,
        MessageKey::ErrorsUnknownTeam,
        MessageKey::ErrorsUnknownMode,
        MessageKey::ErrorsInvalidAnswer,
        MessageKey::ErrorsInvalidDifficulty,
        MessageKey::ErrorsEmptySelection,
        MessageKey::ErrorsInvalidDraw,
        MessageKey::ErrorsNotAvailableInPhase,
        MessageKey::ErrorsAnswersNotLocked,
        MessageKey::ErrorsNoSongDrawn,
        MessageKey::ErrorsGameAlreadyOver,
        MessageKey::ErrorsNoActivePlayer,
        MessageKey::ErrorsDuplicateAnswer,
        MessageKey::ErrorsInvalidTransition,
        MessageKey::ErrorsRoundNotComplete,
        MessageKey::ErrorsModeNotEnabled,
        MessageKey::ErrorsCatalogueEmpty,
        MessageKey::ErrorsSongNotFound,
        MessageKey::ErrorsInvalidSongData,
        MessageKey::ErrorsPackNotFound,
        MessageKey::ErrorsDuplicateSongId,
        MessageKey::ErrorsMediaUnavailable,
        MessageKey::ErrorsMediaBlocked,
        MessageKey::ErrorsMediaFailed,
        MessageKey::ErrorsMediaTimedOut,
        MessageKey::ErrorsMediaProvidersExhausted,
        MessageKey::ErrorsInternal,
        MessageKey::GamePhaseDrawing,
        MessageKey::GamePhaseQuestion,
        MessageKey::GamePhaseLockedIn,
        MessageKey::GamePhaseReveal,
        MessageKey::GamePhaseScoring,
        MessageKey::GameFeedbackCorrect,
        MessageKey::GameFeedbackIncorrect,
        MessageKey::GameRoundLastRound,
        MessageKey::GameRoundDiscarded,
        MessageKey::GameModeTimeline,
        MessageKey::GameModeHintMaster,
        MessageKey::GameModeLyrics,
        MessageKey::GameModeVibeCheck,
        MessageKey::GameModeSurvivor,
        MessageKey::GameModeCoverConfusion,
        MessageKey::GameCheatDecadeHint,
        MessageKey::GameCheatJoker,
        MessageKey::GameCheatMusic,
        MessageKey::GameCheatArtist,
        MessageKey::GameMediaUnavailable,
        MessageKey::GameMediaBlocked,
        MessageKey::GameMediaFailed,
        MessageKey::GameMediaTimedOut,
        MessageKey::GameMediaAutoSkip,
        MessageKey::GameMediaNoVideo,
        MessageKey::GameOverWinner,
        MessageKey::GameOverDraw,
        MessageKey::GameTeamShifted,
    ];

    /// The key as the string the locale files use.
    ///
    /// WHY: the string is what the locale files of the shells use as the
    /// key; it has to stay stable, because a shell that looks for an old
    /// key would otherwise find no text.
    ///
    /// EXAMPLE: `MessageKey::GameFeedbackCorrect.as_str()` is
    /// `"game.feedback.correct"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            MessageKey::ErrorsInvalidConfiguration => "errors.invalidConfiguration",
            MessageKey::ErrorsInvalidPlayerCount => "errors.invalidPlayerCount",
            MessageKey::ErrorsInvalidTeamCount => "errors.invalidTeamCount",
            MessageKey::ErrorsUnknownPlayer => "errors.unknownPlayer",
            MessageKey::ErrorsUnknownTeam => "errors.unknownTeam",
            MessageKey::ErrorsUnknownMode => "errors.unknownMode",
            MessageKey::ErrorsInvalidAnswer => "errors.invalidAnswer",
            MessageKey::ErrorsInvalidDifficulty => "errors.invalidDifficulty",
            MessageKey::ErrorsEmptySelection => "errors.emptySelection",
            MessageKey::ErrorsInvalidDraw => "errors.invalidDraw",
            MessageKey::ErrorsNotAvailableInPhase => "errors.notAvailableInPhase",
            MessageKey::ErrorsAnswersNotLocked => "errors.answersNotLocked",
            MessageKey::ErrorsNoSongDrawn => "errors.noSongDrawn",
            MessageKey::ErrorsGameAlreadyOver => "errors.gameAlreadyOver",
            MessageKey::ErrorsNoActivePlayer => "errors.noActivePlayer",
            MessageKey::ErrorsDuplicateAnswer => "errors.duplicateAnswer",
            MessageKey::ErrorsInvalidTransition => "errors.invalidTransition",
            MessageKey::ErrorsRoundNotComplete => "errors.roundNotComplete",
            MessageKey::ErrorsModeNotEnabled => "errors.modeNotEnabled",
            MessageKey::ErrorsCatalogueEmpty => "errors.catalogueEmpty",
            MessageKey::ErrorsSongNotFound => "errors.songNotFound",
            MessageKey::ErrorsInvalidSongData => "errors.invalidSongData",
            MessageKey::ErrorsPackNotFound => "errors.packNotFound",
            MessageKey::ErrorsDuplicateSongId => "errors.duplicateSongId",
            MessageKey::ErrorsMediaUnavailable => "errors.mediaUnavailable",
            MessageKey::ErrorsMediaBlocked => "errors.mediaBlocked",
            MessageKey::ErrorsMediaFailed => "errors.mediaFailed",
            MessageKey::ErrorsMediaTimedOut => "errors.mediaTimedOut",
            MessageKey::ErrorsMediaProvidersExhausted => "errors.mediaProvidersExhausted",
            MessageKey::ErrorsInternal => "errors.internal",
            MessageKey::GamePhaseDrawing => "game.phase.drawing",
            MessageKey::GamePhaseQuestion => "game.phase.question",
            MessageKey::GamePhaseLockedIn => "game.phase.lockedIn",
            MessageKey::GamePhaseReveal => "game.phase.reveal",
            MessageKey::GamePhaseScoring => "game.phase.scoring",
            MessageKey::GameFeedbackCorrect => "game.feedback.correct",
            MessageKey::GameFeedbackIncorrect => "game.feedback.incorrect",
            MessageKey::GameRoundLastRound => "game.round.lastRound",
            MessageKey::GameRoundDiscarded => "game.round.discarded",
            MessageKey::GameModeTimeline => "game.mode.timeline",
            MessageKey::GameModeHintMaster => "game.mode.hintMaster",
            MessageKey::GameModeLyrics => "game.mode.lyrics",
            MessageKey::GameModeVibeCheck => "game.mode.vibeCheck",
            MessageKey::GameModeSurvivor => "game.mode.survivor",
            MessageKey::GameModeCoverConfusion => "game.mode.coverConfusion",
            MessageKey::GameCheatDecadeHint => "game.cheat.decadeHint",
            MessageKey::GameCheatJoker => "game.cheat.joker",
            MessageKey::GameCheatMusic => "game.cheat.music",
            MessageKey::GameCheatArtist => "game.cheat.artist",
            MessageKey::GameMediaUnavailable => "game.media.unavailable",
            MessageKey::GameMediaBlocked => "game.media.blocked",
            MessageKey::GameMediaFailed => "game.media.failed",
            MessageKey::GameMediaTimedOut => "game.media.timedOut",
            MessageKey::GameMediaAutoSkip => "game.media.autoSkip",
            MessageKey::GameMediaNoVideo => "game.media.noVideo",
            MessageKey::GameOverWinner => "game.over.winner",
            MessageKey::GameOverDraw => "game.over.draw",
            MessageKey::GameTeamShifted => "game.team.shifted",
        }
    }

    /// The key of a string, if the string names a key of the space.
    ///
    /// WHY: a bridge receives a key as a string and has to map it back onto
    /// the closed space before it can use it.
    ///
    /// EXAMPLE: `MessageKey::from_key("game.over.winner")` is
    /// `Some(MessageKey::GameOverWinner)`.
    pub fn from_key(key: &str) -> Option<Self> {
        MessageKey::ALL
            .iter()
            .copied()
            .find(|candidate| candidate.as_str() == key)
    }

    /// The languages the key space has to be translated into.
    ///
    /// WHY: the base knows which locales the shells provide; the texts
    /// themselves live in the locale files of the shells.
    ///
    /// EXAMPLE: `MessageKey::languages()` is `[Language::De, Language::En]`.
    pub const fn languages() -> &'static [Language] {
        Language::ALL
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::MessageKey;

    #[test]
    fn every_key_string_is_unique() {
        let mut keys: Vec<&str> = MessageKey::ALL.iter().map(|k| k.as_str()).collect();
        let count = keys.len();
        keys.sort_unstable();
        keys.dedup();
        assert_eq!(keys.len(), count, "two keys share a string");
    }

    #[test]
    fn every_variant_is_listed_in_all() {
        for key in MessageKey::ALL {
            assert!(MessageKey::from_key(key.as_str()).is_some());
        }
    }

    #[test]
    fn the_error_keys_use_the_error_namespace() {
        let error_keys: Vec<&MessageKey> = MessageKey::ALL
            .iter()
            .filter(|key| key.as_str().starts_with("errors."))
            .collect();
        assert_eq!(
            error_keys.len(),
            30,
            "the taxonomy of phomu-errors has 30 codes"
        );
        for key in error_keys {
            assert!(
                key.as_str()[7..].starts_with(char::is_lowercase),
                "{key:?} does not start with a lower-case letter"
            );
        }
    }
}
