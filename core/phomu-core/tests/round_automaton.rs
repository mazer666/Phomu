//! The round automaton: the phases, the transitions and the guarantee that
//! the reveal only happens after the answers are locked in.
//!
//! WHY: the phase automaton is the backbone of the game (GAME-001) and the
//! anti-spoiler promise depends on it (GAME-002, CORE-006).

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` and `unwrap` are the idiomatic way to do that in a
// test; the ban of the workspace lints applies to the production code, not
// to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

mod common;

use common::{artist_pool, players, song};
use phomu_core::facade::{
    ErrorCode, GameConfig, GameMode, ModeAnswer, RoundPhase, RoundView, Session, SongSource,
};

fn session_with_modes(modes: Vec<GameMode>) -> Session {
    let config = GameConfig {
        selected_modes: modes,
        ..GameConfig::default()
    };
    Session::new(config, players(2), Vec::new(), artist_pool(), 42, 1_000)
        .expect("a session is created")
}

fn timeline_session() -> Session {
    session_with_modes(vec![GameMode::Timeline])
}

#[test]
fn a_new_session_is_in_the_drawing_phase() {
    let session = timeline_session();
    assert_eq!(session.phase(), RoundPhase::Drawing);
}

#[test]
fn the_game_cannot_start_without_players() {
    let mut session = Session::new(
        GameConfig::default(),
        Vec::new(),
        Vec::new(),
        artist_pool(),
        1,
        0,
    )
    .expect("a session is created");
    let error = session.start_game(0).expect_err("the game needs players");
    assert_eq!(error.code(), ErrorCode::InvalidPlayerCount);
}

#[test]
fn the_game_starts_in_the_drawing_phase() {
    let mut session = timeline_session();
    let view = session.start_game(1_000).expect("the game starts");
    assert!(matches!(view, RoundView::Drawing(_)));
    assert_eq!(session.phase(), RoundPhase::Drawing);
    assert_eq!(session.state().current_round, 1);
}

#[test]
fn drawing_a_song_opens_the_question_phase() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    let view = session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    assert!(matches!(view, RoundView::Question(_)));
    assert_eq!(session.phase(), RoundPhase::Question);
}

#[test]
fn a_song_cannot_be_drawn_twice() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let error = session
        .draw_song(song("s2", "Titel", "Künstler", 1985), SongSource::Random)
        .expect_err("the phase does not allow a second draw");
    assert_eq!(error.code(), ErrorCode::InvalidTransition);
}

#[test]
fn the_reveal_is_refused_before_the_answers_are_locked_in() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let error = session.reveal().expect_err("the answers are not locked in");
    assert_eq!(error.code(), ErrorCode::AnswersNotLocked);
    assert_eq!(session.phase(), RoundPhase::Question);
}

#[test]
fn the_reveal_lock_refuses_the_transition_of_the_question_phase() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let error = session
        .advance_phase(RoundPhase::Reveal)
        .expect_err("the answers of the round are not locked in");
    assert_eq!(error.code(), ErrorCode::AnswersNotLocked);
    assert_eq!(
        session.phase(),
        RoundPhase::Question,
        "the phase does not change when the transition is refused"
    );
}

#[test]
fn the_timeout_is_a_command_of_its_own() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .force_reveal()
        .expect("the timeout ends the question round");
    assert_eq!(session.phase(), RoundPhase::Reveal);
    assert!(
        session.state().round.answers_locked,
        "the round is locked, so that no answer can still arrive"
    );
}

#[test]
fn a_round_that_ended_accepts_no_further_answer() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .force_reveal()
        .expect("the timeout ends the question round");
    let error = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect_err("the round is over");
    assert_eq!(error.code(), ErrorCode::NotAvailableInPhase);
}

#[test]
fn the_answer_locks_the_round_in() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert_eq!(session.phase(), RoundPhase::LockedIn);
    assert!(session.state().round.answers_locked);
}

#[test]
fn the_reveal_after_the_lock_shows_the_solution() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    let view = session.reveal().expect("the reveal is permitted");
    assert!(matches!(view, RoundView::Reveal(_)));
    assert_eq!(session.phase(), RoundPhase::Reveal);
}

#[test]
fn a_locked_round_accepts_no_second_answer() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    let error = session
        .submit_answer(&ModeAnswer::Timeline { slot: 1 }, None)
        .expect_err("the round is locked");
    assert_eq!(error.code(), ErrorCode::NotAvailableInPhase);
}

#[test]
fn the_timeout_reveals_the_round_without_a_score() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let view = session
        .force_reveal()
        .expect("the timeout reveals the round");
    assert!(matches!(view, RoundView::Reveal(_)));
    assert_eq!(
        session
            .snapshot()
            .players
            .iter()
            .map(|p| p.score)
            .sum::<i64>(),
        0,
        "a round that timed out is not scored"
    );
}

#[test]
fn the_next_round_logs_the_round_and_starts_a_new_one() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    session.reveal().expect("the reveal is permitted");
    session.next_round(2_000).expect("the round is closed");
    assert_eq!(session.state().round_history.len(), 1);
    assert_eq!(session.state().current_round, 2);
    assert_eq!(session.phase(), RoundPhase::Drawing);
}

#[test]
fn a_round_without_a_song_is_not_logged() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session.next_round(2_000).expect("the round is closed");
    assert!(session.state().round_history.is_empty());
}

#[test]
fn the_turn_moves_to_the_next_player() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    let first = session.active_turn_id().map(str::to_string);
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    session.reveal().expect("the reveal is permitted");
    session.next_round(2_000).expect("the round is closed");
    let second = session.active_turn_id().map(str::to_string);
    assert_ne!(first, second);
}

#[test]
fn a_broken_song_goes_back_to_the_drawing_phase() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let view = session.skip_broken_song().expect("the song is skipped");
    assert!(matches!(view, RoundView::Drawing(_)));
    assert_eq!(session.phase(), RoundPhase::Drawing);
    assert!(session.state().round.song.is_none());
}

#[test]
fn a_scanned_card_is_not_drawn_automatically() {
    let mut session = timeline_session();
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Qr)
        .expect("the song is drawn");
    let view = session.skip_broken_song().expect("the song is skipped");
    assert!(
        matches!(view, RoundView::Drawing(drawing) if !drawing.auto_draw),
        "a scanned card is not drawn automatically"
    );
}
