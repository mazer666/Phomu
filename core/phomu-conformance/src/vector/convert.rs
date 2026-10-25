//! The reading of a vector and the conversion into the model of the core.
//!
//! WHAT: the reading of a vector from its JSON ([`Vector::from_json`]) and
//! the conversion of the values of a vector into the values of the core
//! ([`Vector::mode_answer`], [`Vector::cheat`], [`Vector::mode`]).
//!
//! WHY: the conversion is the boundary between the format of the corpus and
//! the model of the core. It lives in its own module so that the boundary
//! is visible in the tree of the crate — a value that crosses it has to be
//! converted here and nowhere else (QA-09 backlog item 2.9).

use phomu_core::facade::{Cheat, GameMode, KnewWhat, ModeAnswer, Song};

use super::op::VectorAnswer;
use super::song::build_song;
use super::{Vector, VectorError};

impl Vector {
    /// Reads a vector from its JSON representation.
    ///
    /// # Errors
    /// Returns the error `VectorError` when the text is not a valid vector.
    ///
    /// EXAMPLE: a vector is read from a string.
    pub fn from_json(id: &str, text: &str) -> Result<Self, VectorError> {
        serde_json::from_str::<Vector>(text).map_err(|error| VectorError {
            id: id.to_string(),
            reason: error.to_string(),
        })
    }

    /// The song of an identifier of the fixtures of the vector.
    pub fn song(&self, id: &str) -> Option<Song> {
        self.given.songs.get(id).map(build_song).or_else(|| {
            self.given
                .catalogue
                .iter()
                .find(|song| song.id == id)
                .map(build_song)
        })
    }

    /// The catalogue of the vector.
    pub fn catalogue(&self) -> Vec<Song> {
        self.given.catalogue.iter().map(build_song).collect()
    }

    /// The answer of a vector as the answer of the core.
    ///
    /// # Errors
    /// Returns the error `VectorError` when the answer of the vector names
    /// a mode or a value that the core does not know.
    pub fn mode_answer(answer: &VectorAnswer) -> Result<ModeAnswer, VectorError> {
        let converted = match answer {
            VectorAnswer::Timeline { slot } => ModeAnswer::Timeline {
                slot: slot.unwrap_or_default(),
            },
            VectorAnswer::HintMaster { level, knew } => {
                let knew = match knew.as_str() {
                    "both" => KnewWhat::Both,
                    "artist" => KnewWhat::Artist,
                    "title" => KnewWhat::Title,
                    "none" => KnewWhat::None,
                    other => {
                        return Err(VectorError {
                            id: "answer".to_string(),
                            reason: format!("the verdict {other} does not exist"),
                        });
                    }
                };
                ModeAnswer::HintMaster {
                    level: *level,
                    knew,
                }
            }
            VectorAnswer::Lyrics { picked } => ModeAnswer::Lyrics {
                picked_fake: picked == "fake",
            },
            VectorAnswer::LyricsBonus { claimed } => ModeAnswer::LyricsBonus { claimed: *claimed },
            VectorAnswer::VibeCheck { mood, cheat_used } => ModeAnswer::VibeCheck {
                mood: mood.clone(),
                cheat_used: *cheat_used,
            },
            VectorAnswer::Survivor { guessed_one_hit } => ModeAnswer::Survivor {
                guessed_one_hit: *guessed_one_hit,
            },
            VectorAnswer::CoverConfusion {
                hints_used,
                picked_artist,
                self_assess,
            } => ModeAnswer::CoverConfusion {
                hints_used: *hints_used,
                picked_artist: picked_artist.clone(),
                self_assess: *self_assess,
            },
            VectorAnswer::CoverConfusionVariation { guess_cover } => {
                ModeAnswer::CoverConfusionVariation {
                    guess_cover: *guess_cover,
                }
            }
        };
        Ok(converted)
    }

    /// The cheat of a vector.
    pub fn cheat(name: &str) -> Option<Cheat> {
        match name {
            "timeline-decade-hint" => Some(Cheat::TimelineDecadeHint),
            "timeline-joker" => Some(Cheat::TimelineJoker),
            "hint-master-music" => Some(Cheat::HintMasterMusic),
            "survivor-artist" => Some(Cheat::SurvivorArtist),
            "vibe-check-options" => Some(Cheat::VibeCheckOptions),
            _ => None,
        }
    }

    /// The mode of an identifier.
    pub fn mode(name: &str) -> Option<GameMode> {
        GameMode::from_str(name)
    }
}
