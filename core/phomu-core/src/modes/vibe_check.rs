//! The Vibe-Check mode.
//!
//! WHAT: the list of the known moods ([`ALL_MOODS`]), the construction of
//! the options ([`build_options`]) and the award for a picked mood
//! ([`award`]).
//!
//! WHY: the mode asks for the mood of a song whose artist and title are
//! visible — the identity is part of the question. Six options are shown so
//! that the shortened list does not give a hint; the cheat halves the list
//! and lowers the win to one point (GAME-030, GAME-031).

use phomu_config::{
    VIBE_CHECK_OPTION_COUNT, VIBE_CHECK_OPTION_COUNT_CHEATED, VIBE_CHECK_POINTS,
    VIBE_CHECK_POINTS_CHEATED,
};

use super::ModeOutcome;

/// Every mood a catalogue entry may carry.
///
/// WHY: the moods are catalogue values; the list has to match the values of
/// `song.mood` (`src/components/game/modes/VibeCheckMode.tsx:41-56`).
pub const ALL_MOODS: [&str; 12] = [
    "Dance Floor",
    "Nostalgic",
    "Party Anthem",
    "Heartbreak",
    "Epic",
    "Chill",
    "Rebellious",
    "Euphoric",
    "Melancholic",
    "Feel Good",
    "Dark",
    "Romantic",
];

/// The award for a picked mood.
///
/// WHY: a correct answer is worth two points, one point after the cheat and
/// nothing when the mood is wrong (GAME-030, GAME-031).
///
/// EXAMPLE: the mood "Chill" on a song whose moods contain "Chill" is worth
/// two points.
pub fn award(song_moods: &[String], mood: &str, cheat_used: bool) -> ModeOutcome {
    if !song_moods.iter().any(|candidate| candidate == mood) {
        return ModeOutcome::incorrect();
    }
    let points = if cheat_used {
        VIBE_CHECK_POINTS_CHEATED
    } else {
        VIBE_CHECK_POINTS
    };
    ModeOutcome::correct(points)
}

/// The options of the mode.
///
/// WHY: without the cheat six options are shown — five wrong ones and the
/// first mood of the song. With the cheat the list is halved to three
/// options, and the win is worth one point instead of two.
///
/// EXAMPLE: the options contain the first mood of the song.
pub fn build_options(song_moods: &[String], cheat_used: bool, draw: u64) -> Vec<String> {
    let correct = song_moods.first().cloned().unwrap_or_default();
    let wrong: Vec<String> = ALL_MOODS
        .iter()
        .filter(|mood| !song_moods.iter().any(|candidate| candidate == *mood))
        .map(|mood| (*mood).to_string())
        .collect();

    let wrong_count = if cheat_used {
        VIBE_CHECK_OPTION_COUNT_CHEATED - 1
    } else {
        VIBE_CHECK_OPTION_COUNT - 1
    };
    let shuffled = super::deterministic_shuffle(&wrong, draw);
    let mut options: Vec<String> = shuffled.into_iter().take(wrong_count).collect();
    options.push(correct);
    super::deterministic_shuffle(&options, draw ^ 0x5eed)
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{ALL_MOODS, award, build_options};

    fn moods() -> Vec<String> {
        vec!["Chill".to_string(), "Epic".to_string()]
    }

    #[test]
    fn the_known_moods_are_twelve() {
        assert_eq!(ALL_MOODS.len(), 12);
    }

    #[test]
    fn a_correct_mood_is_worth_two_points() {
        let outcome = award(&moods(), "Chill", false);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 2);
    }

    #[test]
    fn the_cheat_lowers_the_win_to_one_point() {
        let outcome = award(&moods(), "Chill", true);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 1);
    }

    #[test]
    fn a_wrong_mood_is_worth_nothing() {
        let outcome = award(&moods(), "Dark", false);
        assert!(!outcome.is_correct);
        assert_eq!(outcome.points, 0);
    }

    #[test]
    fn the_options_contain_the_first_mood_of_the_song() {
        let options = build_options(&moods(), false, 5);
        assert_eq!(options.len(), 6);
        assert!(options.contains(&"Chill".to_string()));
    }

    #[test]
    fn the_cheat_halves_the_options() {
        let options = build_options(&moods(), true, 5);
        assert_eq!(options.len(), 3);
        assert!(options.contains(&"Chill".to_string()));
    }
}
