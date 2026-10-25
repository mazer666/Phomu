//! The wire model of the WebAssembly bridge.
//!
//! WHAT: the conversion between the types of the base and the JSON that
//! crosses the boundary of the module.
//!
//! WHY JSON: the module of the web shell is loaded by the browser, and the
//! browser has no other way to hold a value that comes from Rust. The
//! format is stable within a major version of the ABI (BRIDGE-110) and is
//! the same as the one of the C-ABI bridge, so that the two profiles of the
//! wire model agree.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_wasm::json::phase_name;
//!
//! assert_eq!(phase_name("question"), "question");
//! ```

use serde_json::{Value, json};

/// The name of a phase of the round.
pub fn phase_name(phase: &str) -> String {
    phase.to_string()
}

/// The JSON of the view of the running round.
///
/// WHY the reveal has no arm: the question phase must not be able to carry
/// the identity of the song (C-1).
pub fn round_view(view: &phomu_core::facade::RoundView) -> Value {
    match view {
        phomu_core::facade::RoundView::Drawing(drawing) => json!({
            "phase": "drawing",
            "roundNumber": drawing.round_number,
            "mode": drawing.mode.as_str(),
            "autoDraw": drawing.auto_draw,
        }),
        phomu_core::facade::RoundView::Question(question) => json!({
            "phase": "question",
            "roundNumber": question.round_number,
            "mode": question.mode.as_str(),
            "hints": question.prompt.hints(),
            "options": question.prompt.options(),
            "pointsPossible": question.points_possible,
            "answersLocked": question.answers_locked,
        }),
        phomu_core::facade::RoundView::Reveal(reveal) => json!({
            "phase": "reveal",
            "roundNumber": reveal.round_number,
            "mode": reveal.mode.as_str(),
            "title": reveal.solution.title,
            "artist": reveal.solution.artist,
            "year": reveal.solution.year,
            "isCorrect": reveal.is_correct,
            "pointsAwarded": reveal.points_awarded,
        }),
        phomu_core::facade::RoundView::Scoring(scoring) => json!({
            "phase": "scoring",
            "roundNumber": scoring.round_number,
            "winnerId": scoring.winner_id,
        }),
    }
}

/// The JSON of the snapshot of a session.
pub fn session_snapshot(snapshot: &phomu_core::facade::SessionSnapshot) -> Value {
    json!({
        "phase": snapshot.phase.as_str(),
        "roundNumber": snapshot.current_round,
        "currentMode": snapshot.current_mode.as_str(),
        "roundCount": snapshot.current_round.saturating_sub(1),
        "players": snapshot.players.iter().map(|player| json!({
            "id": player.id,
            "name": player.name,
            "score": player.score,
            "teamId": player.team_id,
            "isEliminated": player.is_eliminated,
            "isSpectator": player.is_spectator,
        })).collect::<Vec<Value>>(),
        "teamScores": snapshot.teams.iter().map(|team| json!({
            "id": team.id,
            "score": team.score,
        })).collect::<Vec<Value>>(),
        "isGameOver": snapshot.is_game_over,
        "winnerId": snapshot.winner_id,
    })
}

/// The JSON of the score of a round.
pub fn score_snapshot(snapshot: &phomu_core::facade::ScoreSnapshot) -> Value {
    json!({
        "roundNumber": snapshot.round_number,
        "playerId": snapshot.player_id,
        "isCorrect": snapshot.is_correct,
        "pointsAwarded": snapshot.points_awarded,
        "playerScore": snapshot.player_score,
        "teamId": snapshot.team_id,
        "teamScore": snapshot.team_score,
        "phase": snapshot.phase.as_str(),
    })
}

/// The JSON of the plan of the media.
pub fn media_plan(plan: &phomu_core::facade::MediaPlan) -> Value {
    json!({
        "candidates": plan.candidates().iter().map(|candidate| json!({
            "source": format!("{:?}", candidate.source),
            "kind": format!("{:?}", candidate.kind),
            "location": candidate.location,
        })).collect::<Vec<Value>>(),
        "startSeconds": plan.window().start_seconds,
        "endSeconds": plan.window().end_seconds,
    })
}

/// The JSON of a failure of the base.
///
/// WHY the code and the key and not a sentence: the base supplies the keys,
/// the shell supplies the texts (docs/design/BUILD-CONTRACT.md § 6.1).
pub fn error(error: &phomu_errors::PhomuError) -> Value {
    json!({
        "code": error.code().code(),
        "messageKey": error.message_key(),
        "context": error
            .context()
            .iter()
            .map(|(key, value)| (key.clone(), Value::from(value.clone())))
            .collect::<serde_json::Map<String, Value>>(),
    })
}
