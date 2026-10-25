//! The Timeline mode.
//!
//! WHAT: the validity of a slot ([`valid_slots`]), the canonical slot
//! ([`canonical_slot`]), the points of the mode ([`points`]), the effect of a
//! correct answer on the timeline ([`apply_year`]) and the joker
//! ([`joker_slots`]).
//!
//! WHY: the timeline is the mode with the most moving parts: a growing
//! list of years, a duplicate rule and a joker that removes a wrong slot.
//! The rules are the ones of `src/components/game/modes/TimelineMode.tsx`.

use std::collections::BTreeSet;

use phomu_config::{TIMELINE_JOKER_MIN_SLOTS, TIMELINE_REMOVAL_THRESHOLD};

/// The slots in which a song year is accepted.
///
/// WHY: the canonical slot is the first slot whose year is greater than the
/// year of the song. If the year already occurs on the timeline, the slot
/// before and the slot after the duplicate are accepted as well — otherwise
/// the position of a year that is not unambiguous would have to be guessed
/// (GAME-018).
///
/// EXAMPLE: the years `[1970, 1980, 1990]` and the song year `1985` accept
/// the slot `2` — the slot between 1980 and 1990.
pub fn valid_slots(song_year: i32, sorted_years: &[i32]) -> BTreeSet<usize> {
    let mut slots = BTreeSet::new();
    let canonical = canonical_slot(song_year, sorted_years);
    slots.insert(canonical);
    for (index, year) in sorted_years.iter().enumerate() {
        if *year == song_year {
            slots.insert(index);
            slots.insert(index + 1);
        }
    }
    slots
}

/// The slot the timeline highlights after a wrong answer.
///
/// WHY: after a wrong answer the timeline shows where the song would have
/// belonged; the slot is therefore the first one whose year is greater than
/// the year of the song (`src/components/game/modes/TimelineMode.tsx:118`).
///
/// EXAMPLE: the years `[1970, 1980, 1990]` and the song year `1985` yield
/// the slot `2`.
pub fn canonical_slot(song_year: i32, sorted_years: &[i32]) -> usize {
    for (index, year) in sorted_years.iter().enumerate() {
        if song_year < *year {
            return index;
        }
    }
    sorted_years.len()
}

/// The points of the mode.
///
/// WHY: the longer the timeline, the harder it is to hit — but the round
/// must stay winnable, therefore the value is capped (GAME-016).
///
/// EXAMPLE: three years on the timeline and a maximum of five are four
/// points.
pub fn points(year_count: usize, max_points: u32) -> u32 {
    let raw = year_count.saturating_add(1) as u32;
    raw.min(max_points)
}

/// The effect of a correct answer on the timeline.
///
/// WHY: the session has to know whether the year was a duplicate and
/// whether the player may remove a year afterwards; the mode decides it
/// (GAME-019, GAME-020).
///
/// EXAMPLE: the years `[1970, 1980]` and the song year `1980` yield the
/// effect `is_duplicate: true`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimelineEffect {
    /// Whether the year of the song already occurs on the timeline.
    pub is_duplicate: bool,
    /// Whether the player may remove a year afterwards.
    pub removal_offered: bool,
}

/// The effect of a correct answer on the timeline.
///
/// WHY: a duplicate is added and removed again immediately; from more than
/// ten years on the player is offered the removal of one year (GAME-019,
/// GAME-020).
///
/// EXAMPLE: the years `[1970, 1980]` and the song year `1980` yield a
/// duplicate and no removal offer.
pub fn apply_year(years: &[i32], song_year: i32) -> TimelineEffect {
    let is_duplicate = years.contains(&song_year);
    TimelineEffect {
        is_duplicate,
        removal_offered: !is_duplicate
            && years.len().saturating_add(1) > TIMELINE_REMOVAL_THRESHOLD,
    }
}

/// The wrong slots the joker may remove.
///
/// WHY: the joker must not remove a correct slot — otherwise it would give
/// the answer away. It is only offered from four slots on
/// (`src/components/game/modes/TimelineMode.tsx:407`).
///
/// EXAMPLE: with four slots and two correct ones the joker has two choices.
pub fn joker_slots(valid: &BTreeSet<usize>, slot_count: usize) -> Vec<usize> {
    if slot_count < TIMELINE_JOKER_MIN_SLOTS {
        return Vec::new();
    }
    (0..slot_count)
        .filter(|slot| !valid.contains(slot))
        .collect()
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{apply_year, canonical_slot, joker_slots, points, valid_slots};

    #[test]
    fn the_canonical_slot_is_the_first_greater_year() {
        assert_eq!(canonical_slot(1985, &[1970, 1980, 1990]), 2);
        assert_eq!(canonical_slot(1995, &[1970, 1980, 1990]), 3);
        assert_eq!(canonical_slot(1965, &[1970, 1980]), 0);
    }

    #[test]
    fn a_duplicate_accepts_the_slot_before_and_the_slot_after() {
        let slots = valid_slots(1980, &[1970, 1980, 1990]);
        assert!(slots.contains(&1), "the slot of the duplicate");
        assert!(slots.contains(&2), "the slot after the duplicate");
        assert!(!slots.contains(&0), "the slot before the first year");
    }

    #[test]
    fn a_year_without_a_duplicate_accepts_one_slot() {
        let slots = valid_slots(1985, &[1970, 1980, 1990]);
        assert_eq!(slots.len(), 1);
        assert!(slots.contains(&2));
    }

    #[test]
    fn the_points_grow_with_the_timeline_and_are_capped() {
        assert_eq!(points(0, 5), 1);
        assert_eq!(points(3, 5), 4);
        assert_eq!(points(9, 5), 5);
    }

    #[test]
    fn a_duplicate_is_removed_immediately() {
        let effect = apply_year(&[1970, 1980], 1980);
        assert!(effect.is_duplicate);
        assert!(!effect.removal_offered);
    }

    #[test]
    fn from_more_than_ten_years_one_may_be_removed() {
        let years: Vec<i32> = (0..10).collect();
        let effect = apply_year(&years, 99);
        assert!(!effect.is_duplicate);
        assert!(effect.removal_offered);
    }

    #[test]
    fn the_joker_only_removes_wrong_slots() {
        let valid = valid_slots(1985, &[1970, 1980, 1990]);
        let slots = joker_slots(&valid, 4);
        assert_eq!(slots.len(), 3);
        assert!(
            !slots.contains(&2),
            "the joker never removes a correct slot"
        );
    }

    #[test]
    fn the_joker_is_not_offered_with_few_slots() {
        let valid = valid_slots(1985, &[1970, 1980]);
        assert!(joker_slots(&valid, 3).is_empty());
    }
}
