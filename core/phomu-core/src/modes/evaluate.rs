//! The evaluation of the answers of the six modes.
//!
//! WHAT: [`evaluate_mode_answer`] — the single entry point of the mode
//! rules —, [`max_points`] and [`deterministic_shuffle`].
//!
//! WHY: the reference implementation reaches the same result through the
//! `onAnswer` callback of the six components; the base evaluates it
//! directly, so that the rule can be replayed and compared
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-101).

use phomu_catalog::Song;
use phomu_errors::{ErrorCode, PhomuError, Result};

use super::{
    GameMode, ModeAnswer, ModeContext, ModeOutcome, cover_confusion, hint_master, lyrics, survivor,
    timeline, vibe_check,
};

/// Evaluates one answer of one mode.
///
/// WHY: this is the single entry point of the mode rules. The reference
/// implementation reaches the same result through the `onAnswer` callback of
/// the six components; the base evaluates it directly, so that the rule can
/// be replayed and compared (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-101).
///
/// # Errors
/// Returns the error `InvalidAnswer` when the answer does not fit the mode
/// it was given in — for example a Timeline slot outside of the timeline, or
/// a Cover Confusion answer that names neither an artist nor an
/// assessment.
///
/// EXAMPLE: the mode `vibe-check` with the mood `"Chill"` on a song whose
/// moods contain `"Chill"` is worth two points.
pub fn evaluate_mode_answer(
    mode: GameMode,
    answer: &ModeAnswer,
    song: &Song,
    context: &ModeContext<'_>,
) -> Result<ModeOutcome> {
    match (mode, answer) {
        (GameMode::Timeline, ModeAnswer::Timeline { slot }) => {
            let valid = timeline::valid_slots(song.year, context.timeline_years);
            if !valid.contains(slot) && *slot > context.timeline_years.len() {
                return Err(PhomuError::new(ErrorCode::InvalidAnswer)
                    .with_context("slot", slot.to_string()));
            }
            let is_correct = valid.contains(slot);
            Ok(if is_correct {
                ModeOutcome::correct(timeline::points(
                    context.timeline_years.len(),
                    context.timeline_max_points,
                ))
            } else {
                ModeOutcome::incorrect()
            })
        }
        (GameMode::HintMaster, ModeAnswer::HintMaster { level, knew }) => {
            let outcome = hint_master::award(*level, *knew);
            Ok(outcome)
        }
        (GameMode::Lyrics, ModeAnswer::Lyrics { picked_fake }) => Ok(lyrics::award(*picked_fake)),
        (GameMode::Lyrics, ModeAnswer::LyricsBonus { claimed }) => {
            Ok(lyrics::bonus_award(*claimed))
        }
        (GameMode::VibeCheck, ModeAnswer::VibeCheck { mood, cheat_used }) => {
            Ok(vibe_check::award(&song.mood, mood, *cheat_used))
        }
        (GameMode::Survivor, ModeAnswer::Survivor { guessed_one_hit }) => {
            Ok(survivor::award(song.is_one_hit_wonder, *guessed_one_hit))
        }
        (
            GameMode::CoverConfusion,
            ModeAnswer::CoverConfusion {
                hints_used,
                picked_artist,
                self_assess,
            },
        ) => {
            let correct = match (picked_artist.as_ref(), self_assess) {
                (Some(artist), _) => artist == &song.artist,
                (None, Some(assessed)) => *assessed,
                (None, None) => {
                    return Err(PhomuError::new(ErrorCode::InvalidAnswer)
                        .with_context("mode", mode.as_str()));
                }
            };
            Ok(cover_confusion::award(*hints_used, correct))
        }
        (GameMode::CoverConfusion, ModeAnswer::CoverConfusionVariation { guess_cover }) => {
            let actually_cover = song.links.cover_link.is_some();
            Ok(cover_confusion::variation_award(
                *guess_cover,
                actually_cover,
            ))
        }
        (_, answer) => Err(PhomuError::new(ErrorCode::InvalidAnswer)
            .with_context("mode", mode.as_str())
            .with_context("answer", format!("{answer:?}"))),
    }
}

/// The maximum number of points a mode can be worth.
///
/// WHY: the shell shows the possible points of a round before it is played.
/// The value is a rule and therefore lives in the base.
///
/// EXAMPLE: the Timeline mode is worth four points with three years on the
/// timeline.
pub fn max_points(mode: GameMode, timeline_years: &[i32], timeline_cap: u32) -> u32 {
    match mode {
        GameMode::Timeline => timeline::points(timeline_years.len(), timeline_cap),
        GameMode::HintMaster => hint_master::points_for_level(1),
        GameMode::Lyrics => phomu_config::LYRICS_POINTS,
        GameMode::VibeCheck => phomu_config::VIBE_CHECK_POINTS,
        GameMode::Survivor => phomu_config::SURVIVOR_POINTS,
        GameMode::CoverConfusion => cover_confusion::points_for_hints(0),
    }
}

/// Shuffles a list deterministically.
///
/// WHY: the reference implementation shuffles with `Math.random()` and
/// keeps the result stable for the duration of the round. The base draws
/// from the seeded generator of the session, so that a replay of the same
/// seed reproduces the same order
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
///
/// EXAMPLE: two calls with the same draw produce the same order.
pub fn deterministic_shuffle<T: Clone>(items: &[T], draw: u64) -> Vec<T> {
    let mut indexed: Vec<(u64, usize)> = items
        .iter()
        .enumerate()
        .map(|(index, _)| (crate::session::rng::mix(draw ^ (index as u64)), index))
        .collect();
    indexed.sort_unstable();
    indexed
        .into_iter()
        .filter_map(|(_, index)| items.get(index).cloned())
        .collect()
}
