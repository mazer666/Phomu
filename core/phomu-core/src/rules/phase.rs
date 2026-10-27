//! The round phases and the transition table.
//!
//! WHAT: the five phases of a round ([`RoundPhase`]) and the transitions
//! that are permitted between them.
//!
//! WHY: the phase automaton is the backbone of the game
//! (`docs/design/GAME-CONTRACT.md` § 2). The reference implementation
//! declares the phase `locked-in` but never enters it, and it lets a shell
//! jump from `question` straight into `reveal` — the anti-spoiler guarantee
//! is therefore a *rendering* rule and not a rule of the state
//! (`docs/design/GAME-CONTRACT.md` § 11.1, A6). The base makes it
//! structural: the transition from `question` into `reveal` exists only for
//! the timeout, and the normal path runs through `locked-in`, which the
//! base enters as soon as every expected answer has been submitted
//! (GAME-002).

/// The phase of a round.
///
/// WHY: the phase decides what the shell may render and what the core
/// accepts; it is the backbone of the game
/// (`docs/design/GAME-CONTRACT.md` § 2).
///
/// EXAMPLE: `RoundPhase::LockedIn` is the phase in which the answers of the
/// round are closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum RoundPhase {
    /// A card is being drawn.
    Drawing,
    /// The question stands and the players are thinking.
    Question,
    /// Every expected answer has been submitted; the round is closed.
    LockedIn,
    /// The solution is revealed.
    Reveal,
    /// The game is over.
    Scoring,
}

impl RoundPhase {
    /// Every phase, in the order of the round.
    pub const ALL: &'static [RoundPhase] = &[
        RoundPhase::Drawing,
        RoundPhase::Question,
        RoundPhase::LockedIn,
        RoundPhase::Reveal,
        RoundPhase::Scoring,
    ];

    /// The identifier of the phase.
    ///
    /// WHY: the identifier is the name of the phase in the contract and in
    /// the persisted state of the reference implementation
    /// (`docs/design/GAME-CONTRACT.md` § 2.1).
    ///
    /// EXAMPLE: `RoundPhase::LockedIn.as_str()` is `"locked-in"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            RoundPhase::Drawing => "drawing",
            RoundPhase::Question => "question",
            RoundPhase::LockedIn => "locked-in",
            RoundPhase::Reveal => "reveal",
            RoundPhase::Scoring => "scoring",
        }
    }

    /// Reads a phase from its identifier.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; an unknown identifier is a
    /// value to be reported and not an error to be raised. The counterpart
    /// of [`RoundPhase::as_str`], so that the identifier of a phase has
    /// exactly one spelling in the base and in the bridges.
    ///
    /// EXAMPLE: `RoundPhase::from_str("locked-in")` is
    /// `Some(RoundPhase::LockedIn)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; an unknown identifier is a value to report, not an error to raise"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "drawing" => Some(RoundPhase::Drawing),
            "question" => Some(RoundPhase::Question),
            "locked-in" => Some(RoundPhase::LockedIn),
            "reveal" => Some(RoundPhase::Reveal),
            "scoring" => Some(RoundPhase::Scoring),
            _ => None,
        }
    }

    /// Whether a transition from this phase into another one is permitted.
    ///
    /// WHY: the transition table is the backbone of the game; a shell that
    /// jumps over a phase would break the anti-spoiler guarantee
    /// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-3).
    ///
    /// The table is the one of `docs/design/GAME-CONTRACT.md` § 2.3, with
    /// one addition: the phase `locked-in` is entered when the last answer
    /// of the round has been submitted, and the reveal follows from there.
    ///
    /// EXAMPLE: `RoundPhase::Question.can_transition_to(RoundPhase::Reveal)`
    /// is `true` — the timeout may reveal a round that nobody answered.
    pub const fn can_transition_to(self, next: RoundPhase) -> bool {
        matches!(
            (self, next),
            (RoundPhase::Drawing, RoundPhase::Drawing)
                | (RoundPhase::Drawing, RoundPhase::Question)
                | (RoundPhase::Question, RoundPhase::Question)
                | (RoundPhase::Question, RoundPhase::LockedIn)
                | (RoundPhase::Question, RoundPhase::Reveal)
                | (RoundPhase::LockedIn, RoundPhase::Reveal)
                | (RoundPhase::Reveal, RoundPhase::Drawing)
                | (RoundPhase::Reveal, RoundPhase::Scoring)
        )
    }

    /// Whether the phase allows the submission of another answer.
    ///
    /// WHY: the answer of a round is only accepted while the question
    /// stands; the rule makes the lock enforceable in the state machine.
    ///
    /// EXAMPLE: `RoundPhase::Question.accepts_answers()` is `true`,
    /// `RoundPhase::LockedIn.accepts_answers()` is `false`.
    pub const fn accepts_answers(self) -> bool {
        matches!(self, RoundPhase::Question)
    }

    /// Whether the phase shows the solution.
    ///
    /// WHY: the solution is the answer of the round; it is only visible in
    /// the reveal and in the scoring (docs/design/GAME-CONTRACT.md` § 3.2).
    ///
    /// EXAMPLE: `RoundPhase::Reveal.shows_solution()` is `true`.
    pub const fn shows_solution(self) -> bool {
        matches!(self, RoundPhase::Reveal | RoundPhase::Scoring)
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::RoundPhase;

    #[test]
    fn the_phase_identifiers_match_the_reference() {
        assert_eq!(RoundPhase::Drawing.as_str(), "drawing");
        assert_eq!(RoundPhase::Question.as_str(), "question");
        assert_eq!(RoundPhase::LockedIn.as_str(), "locked-in");
        assert_eq!(RoundPhase::Reveal.as_str(), "reveal");
        assert_eq!(RoundPhase::Scoring.as_str(), "scoring");
    }

    #[test]
    fn there_are_five_phases() {
        assert_eq!(RoundPhase::ALL.len(), 5);
    }

    #[test]
    fn the_normal_path_runs_through_the_locked_in_phase() {
        assert!(RoundPhase::Question.can_transition_to(RoundPhase::LockedIn));
        assert!(RoundPhase::LockedIn.can_transition_to(RoundPhase::Reveal));
    }

    #[test]
    fn the_scoring_phase_is_the_end() {
        assert!(!RoundPhase::Scoring.can_transition_to(RoundPhase::Drawing));
        assert!(!RoundPhase::Scoring.can_transition_to(RoundPhase::Question));
    }

    #[test]
    fn a_locked_round_accepts_no_further_answer() {
        assert!(RoundPhase::Question.accepts_answers());
        assert!(!RoundPhase::LockedIn.accepts_answers());
        assert!(!RoundPhase::Reveal.accepts_answers());
    }

    #[test]
    fn only_the_reveal_shows_the_solution() {
        assert!(!RoundPhase::Question.shows_solution());
        assert!(RoundPhase::Reveal.shows_solution());
    }

    #[test]
    fn every_phase_is_read_from_its_identifier() {
        for phase in RoundPhase::ALL {
            assert_eq!(RoundPhase::from_str(phase.as_str()), Some(*phase));
        }
    }

    #[test]
    fn an_unknown_identifier_is_no_phase() {
        assert_eq!(RoundPhase::from_str("locked in"), None);
        assert_eq!(RoundPhase::from_str(""), None);
    }
}
