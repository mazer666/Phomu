//! The persistable fields of a session.
//!
//! WHAT: the fields the base allows a shell to write to the disk
//! ([`FieldId`], [`PERSISTABLE_FIELDS`]).
//!
//! WHY: the anti-spoiler guarantee includes the disk: a shell must not be
//! able to write the song of the running round into its storage, because
//! the record of a song contains the solution (C-4,
//! docs/design/PLATFORM-ARCHITECTURE.md § 10.2). The base therefore
//! defines the set — a shell may only persist these fields.
//!
//! The set is the one of the reference implementation
//! (`src/stores/game-store.ts:621-637`), without the fields that belong to
//! the shell: the audio settings and the player preferences are settings
//! of the shell, not of the game.

/// A field of the session state.
///
/// WHY: the set of the fields is closed, so that a shell cannot write a
/// field the base does not know — and above all not the song of the
/// running round.
///
/// EXAMPLE: `FieldId::TimelineYears` is the field the shell writes after
/// every round.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum FieldId {
    /// The players of the session.
    Players,
    /// The teams of the session.
    Teams,
    /// The configuration of the session.
    Config,
    /// The identifier of the session.
    SessionId,
    /// The experience points of the session.
    TotalXp,
    /// The number of the round that is played.
    CurrentRound,
    /// Whether the game has ended.
    IsGameOver,
    /// The years of the shared timeline.
    TimelineYears,
    /// The moment the game started.
    GameStartTime,
    /// The state of the random generator.
    RngState,
}

impl FieldId {
    /// The identifier of the field, as it appears in the persisted state.
    ///
    /// WHY: the identifier is the key of the field in the persisted state;
    /// it has to match the key of the reference implementation
    /// (`src/stores/game-store.ts:621-637`).
    ///
    /// EXAMPLE: `FieldId::Players.as_str()` is `"players"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            FieldId::Players => "players",
            FieldId::Teams => "teams",
            FieldId::Config => "config",
            FieldId::SessionId => "sessionId",
            FieldId::TotalXp => "totalXp",
            FieldId::CurrentRound => "currentRound",
            FieldId::IsGameOver => "isGameOver",
            FieldId::TimelineYears => "timelineYears",
            FieldId::GameStartTime => "gameStartTime",
            FieldId::RngState => "rngState",
        }
    }
}

/// Every field a shell may persist.
pub const PERSISTABLE_FIELDS: &[FieldId] = &[
    FieldId::Players,
    FieldId::Teams,
    FieldId::Config,
    FieldId::SessionId,
    FieldId::TotalXp,
    FieldId::CurrentRound,
    FieldId::IsGameOver,
    FieldId::TimelineYears,
    FieldId::GameStartTime,
    FieldId::RngState,
];

/// Whether a field may be persisted.
///
/// WHY: the set of the persistable fields is the guarantee that the
/// solution of the running round never reaches the disk
/// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-4).
///
/// EXAMPLE: `is_persistable(FieldId::Players)` is `true`.
pub fn is_persistable(field: FieldId) -> bool {
    PERSISTABLE_FIELDS.contains(&field)
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{PERSISTABLE_FIELDS, is_persistable};

    #[test]
    fn the_persistable_set_matches_the_reference_implementation() {
        let names: Vec<&str> = PERSISTABLE_FIELDS.iter().map(|f| f.as_str()).collect();
        assert!(names.contains(&"players"));
        assert!(names.contains(&"teams"));
        assert!(names.contains(&"config"));
        assert!(names.contains(&"timelineYears"));
        assert!(names.contains(&"gameStartTime"));
    }

    #[test]
    fn the_song_is_not_persistable() {
        // The song has no field identifier: it cannot be persisted at all.
        assert!(
            !PERSISTABLE_FIELDS
                .iter()
                .any(|field| field.as_str().contains("song"))
        );
    }

    #[test]
    fn the_ephemeral_fields_are_not_persistable() {
        for name in [
            "currentSong",
            "currentAnswers",
            "roundPhase",
            "currentMode",
            "playedSongIds",
            "roundHistory",
            "turnOrder",
            "currentTurnIndex",
            "winnerId",
        ] {
            assert!(
                !PERSISTABLE_FIELDS
                    .iter()
                    .any(|field| field.as_str() == name),
                "{name} must not be persistable"
            );
        }
    }

    #[test]
    fn every_persistable_field_is_reported_as_persistable() {
        for field in PERSISTABLE_FIELDS {
            assert!(is_persistable(*field));
        }
    }
}
