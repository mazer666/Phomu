//! The comparison of the observation with the expectation of a vector.
//!
//! WHAT: the comparison of the two ([`compare`]) and the comparison of two
//! maps ([`compare_map`]).
//!
//! WHY: the comparison is the verdict of the runner. It lives in its own
//! module because it is the part of the runner that decides whether the
//! base behaves as the contract says — a difference that this module does
//! not report is a difference that nobody sees (QA-09 backlog item 2.9).

use std::collections::BTreeMap;

use crate::vector::Vector;

use super::observation::{Observation, ObservedError};

/// Compares the observation with the expectation of the vector.
pub(crate) fn compare(vector: &Vector, observation: &Observation) -> Vec<String> {
    let expected = &vector.then;
    let mut differences = Vec::new();

    if expected.phases != observation.phases {
        differences.push(format!(
            "the phases differ: expected {:?}, got {:?}",
            expected.phases, observation.phases
        ));
    }
    if expected.current_round != observation.current_round {
        differences.push(format!(
            "the round differs: expected {}, got {}",
            expected.current_round, observation.current_round
        ));
    }
    if expected.current_mode != observation.current_mode {
        differences.push(format!(
            "the mode differs: expected {}, got {}",
            expected.current_mode, observation.current_mode
        ));
    }
    if expected.current_song_id != observation.current_song_id {
        differences.push(format!(
            "the song differs: expected {:?}, got {:?}",
            expected.current_song_id, observation.current_song_id
        ));
    }
    if expected.current_song_source != observation.current_song_source {
        differences.push(format!(
            "the source of the song differs: expected {:?}, got {:?}",
            expected.current_song_source, observation.current_song_source
        ));
    }
    if expected.auto_draw_intent != observation.auto_draw_intent {
        differences.push(format!(
            "the auto-draw flag differs: expected {}, got {}",
            expected.auto_draw_intent, observation.auto_draw_intent
        ));
    }
    compare_map(
        "the player scores",
        &expected.player_scores,
        &observation.player_scores,
        &mut differences,
    );
    compare_map(
        "the team scores",
        &expected.team_scores,
        &observation.team_scores,
        &mut differences,
    );
    compare_map(
        "the player teams",
        &expected.player_teams,
        &observation.player_teams,
        &mut differences,
    );
    compare_map(
        "the team members",
        &expected.team_members,
        &observation.team_members,
        &mut differences,
    );
    if expected.turn_order != observation.turn_order {
        differences.push(format!(
            "the turn order differs: expected {:?}, got {:?}",
            expected.turn_order, observation.turn_order
        ));
    }
    if expected.current_turn_index != observation.current_turn_index {
        differences.push(format!(
            "the turn index differs: expected {}, got {}",
            expected.current_turn_index, observation.current_turn_index
        ));
    }
    if expected.winner_id != observation.winner_id {
        differences.push(format!(
            "the winner differs: expected {:?}, got {:?}",
            expected.winner_id, observation.winner_id
        ));
    }
    if expected.is_game_over != observation.is_game_over {
        differences.push(format!(
            "the game-over flag differs: expected {}, got {}",
            expected.is_game_over, observation.is_game_over
        ));
    }
    if expected.timeline_years != observation.timeline_years {
        differences.push(format!(
            "the timeline differs: expected {:?}, got {:?}",
            expected.timeline_years, observation.timeline_years
        ));
    }
    if expected.played_song_ids != observation.played_song_ids {
        differences.push(format!(
            "the played songs differ: expected {:?}, got {:?}",
            expected.played_song_ids, observation.played_song_ids
        ));
    }
    if expected.answers.len() != observation.answers.len() {
        differences.push(format!(
            "the number of answers differs: expected {}, got {}",
            expected.answers.len(),
            observation.answers.len()
        ));
    } else {
        for (expected_answer, answer) in expected.answers.iter().zip(observation.answers.iter()) {
            if expected_answer.player_id != answer.player_id
                || expected_answer.answer != answer.answer
                || expected_answer.is_correct != answer.is_correct
                || expected_answer.points_awarded != answer.points_awarded
                || expected_answer.answered_in_seconds != answer.answered_in_seconds
            {
                differences.push(format!(
                    "the answer of {} differs: expected {expected_answer:?}, got {answer:?}",
                    expected_answer.player_id
                ));
            }
        }
    }
    if expected.round_count != observation.round_count {
        differences.push(format!(
            "the number of logged rounds differs: expected {}, got {}",
            expected.round_count, observation.round_count
        ));
    }
    if expected.total_xp != observation.total_xp {
        differences.push(format!(
            "the experience points differ: expected {}, got {}",
            expected.total_xp, observation.total_xp
        ));
    }
    if expected.censor_hint != observation.censor_hint {
        differences.push(format!(
            "the censored hint differs: expected {:?}, got {:?}",
            expected.censor_hint, observation.censor_hint
        ));
    }
    if expected.filtered_song_ids != observation.filtered_song_ids {
        differences.push(format!(
            "the filtered songs differ: expected {:?}, got {:?}",
            expected.filtered_song_ids, observation.filtered_song_ids
        ));
    }
    let expected_error = expected.error.as_ref().map(|error| ObservedError {
        code: error.code.clone(),
        message: error.message.clone(),
    });
    if expected_error != observation.error {
        differences.push(format!(
            "the error differs: expected {expected_error:?}, got {:?}",
            observation.error
        ));
    }
    differences
}

/// Compares two maps field by field.
fn compare_map<T: PartialEq + std::fmt::Debug>(
    what: &str,
    expected: &BTreeMap<String, T>,
    actual: &BTreeMap<String, T>,
    differences: &mut Vec<String>,
) {
    for (key, value) in expected {
        match actual.get(key) {
            Some(other) if other == value => {}
            Some(other) => differences.push(format!(
                "{what} of {key} differ: expected {value:?}, got {other:?}"
            )),
            None => differences.push(format!("{what} of {key} are missing")),
        }
    }
}
