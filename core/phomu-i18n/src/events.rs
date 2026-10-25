//! The mapping of a game event onto a message key.
//!
//! WHAT: [`GameEvent`] — the things that happen in a game and can be
//! reported to the players — and [`message_key`], the function that turns
//! an event into a key.
//!
//! WHY: the base names an event, the shell renders it. Without this
//! mapping every shell would have to know which event leads to which text,
//! and the six shells would drift apart.

use crate::keys::MessageKey;

/// Something that happened in a game and that the players may be told about.
///
/// WHY: the base names the event and the shell renders it; the set is
/// closed, so that no shell has to invent an event of its own.
///
/// EXAMPLE: `GameEvent::AnswerCorrect` is the event of a correct answer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum GameEvent {
    /// A card is drawn.
    PhaseDrawing,
    /// The question stands.
    PhaseQuestion,
    /// The answers of the round are locked in.
    PhaseLockedIn,
    /// The solution is revealed.
    PhaseReveal,
    /// The game has ended.
    PhaseScoring,
    /// A player answered correctly.
    AnswerCorrect,
    /// A player answered incorrectly.
    AnswerIncorrect,
    /// The last round of the rotation was announced.
    LastRound,
    /// The round was discarded.
    RoundDiscarded,
    /// The decade hint was used.
    CheatDecadeHint,
    /// The joker was used.
    CheatJoker,
    /// The music cheat was used.
    CheatMusic,
    /// The artist was revealed by the Survivor cheat.
    CheatArtist,
    /// The provider is unavailable.
    MediaUnavailable,
    /// The provider blocked the playback.
    MediaBlocked,
    /// The playback failed.
    MediaFailed,
    /// The playback did not start in time.
    MediaTimedOut,
    /// The song is skipped automatically.
    MediaAutoSkip,
    /// No provider can play the song.
    MediaNoVideo,
    /// The game ended with a winner.
    GameWon,
    /// The game ended without a winner.
    GameDrawn,
    /// The teams were shuffled for the next round.
    TeamsShifted,
}

impl GameEvent {
    /// Every event, in a stable order.
    ///
    /// EXAMPLE: `GameEvent::ALL` has 22 entries.
    pub const ALL: &'static [GameEvent] = &[
        GameEvent::PhaseDrawing,
        GameEvent::PhaseQuestion,
        GameEvent::PhaseLockedIn,
        GameEvent::PhaseReveal,
        GameEvent::PhaseScoring,
        GameEvent::AnswerCorrect,
        GameEvent::AnswerIncorrect,
        GameEvent::LastRound,
        GameEvent::RoundDiscarded,
        GameEvent::CheatDecadeHint,
        GameEvent::CheatJoker,
        GameEvent::CheatMusic,
        GameEvent::CheatArtist,
        GameEvent::MediaUnavailable,
        GameEvent::MediaBlocked,
        GameEvent::MediaFailed,
        GameEvent::MediaTimedOut,
        GameEvent::MediaAutoSkip,
        GameEvent::MediaNoVideo,
        GameEvent::GameWon,
        GameEvent::GameDrawn,
        GameEvent::TeamsShifted,
    ];
}

/// The message key that belongs to an event.
///
/// WHY: the base names the event, the shell renders it; without this
/// mapping every shell would have to know which event leads to which text
/// and the six shells would drift apart.
///
/// EXAMPLE: `message_key(GameEvent::AnswerCorrect)` is
/// `MessageKey::GameFeedbackCorrect`.
pub const fn message_key(event: GameEvent) -> MessageKey {
    match event {
        GameEvent::PhaseDrawing => MessageKey::GamePhaseDrawing,
        GameEvent::PhaseQuestion => MessageKey::GamePhaseQuestion,
        GameEvent::PhaseLockedIn => MessageKey::GamePhaseLockedIn,
        GameEvent::PhaseReveal => MessageKey::GamePhaseReveal,
        GameEvent::PhaseScoring => MessageKey::GamePhaseScoring,
        GameEvent::AnswerCorrect => MessageKey::GameFeedbackCorrect,
        GameEvent::AnswerIncorrect => MessageKey::GameFeedbackIncorrect,
        GameEvent::LastRound => MessageKey::GameRoundLastRound,
        GameEvent::RoundDiscarded => MessageKey::GameRoundDiscarded,
        GameEvent::CheatDecadeHint => MessageKey::GameCheatDecadeHint,
        GameEvent::CheatJoker => MessageKey::GameCheatJoker,
        GameEvent::CheatMusic => MessageKey::GameCheatMusic,
        GameEvent::CheatArtist => MessageKey::GameCheatArtist,
        GameEvent::MediaUnavailable => MessageKey::GameMediaUnavailable,
        GameEvent::MediaBlocked => MessageKey::GameMediaBlocked,
        GameEvent::MediaFailed => MessageKey::GameMediaFailed,
        GameEvent::MediaTimedOut => MessageKey::GameMediaTimedOut,
        GameEvent::MediaAutoSkip => MessageKey::GameMediaAutoSkip,
        GameEvent::MediaNoVideo => MessageKey::GameMediaNoVideo,
        GameEvent::GameWon => MessageKey::GameOverWinner,
        GameEvent::GameDrawn => MessageKey::GameOverDraw,
        GameEvent::TeamsShifted => MessageKey::GameTeamShifted,
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{GameEvent, message_key};
    use crate::keys::MessageKey;

    #[test]
    fn every_event_has_a_key() {
        for event in GameEvent::ALL {
            assert!(MessageKey::ALL.contains(&message_key(*event)));
        }
    }

    #[test]
    fn the_phase_events_map_onto_the_phase_keys() {
        assert_eq!(
            message_key(GameEvent::PhaseQuestion),
            MessageKey::GamePhaseQuestion
        );
        assert_eq!(
            message_key(GameEvent::PhaseLockedIn),
            MessageKey::GamePhaseLockedIn
        );
    }

    #[test]
    fn the_media_events_are_distinct() {
        let keys: Vec<MessageKey> = [
            GameEvent::MediaUnavailable,
            GameEvent::MediaBlocked,
            GameEvent::MediaFailed,
            GameEvent::MediaTimedOut,
        ]
        .iter()
        .map(|event| message_key(*event))
        .collect();
        let mut sorted = keys.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), keys.len());
    }
}
