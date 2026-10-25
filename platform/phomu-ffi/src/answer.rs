//! The answer of a player, as the shell sends it.
//!
//! WHAT: the record that carries the answer of a mode and its conversion
//! into the answer of the base.
//!
//! WHY one record and not one type per mode: the six modes have six
//! different answers, and a foreign function interface cannot dispatch on a
//! tagged union that a shell would have to build. The record carries the
//! fields of every mode; the conversion reads the ones the mode needs and
//! rejects an answer that does not fit the mode of the round.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::answer::{PhomuAnswer, to_core_answer};
//!
//! let answer = PhomuAnswer {
//!     mode: "timeline".to_string(),
//!     timeline_slot: Some(0),
//!     ..PhomuAnswer::default()
//! };
//! assert!(to_core_answer(&answer).is_ok());
//! ```

use phomu_core::facade::{GameMode, KnewWhat, ModeAnswer};
use phomu_errors::ErrorCode;

use crate::error::{PhomuError, failure};

/// The answer of a player.
#[derive(
    Debug, Clone, Default, PartialEq, Eq, uniffi::Record, serde::Serialize, serde::Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub struct PhomuAnswer {
    /// The identifier of the mode the answer belongs to.
    pub mode: String,
    /// The slot the player chose — the Timeline mode.
    pub timeline_slot: Option<u32>,
    /// The hint level that was reached — the Hint-Master mode.
    pub hint_level: Option<u32>,
    /// What the pilot knew: `both`, `artist`, `title` or `none` — the
    /// Hint-Master mode.
    pub knew_what: Option<String>,
    /// Whether the picked line was the invented one — the Lyrics mode.
    pub picked_fake: Option<bool>,
    /// Whether the player recognised the song — the bonus round of the Lyrics
    /// mode.
    pub claimed: Option<bool>,
    /// The mood the player picked — the Vibe-Check mode.
    pub mood: Option<String>,
    /// Whether the cheat was used — the Vibe-Check mode.
    pub cheat_used: Option<bool>,
    /// Whether the player guessed "one-hit wonder" — the Survivor mode.
    pub guessed_one_hit: Option<bool>,
    /// The number of hints that were used — the Cover Confusion mode.
    pub hints_used: Option<u32>,
    /// The artist the player picked — the Cover Confusion mode.
    pub picked_artist: Option<String>,
    /// The self-assessment — the Cover Confusion mode.
    pub self_assess: Option<bool>,
    /// Whether the player answered "cover" — the variation of the Cover
    /// Confusion mode.
    pub guess_cover: Option<bool>,
}

/// The failure of an answer that does not fit the mode of the round.
fn invalid_answer(field: &str) -> PhomuError {
    failure(ErrorCode::InvalidAnswer, &[("field", field)])
}

/// Turn the answer of the shell into the answer of the base.
///
/// # Errors
/// Returns the failure `InvalidAnswer` when the answer does not carry the
/// fields the mode needs, and `InvalidMode` when the mode is not one the
/// base knows.
pub fn to_core_answer(answer: &PhomuAnswer) -> Result<ModeAnswer, PhomuError> {
    let mode = GameMode::from_str(&answer.mode)
        .ok_or_else(|| failure(ErrorCode::UnknownMode, &[("mode", &answer.mode)]))?;

    Ok(match mode {
        GameMode::Timeline => ModeAnswer::Timeline {
            slot: answer
                .timeline_slot
                .ok_or_else(|| invalid_answer("timelineSlot"))? as usize,
        },
        GameMode::HintMaster => {
            let level = answer
                .hint_level
                .ok_or_else(|| invalid_answer("hintLevel"))?;
            let knew_raw = answer
                .knew_what
                .as_deref()
                .ok_or_else(|| invalid_answer("knewWhat"))?;
            let knew = match knew_raw {
                "both" => KnewWhat::Both,
                "artist" => KnewWhat::Artist,
                "title" => KnewWhat::Title,
                "none" => KnewWhat::None,
                other => {
                    return Err(failure(ErrorCode::InvalidAnswer, &[("knewWhat", other)]));
                }
            };
            ModeAnswer::HintMaster { level, knew }
        }
        GameMode::Lyrics => ModeAnswer::Lyrics {
            picked_fake: answer
                .picked_fake
                .ok_or_else(|| invalid_answer("pickedFake"))?,
        },
        GameMode::VibeCheck => ModeAnswer::VibeCheck {
            mood: answer.mood.clone().ok_or_else(|| invalid_answer("mood"))?,
            cheat_used: answer.cheat_used.unwrap_or(false),
        },
        GameMode::Survivor => ModeAnswer::Survivor {
            guessed_one_hit: answer
                .guessed_one_hit
                .ok_or_else(|| invalid_answer("guessedOneHit"))?,
        },
        GameMode::CoverConfusion => ModeAnswer::CoverConfusion {
            hints_used: answer.hints_used.unwrap_or(0),
            picked_artist: answer.picked_artist.clone(),
            self_assess: answer.self_assess,
        },
    })
}
