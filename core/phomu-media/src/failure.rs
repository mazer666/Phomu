//! The failure classification and the auto-skip policy.
//!
//! WHAT: the four ways a playback can fail ([`ProviderFailure`]) and what
//! the base decides when the chain of the providers is exhausted
//! ([`AutoSkipDecision`]).
//!
//! WHY: the shell has to know *what* happened — a blocked video and a
//! broken link are different situations for the players — and the base has
//! to know what happens *next*: the song is skipped, the round goes back to
//! the drawing phase and a countdown gives the pilot the chance to act
//! (`src/components/game/MusicPlayer.tsx:239-252`).

/// The reason why a playback failed.
///
/// WHY: a blocked video and a broken link are different situations for the
/// players; the shell has to know which one occurred.
///
/// EXAMPLE: `ProviderFailure::Blocked` is the failure of a song that the
/// provider refuses in this region.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ProviderFailure {
    /// The provider does not offer this song.
    Unavailable,
    /// The provider refused the playback — the song is blocked or
    /// restricted in this region.
    Blocked,
    /// The playback failed for a technical reason.
    Failed,
    /// The playback did not start within the permitted time.
    TimedOut,
}

impl ProviderFailure {
    /// Every failure, in a stable order.
    ///
    /// EXAMPLE: `ProviderFailure::ALL` has four entries.
    pub const ALL: &'static [ProviderFailure] = &[
        ProviderFailure::Unavailable,
        ProviderFailure::Blocked,
        ProviderFailure::Failed,
        ProviderFailure::TimedOut,
    ];

    /// The identifier of the failure.
    ///
    /// WHY: the identifier is the key of the message of the shell, which
    /// tells the players what happened.
    ///
    /// EXAMPLE: `ProviderFailure::Blocked.as_str()` is `"blocked"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            ProviderFailure::Unavailable => "unavailable",
            ProviderFailure::Blocked => "blocked",
            ProviderFailure::Failed => "failed",
            ProviderFailure::TimedOut => "timedOut",
        }
    }

    /// Whether the failure means "try the next provider" or "the song
    /// cannot be played".
    ///
    /// WHY: the reference implementation treats every error of the YouTube
    /// player the same — it walks the fallback chain and, when the chain is
    /// exhausted, it starts the auto-skip countdown
    /// (`src/components/game/MusicPlayer.tsx:254-272`). A timeout is
    /// therefore a fallback, not an immediate skip.
    pub const fn continues_with_the_next_provider(self) -> bool {
        matches!(
            self,
            ProviderFailure::Unavailable
                | ProviderFailure::Blocked
                | ProviderFailure::Failed
                | ProviderFailure::TimedOut
        )
    }
}

/// What the base decides when no provider can play the song.
///
/// WHY: the policy belongs to the base, so that every shell skips a broken
/// song the same way (docs/design/PLATFORM-ARCHITECTURE.md § 8.5).
///
/// EXAMPLE: `AutoSkipDecision::SkipNow` is the decision for a countdown of
/// zero seconds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AutoSkipDecision {
    /// The countdown runs; the song is skipped when it reaches zero.
    Countdown {
        /// The number of seconds the countdown lasts.
        seconds: u32,
    },
    /// The song is skipped immediately.
    SkipNow,
}

impl AutoSkipDecision {
    /// The decision for a countdown of a given length.
    ///
    /// WHY: the countdown gives the pilot the chance to act — to skip the
    /// song by hand or to report the missing link; a countdown of zero
    /// leaves no time, therefore the song is skipped at once.
    ///
    /// EXAMPLE: `AutoSkipDecision::for_countdown(0)` is
    /// `AutoSkipDecision::SkipNow`.
    pub const fn for_countdown(seconds: u32) -> Self {
        if seconds == 0 {
            AutoSkipDecision::SkipNow
        } else {
            AutoSkipDecision::Countdown { seconds }
        }
    }

    /// The number of seconds the countdown lasts. `None` means "immediately".
    ///
    /// WHY: the shell runs the countdown; it needs the length and nothing
    /// else.
    ///
    /// EXAMPLE: `AutoSkipDecision::SkipNow.seconds()` is `None`.
    pub const fn seconds(self) -> Option<u32> {
        match self {
            AutoSkipDecision::Countdown { seconds } => Some(seconds),
            AutoSkipDecision::SkipNow => None,
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{AutoSkipDecision, ProviderFailure};

    #[test]
    fn the_four_failures_are_declared() {
        assert_eq!(ProviderFailure::ALL.len(), 4);
    }

    #[test]
    fn every_failure_continues_with_the_next_provider() {
        for failure in ProviderFailure::ALL {
            assert!(failure.continues_with_the_next_provider());
        }
    }

    #[test]
    fn a_countdown_of_zero_skips_immediately() {
        assert_eq!(
            AutoSkipDecision::for_countdown(0),
            AutoSkipDecision::SkipNow
        );
        assert_eq!(AutoSkipDecision::for_countdown(0).seconds(), None);
    }

    #[test]
    fn a_countdown_keeps_its_length() {
        assert_eq!(AutoSkipDecision::for_countdown(10).seconds(), Some(10));
    }

    #[test]
    fn the_failure_identifiers_are_stable() {
        assert_eq!(ProviderFailure::TimedOut.as_str(), "timedOut");
        assert_eq!(ProviderFailure::Unavailable.as_str(), "unavailable");
    }
}
