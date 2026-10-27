//! The escape out of every phase of the round.
//!
//! WHY: a round that nobody answered — because the round timed out, because
//! a player left the table or because a card was mis-scanned — has to be
//! closable. Before the remediation of QA-RST-002 the phase `question` was a
//! dead end: the reveal refused it, the round could not be closed and the
//! phase could not be moved, and no bridge exported the one command that
//! could escape (`docs/qa/QA-11-RUST-BASE.md`).
//!
//! The tests of this file are the machine check of that promise:
//!
//! * `the_probe_of_an_unanswered_round` replays the case of the audit and
//!   prints the same evidence — the probe is the reproduction of the defect.
//! * `no_phase_of_the_table_is_a_dead_end` walks the **whole** transition
//!   table and proves that every phase can reach a phase in which the round
//!   can be closed.
//! * `every_edge_of_the_table_is_reachable_by_a_command` proves that the
//!   table does not promise an edge that no command of the session can take.
//!
//! WHY the escape is proved over the *commands* and not over the table: a
//! phase that the table can leave but that no command can leave is a dead
//! end — the table alone would not have caught the defect.

// WHY the three lints below: a test that fails has to stop with a readable
// message. `expect`, `unwrap` and `panic` are the idiomatic way to do that
// in a test; the ban of the workspace lints applies to the production code,
// not to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

mod common;

use std::collections::BTreeSet;

use common::{artist_pool, players, song};
use phomu_core::facade::{
    DeviceMode, GameConfig, GameMode, ModeAnswer, PhomuError, RoundPhase, Session, SongSource,
};

/// The moment of the round.
const NOW: u64 = 1_000;

/// The number of players of the round.
const PLAYERS: usize = 3;

/// A session of the Timeline mode in which every player answers.
fn session_in(phase: RoundPhase) -> Session {
    let config = GameConfig {
        selected_modes: vec![GameMode::Timeline],
        device_mode: DeviceMode::MultiDevice,
        ..GameConfig::default()
    };
    let mut session = Session::new(config, players(PLAYERS), Vec::new(), artist_pool(), 42, NOW)
        .expect("a session is created");
    session.start_game(NOW).expect("the game starts");
    match phase {
        RoundPhase::Drawing => {}
        RoundPhase::Question => {
            session
                .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
                .expect("the song is drawn");
        }
        RoundPhase::LockedIn => {
            session
                .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
                .expect("the song is drawn");
            for _ in 0..PLAYERS {
                session
                    .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
                    .expect("the answer is accepted");
            }
        }
        RoundPhase::Reveal => {
            session
                .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
                .expect("the song is drawn");
            session
                .force_reveal()
                .expect("the timeout reveals the round");
        }
        RoundPhase::Scoring => {
            session.end_game(None).expect("the game ends");
        }
    }
    assert_eq!(session.phase(), phase, "the session is in the wanted phase");
    session
}

/// The failure of a command, as the probe of the audit prints it.
fn describe(failure: &PhomuError) -> String {
    let context = failure
        .context()
        .iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<String>>()
        .join(" ");
    if context.is_empty() {
        format!("{} ({})", failure.message_key(), failure.code().code())
    } else {
        format!(
            "{} ({}) {context}",
            failure.message_key(),
            failure.code().code()
        )
    }
}

/// The commands of the session that move a round on.
///
/// WHY the list: it is the set of the commands a shell may send. The
/// invariant is proved over these commands, because the defect of QA-RST-002
/// was a command that the table permitted and that no bridge could send.
fn successors(session: &Session) -> Vec<(&'static str, RoundPhase)> {
    let mut found: Vec<(&'static str, RoundPhase)> = Vec::new();

    // The draw opens the question phase.
    let mut probe = session.clone();
    if probe
        .draw_song(song("s2", "Titel", "Künstler", 1990), SongSource::Random)
        .is_ok()
    {
        found.push(("draw_song", probe.phase()));
    }

    // The answers lock the round in — the command is sent until the round
    // is locked or until it is refused.
    let mut probe = session.clone();
    for _ in 0..=PLAYERS {
        if probe
            .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
            .is_err()
        {
            break;
        }
        found.push(("submit_answer", probe.phase()));
    }

    // The remaining commands move the round on one phase at a time.
    let mut probe = session.clone();
    if probe.lock_answers().is_ok() {
        found.push(("lock_answers", probe.phase()));
    }
    let mut probe = session.clone();
    if probe.force_reveal().is_ok() {
        found.push(("force_reveal", probe.phase()));
    }
    let mut probe = session.clone();
    if probe.reveal().is_ok() {
        found.push(("reveal", probe.phase()));
    }
    let mut probe = session.clone();
    if probe.skip_broken_song().is_ok() {
        found.push(("skip_broken_song", probe.phase()));
    }
    let mut probe = session.clone();
    if probe.next_round(NOW).is_ok() {
        found.push(("next_round", probe.phase()));
    }
    for target in RoundPhase::ALL {
        let mut probe = session.clone();
        if probe.advance_phase(*target).is_ok() {
            found.push(("advance_phase", probe.phase()));
        }
    }
    found
}

/// The phases that are reachable from a phase.
fn reachable_from(phase: RoundPhase) -> BTreeSet<RoundPhase> {
    let mut seen: BTreeSet<RoundPhase> = BTreeSet::new();
    let mut open: Vec<RoundPhase> = vec![phase];
    seen.insert(phase);
    while let Some(current) = open.pop() {
        for (_, next) in successors(&session_in(current)) {
            if seen.insert(next) {
                open.push(next);
            }
        }
    }
    seen
}

#[test]
fn the_probe_of_an_unanswered_round() {
    // The case of the audit: three players, one answer. The round is in the
    // phase `question` and the answers are not locked in.
    let config = GameConfig {
        selected_modes: vec![GameMode::Timeline],
        device_mode: DeviceMode::MultiDevice,
        ..GameConfig::default()
    };
    let mut session = Session::new(config, players(PLAYERS), Vec::new(), artist_pool(), 42, NOW)
        .expect("a session is created");
    session.start_game(NOW).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert_eq!(session.phase(), RoundPhase::Question);

    println!("PROBE phase after one answer: {}", session.phase().as_str());
    // The three refusals are probed on a copy of the session, so that the
    // probe does not change the state it measures.
    let mut probe = session.clone();
    println!(
        "PROBE reveal() -> {:?}",
        probe.reveal().err().map(|failure| describe(&failure))
    );
    let mut probe = session.clone();
    println!(
        "PROBE next_round() -> {:?}",
        probe
            .next_round(NOW)
            .err()
            .map(|failure| describe(&failure))
    );
    let mut probe = session.clone();
    println!(
        "PROBE advance_phase(reveal) -> {:?}",
        probe
            .advance_phase(RoundPhase::Reveal)
            .err()
            .map(|failure| describe(&failure))
    );

    // The guarantee of the anti-spoiler promise holds: the reveal of a
    // round whose answers are not locked in is refused.
    let mut probe = session.clone();
    assert_eq!(
        probe
            .reveal()
            .expect_err("the answers are not locked in")
            .code(),
        phomu_core::facade::ErrorCode::AnswersNotLocked
    );
    // The round cannot be closed before the reveal.
    let mut probe = session.clone();
    assert_eq!(
        probe
            .next_round(NOW)
            .expect_err("the round is not in a phase that can be closed")
            .code(),
        phomu_core::facade::ErrorCode::NotAvailableInPhase
    );

    println!(
        "PROBE force_reveal() -> {:?}",
        session
            .force_reveal()
            .err()
            .map(|failure| describe(&failure))
    );
    println!(
        "PROBE phase after force_reveal: {}",
        session.phase().as_str()
    );
    // The timeout closes the round: the phase is `reveal` and the round can
    // be closed afterwards.
    assert_eq!(session.phase(), RoundPhase::Reveal);
    assert!(
        session.state().round.answers_locked,
        "the round is locked, so that no answer can still arrive"
    );
    session
        .next_round(NOW)
        .expect("the round is closed after the timeout");
    assert_eq!(session.phase(), RoundPhase::Drawing);
}

#[test]
fn no_phase_of_the_table_is_a_dead_end() {
    for phase in RoundPhase::ALL {
        if *phase == RoundPhase::Scoring {
            // The phase `scoring` is the end of the game, not a dead end.
            continue;
        }
        let reachable = reachable_from(*phase);
        assert!(
            reachable.contains(&RoundPhase::Reveal) || reachable.contains(&RoundPhase::Drawing),
            "the phase {} is a dead end: it reaches {reachable:?} and neither the \
             phase `reveal` nor the phase `drawing`, and the round can therefore \
             not be closed",
            phase.as_str()
        );
    }
}

#[test]
fn the_round_can_be_closed_from_every_phase_that_ends_it() {
    for phase in [RoundPhase::Reveal, RoundPhase::Drawing] {
        let mut session = session_in(phase);
        session.next_round(NOW).unwrap_or_else(|failure| {
            panic!("the round is closed from {}: {failure}", phase.as_str())
        });
    }
}

#[test]
fn every_edge_of_the_table_is_reachable_by_a_command() {
    for from in RoundPhase::ALL {
        for to in RoundPhase::ALL {
            if !from.can_transition_to(*to) {
                continue;
            }
            let reachable: Vec<&'static str> = successors(&session_in(*from))
                .into_iter()
                .filter(|(_, phase)| phase == to)
                .map(|(name, _)| name)
                .collect();
            assert!(
                !reachable.is_empty(),
                "the transition table promises the edge {} -> {}, but no command of \
                 the session takes it",
                from.as_str(),
                to.as_str()
            );
        }
    }
}
