//! The answers of a shell, as the bridge maps them to the base.
//!
//! WHAT: the mapping of the choice of a player (a JSON document) to the
//! normalised answer of the base ([`ModeAnswer`]).
//!
//! WHY the mapping lives here: the base evaluates a *normalised* answer. The
//! shell, however, knows only what the player picked — a slot, a mood, an
//! option. The bridge is the place where the two meet, and it is also the
//! only place that may look at the song: the Lyrics Labyrinth asks for the
//! index of the picked line, and only the bridge may decide whether that
//! line was the invented one (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
//!
//! EXAMPLE: the choice `{"kind": "survivor", "guessedOneHit": true}` becomes
//! the answer `Survivor { guessed_one_hit: true }`.

use phomu_core::facade::{KnewWhat, ModeAnswer};
use serde_json::Value;

use crate::BridgeError;

/// The failure of a choice the base does not know.
fn invalid(kind: &str, reason: &str) -> BridgeError {
    BridgeError {
        code: 1203,
        message_key: "errors.invalidSongData".to_string(),
        context: std::collections::HashMap::from([
            ("kind".to_string(), kind.to_string()),
            ("reason".to_string(), reason.to_string()),
        ]),
    }
}

/// The text of a field of the choice.
fn text(choice: &Value, field: &str) -> String {
    choice
        .get(field)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

/// The number of a field of the choice.
fn number(choice: &Value, field: &str) -> i64 {
    choice.get(field).and_then(Value::as_i64).unwrap_or_default()
}

/// The flag of a field of the choice.
fn flag(choice: &Value, field: &str) -> bool {
    choice
        .get(field)
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

/// What the pilot knew, as the base names it.
///
/// EXAMPLE: the choice `"knew": "artist"` becomes [`KnewWhat::Artist`].
fn knew_what(value: &str) -> Option<KnewWhat> {
    match value {
        "both" => Some(KnewWhat::Both),
        "artist" => Some(KnewWhat::Artist),
        "title" => Some(KnewWhat::Title),
        "none" => Some(KnewWhat::None),
        _ => None,
    }
}

/// Maps the choice of a player to the answer of the base.
///
/// WHY the Lyrics Labyrinth is special: the shell sends the *index* of the
/// picked line. It must not learn which line was the invented one — that is
/// the answer of the round. The bridge therefore compares the picked line
/// with the invented line of the song and hands the base the normalised
/// answer (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
///
/// # Errors
/// Returns the failure of the base when the choice names a mode the base
/// does not know or carries a field the base cannot read.
///
/// EXAMPLE: the choice `{"kind": "timeline", "slot": 2}` becomes the answer
/// `Timeline { slot: 2 }`.
pub fn mode_answer(choice: &Value, invented_line: Option<&str>) -> Result<ModeAnswer, BridgeError> {
    let kind = choice
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or_default();
    match kind {
        "timeline" => Ok(ModeAnswer::Timeline {
            slot: number(choice, "slot").max(0) as usize,
        }),
        "hint-master" => {
            let knew_text = text(choice, "knew");
            let knew = knew_what(&knew_text)
                .ok_or_else(|| invalid(kind, &format!("unknown knew {knew_text:?}")))?;
            Ok(ModeAnswer::HintMaster {
                level: number(choice, "level").max(0) as u32,
                knew,
            })
        }
        "lyrics" => {
            let picked = text(choice, "line");
            let picked_fake = match invented_line {
                Some(invented) => invented == picked,
                None => false,
            };
            Ok(ModeAnswer::Lyrics { picked_fake })
        }
        "lyrics-bonus" => Ok(ModeAnswer::LyricsBonus {
            claimed: flag(choice, "claimed"),
        }),
        "vibe-check" => Ok(ModeAnswer::VibeCheck {
            mood: text(choice, "mood"),
            cheat_used: flag(choice, "cheatUsed"),
        }),
        "survivor" => Ok(ModeAnswer::Survivor {
            guessed_one_hit: flag(choice, "guessedOneHit"),
        }),
        "cover-confusion" => {
            let picked = choice.get("pickedArtist").and_then(Value::as_str);
            let self_assess = choice.get("selfAssess").and_then(Value::as_bool);
            Ok(ModeAnswer::CoverConfusion {
                hints_used: number(choice, "hintsUsed").max(0) as u32,
                picked_artist: picked.map(str::to_string),
                self_assess,
            })
        }
        "cover-confusion-variation" => Ok(ModeAnswer::CoverConfusionVariation {
            guess_cover: flag(choice, "guessCover"),
        }),
        other => Err(invalid(other, "unknown kind of answer")),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::mode_answer;
    use phomu_core::facade::ModeAnswer;
    use serde_json::json;

    #[test]
    fn the_timeline_choice_becomes_a_slot() {
        let answer = mode_answer(&json!({"kind": "timeline", "slot": 2}), None).unwrap();
        assert_eq!(answer, ModeAnswer::Timeline { slot: 2 });
    }

    #[test]
    fn the_lyrics_choice_carries_the_line_and_not_the_flag() {
        let answer = mode_answer(&json!({"kind": "lyrics", "line": "erfunden"}), Some("erfunden"))
            .unwrap();
        assert_eq!(answer, ModeAnswer::Lyrics { picked_fake: true });
    }

    #[test]
    fn a_real_line_is_not_the_invented_one() {
        let answer =
            mode_answer(&json!({"kind": "lyrics", "line": "echt"}), Some("erfunden")).unwrap();
        assert_eq!(answer, ModeAnswer::Lyrics { picked_fake: false });
    }

    #[test]
    fn an_unknown_kind_is_a_failure() {
        assert!(mode_answer(&json!({"kind": "nope"}), None).is_err());
    }
}
