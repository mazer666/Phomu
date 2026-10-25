//! The view models a shell receives.
//!
//! WHAT: the four view models ([`RoundView`]) and the parts they consist
//! of.
//!
//! WHY: the anti-spoiler guarantee is structural, not a rendering rule. The
//! question-phase view model has **no field** that could carry the
//! solution: the type of the question is different from the type of the
//! reveal, and the only way the identity reaches the question phase is the
//! variant that a mode declares explicitly (C-1 and C-6,
//! docs/design/PLATFORM-ARCHITECTURE.md § 10.2).

use crate::modes::GameMode;

/// The identity of a song, in the phase that discloses it.
///
/// WHY: the identity is a separate type, so that a view model that carries
/// it cannot be confused with one that does not.
///
/// EXAMPLE: the identity of the Vibe-Check names the artist and the title
/// of the song.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SongIdentity {
    /// The title of the song.
    pub title: String,
    /// The artist of the song.
    pub artist: String,
    /// The year of the release.
    pub year: i32,
}

/// The solution of a song, in the reveal phase.
///
/// WHY: the solution is a separate type from the identity; the question
/// phase has no field of this type at all.
///
/// EXAMPLE: the solution of the reveal names the artist and the title of
/// the song.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SongSolution {
    /// The title of the song.
    pub title: String,
    /// The artist of the song.
    pub artist: String,
    /// The year of the release.
    pub year: i32,
}

/// What the shell has to draw in the question phase.
///
/// WHY: the prompt is an enumeration, so that the identity is either
/// disclosed explicitly or not at all — there is no third possibility.
///
/// EXAMPLE: a round of the Timeline mode has the prompt `Prompt::Hidden`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Prompt {
    /// The identity of the song is hidden.
    Hidden {
        /// The censored hints of the song.
        hints: Vec<String>,
        /// The options the mode offers.
        options: Vec<String>,
    },
    /// The identity is disclosed — the mode asks for something else.
    ///
    /// WHY: the Vibe-Check asks for the mood of a song whose artist and
    /// title are visible. The exception belongs to the mode and is therefore
    /// identical on every platform (C-6).
    IdentityDisclosed {
        /// The identity of the song.
        identity: SongIdentity,
        /// The options the mode offers.
        options: Vec<String>,
    },
}

impl Prompt {
    /// The censored hints of the prompt, if it has any.
    ///
    /// WHY: a prompt that discloses the identity has no hints; the shell
    /// asks instead of guessing.
    ///
    /// EXAMPLE: the prompt of the Vibe-Check has no hints.
    pub fn hints(&self) -> &[String] {
        match self {
            Prompt::Hidden { hints, .. } => hints,
            Prompt::IdentityDisclosed { .. } => &[],
        }
    }

    /// The options of the prompt.
    ///
    /// WHY: the options are the same for the two variants of the prompt;
    /// the shell therefore reads them in one place.
    ///
    /// EXAMPLE: the prompt of the Lyrics Labyrinth carries four options.
    pub fn options(&self) -> &[String] {
        match self {
            Prompt::Hidden { options, .. } | Prompt::IdentityDisclosed { options, .. } => options,
        }
    }

    /// The identity of the prompt, if it discloses one.
    ///
    /// WHY: a shell asks before it draws whether the identity is part of
    /// the question — the answer decides what it may render.
    ///
    /// EXAMPLE: the prompt of the Vibe-Check has an identity.
    pub fn identity(&self) -> Option<&SongIdentity> {
        match self {
            Prompt::Hidden { .. } => None,
            Prompt::IdentityDisclosed { identity, .. } => Some(identity),
        }
    }
}

/// The view model of the question phase.
///
/// WHY: the view model is the boundary of the anti-spoiler guarantee: it
/// has no field that could carry the solution
/// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
///
/// EXAMPLE: the view of a Timeline round carries the censored hints and the
/// points of the round.
///
/// The type has no field for the title, the artist, the year or the raw
/// hints — the solution is not reachable from here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuestionView {
    /// The number of the round.
    pub round_number: u32,
    /// The mode of the round.
    pub mode: GameMode,
    /// What the shell has to draw.
    pub prompt: Prompt,
    /// The number of points the round is worth at the moment.
    pub points_possible: u32,
    /// Whether the answers of the round are already locked in.
    pub answers_locked: bool,
}

/// The view model of the reveal phase.
///
/// WHY: the reveal is the only phase that may carry the solution; the
/// type makes that visible.
///
/// EXAMPLE: the view of the reveal carries the solution of the song.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RevealView {
    /// The number of the round.
    pub round_number: u32,
    /// The mode of the round.
    pub mode: GameMode,
    /// The solution of the round.
    pub solution: SongSolution,
    /// Whether the answer of the pilot was correct.
    pub is_correct: bool,
    /// The number of points that were awarded.
    pub points_awarded: u32,
}

/// The view model of the drawing phase.
///
/// WHY: the drawing phase knows nothing about the song; the shell only
/// needs to know whether it has to draw automatically.
///
/// EXAMPLE: the view of the drawing phase carries no song.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DrawingView {
    /// The number of the round.
    pub round_number: u32,
    /// The mode of the round.
    pub mode: GameMode,
    /// Whether the drawing happens automatically.
    pub auto_draw: bool,
}

/// The view model of the scoring phase.
///
/// WHY: the scoring phase is the end of the game; the shell shows the
/// winner and leaves the session.
///
/// EXAMPLE: the view of the scoring phase carries the winner of the game.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScoringView {
    /// The number of the round.
    pub round_number: u32,
    /// The winner, if the ending condition named one.
    pub winner_id: Option<String>,
}

/// The view model of the current round.
///
/// WHY: the enumeration has one variant per phase; a shell switches on the
/// variant and therefore renders exactly what the phase allows.
///
/// EXAMPLE: the view of a new session is the drawing phase.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RoundView {
    /// A card is being drawn.
    Drawing(DrawingView),
    /// The question stands.
    Question(QuestionView),
    /// The solution is revealed.
    Reveal(RevealView),
    /// The game is over.
    Scoring(ScoringView),
}

impl RoundView {
    /// The phase the view belongs to.
    ///
    /// WHY: the shell needs the phase to decide what it may render, even
    /// when it holds a view of a phase that has already passed.
    ///
    /// EXAMPLE: the view of the reveal belongs to the phase `reveal`.
    pub fn phase(&self) -> crate::rules::phase::RoundPhase {
        match self {
            RoundView::Drawing(_) => crate::rules::phase::RoundPhase::Drawing,
            RoundView::Question(_) => crate::rules::phase::RoundPhase::Question,
            RoundView::Reveal(_) => crate::rules::phase::RoundPhase::Reveal,
            RoundView::Scoring(_) => crate::rules::phase::RoundPhase::Scoring,
        }
    }

    /// A canonical rendering of the view model.
    ///
    /// EXAMPLE: the payload of a question round starts with
    /// `phase=question`.
    ///
    /// WHY: the anti-spoiler check searches the payload of the question
    /// phase for the tokens of the solution. The rendering is deterministic
    /// and contains every value the shell would receive, so that the check
    /// sees what the bridge would hand over.
    pub fn payload_text(&self) -> String {
        match self {
            RoundView::Drawing(view) => {
                format!(
                    "phase=drawing round={} mode={}",
                    view.round_number,
                    view.mode.as_str()
                )
            }
            RoundView::Question(view) => {
                let mut text = format!(
                    "phase=question round={} mode={} points={} locked={}",
                    view.round_number,
                    view.mode.as_str(),
                    view.points_possible,
                    view.answers_locked
                );
                for hint in view.prompt.hints() {
                    text.push_str(" hint=");
                    text.push_str(hint);
                }
                for option in view.prompt.options() {
                    text.push_str(" option=");
                    text.push_str(option);
                }
                if let Some(identity) = view.prompt.identity() {
                    text.push_str(&format!(
                        " identity={} {} {}",
                        identity.artist, identity.title, identity.year
                    ));
                }
                text
            }
            RoundView::Reveal(view) => format!(
                "phase=reveal round={} mode={} correct={} points={} solution={} {} {}",
                view.round_number,
                view.mode.as_str(),
                view.is_correct,
                view.points_awarded,
                view.solution.artist,
                view.solution.title,
                view.solution.year
            ),
            RoundView::Scoring(view) => format!(
                "phase=scoring round={} winner={}",
                view.round_number,
                view.winner_id.clone().unwrap_or_default()
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{Prompt, QuestionView, RoundView, SongIdentity, SongSolution};
    use crate::modes::GameMode;

    fn hidden_question() -> RoundView {
        RoundView::Question(QuestionView {
            round_number: 3,
            mode: GameMode::Timeline,
            prompt: Prompt::Hidden {
                hints: vec!["[XXX] sang 1985".to_string()],
                options: vec![],
            },
            points_possible: 4,
            answers_locked: false,
        })
    }

    #[test]
    fn the_question_payload_has_no_solution() {
        let payload = hidden_question().payload_text();
        assert!(!payload.contains("Titel"));
        assert!(!payload.contains("Künstler"));
    }

    #[test]
    fn the_reveal_payload_carries_the_solution() {
        let view = RoundView::Reveal(super::RevealView {
            round_number: 3,
            mode: GameMode::Timeline,
            solution: SongSolution {
                title: "Titel".to_string(),
                artist: "Künstler".to_string(),
                year: 1985,
            },
            is_correct: true,
            points_awarded: 4,
        });
        let payload = view.payload_text();
        assert!(payload.contains("Titel"));
        assert!(payload.contains("Künstler"));
        assert!(payload.contains("1985"));
    }

    #[test]
    fn the_disclosed_prompt_carries_the_identity() {
        let prompt = Prompt::IdentityDisclosed {
            identity: SongIdentity {
                title: "Titel".to_string(),
                artist: "Künstler".to_string(),
                year: 1985,
            },
            options: vec!["Chill".to_string()],
        };
        assert!(prompt.identity().is_some());
        assert_eq!(prompt.options().len(), 1);
        assert!(prompt.hints().is_empty());
    }
}
