//! The Lyrics Labyrinth mode.
//!
//! WHAT: the construction of the options ([`build_options`]), the award for
//! a picked line ([`award`]) and the award of the bonus round
//! ([`bonus_award`]).
//!
//! WHY: the mode mixes three real lyric lines with one invented line and
//! asks for the invented one. A song without lyric data would make the mode
//! unplayable, therefore the bonus round exists (GAME-029).

use phomu_catalog::Lyrics;
use phomu_config::{LYRICS_BONUS_POINTS, LYRICS_POINTS};

use super::ModeOutcome;

/// One option of the Lyrics Labyrinth.
///
/// WHY: the option has to say whether it is the invented line, because the
/// answer of the player is exactly that decision (GAME-027).
///
/// EXAMPLE: the option with `is_fake: true` is the invented line the
/// player has to find.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LyricOption {
    /// The text of the line.
    pub text: String,
    /// Whether the line is the invented one.
    pub is_fake: bool,
}

/// Builds the four options of the mode.
///
/// WHY: three real lines and one invented line are mixed; the order is
/// random per song but stable during the round (GAME-027,
/// `src/components/game/modes/LyricsMode.tsx:68-83`). The base draws the
/// order from the seeded generator of the session.
///
/// EXAMPLE: the options contain exactly one invented line.
pub fn build_options(lyrics: &Lyrics, draw: u64) -> Vec<LyricOption> {
    let mut options: Vec<LyricOption> = lyrics
        .real
        .iter()
        .take(3)
        .map(|line| LyricOption {
            text: line.clone(),
            is_fake: false,
        })
        .collect();
    if let Some(fake) = lyrics.fake.first() {
        options.push(LyricOption {
            text: fake.clone(),
            is_fake: true,
        });
    }
    super::deterministic_shuffle(&options, draw)
}

/// The award for a picked line.
///
/// WHY: the player has to find the invented line; a real line is worth
/// nothing (GAME-027, GAME-028).
///
/// EXAMPLE: picking the invented line is worth four points.
pub fn award(picked_fake: bool) -> ModeOutcome {
    if picked_fake {
        ModeOutcome::correct(LYRICS_POINTS)
    } else {
        ModeOutcome::incorrect()
    }
}

/// The award of the bonus round for a song without lyric data.
///
/// WHY: a song without lyric data would make the mode unplayable; the
/// bonus round replaces it (GAME-029).
///
/// EXAMPLE: a claimed song is worth two points.
pub fn bonus_award(claimed: bool) -> ModeOutcome {
    if claimed {
        ModeOutcome::correct(LYRICS_BONUS_POINTS)
    } else {
        ModeOutcome::incorrect()
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{award, bonus_award, build_options};
    use phomu_catalog::Lyrics;

    fn lyrics() -> Lyrics {
        Lyrics {
            real: vec!["eins".to_string(), "zwei".to_string(), "drei".to_string()],
            fake: vec!["gefake".to_string()],
        }
    }

    #[test]
    fn the_options_contain_three_real_and_one_fake_line() {
        let options = build_options(&lyrics(), 3);
        assert_eq!(options.len(), 4);
        assert_eq!(options.iter().filter(|option| option.is_fake).count(), 1);
        assert_eq!(options.iter().filter(|option| !option.is_fake).count(), 3);
    }

    #[test]
    fn the_order_is_stable_for_the_same_draw() {
        assert_eq!(build_options(&lyrics(), 9), build_options(&lyrics(), 9));
    }

    #[test]
    fn the_fake_line_is_worth_four_points() {
        let outcome = award(true);
        assert!(outcome.is_correct);
        assert_eq!(outcome.points, 4);
    }

    #[test]
    fn a_real_line_is_worth_nothing() {
        let outcome = award(false);
        assert!(!outcome.is_correct);
        assert_eq!(outcome.points, 0);
    }

    #[test]
    fn the_bonus_round_is_worth_two_points() {
        assert_eq!(bonus_award(true).points, 2);
        assert!(!bonus_award(false).is_correct);
    }
}
