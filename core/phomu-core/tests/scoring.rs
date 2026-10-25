//! The scoring: the time decay, the team flow and the boundaries of the
//! points.
//!
//! WHY: the points are the part of the product a group of friends argues
//! about. They must not depend on the platform (CORE-107), and they must
//! never become negative (GAME-006).

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` and `unwrap` are the idiomatic way to do that in a
// test; the ban of the workspace lints applies to the production code, not
// to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

mod common;

use common::{artist_pool, players, song};
use phomu_core::facade::{
    Cheat, ErrorCode, GameConfig, GameMode, ModeAnswer, Session, SongSource, TeamMode,
    TimeDecayConfig,
};

fn session_with(config: GameConfig) -> Session {
    Session::new(config, players(2), Vec::new(), artist_pool(), 11, 1_000)
        .expect("a session is created")
}

fn timeline_config() -> GameConfig {
    GameConfig {
        selected_modes: vec![GameMode::Timeline],
        ..GameConfig::default()
    }
}

#[test]
fn a_correct_answer_raises_the_score_of_the_pilot() {
    let mut session = session_with(timeline_config());
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let score = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert!(score.is_correct);
    assert!(score.points_awarded > 0);
    assert_eq!(score.player_score, i64::from(score.points_awarded));
}

#[test]
fn a_wrong_answer_does_not_change_the_score() {
    let mut session = session_with(timeline_config());
    session
        .init_timeline(vec![1970, 1980, 1990])
        .expect("the timeline starts");
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let score = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert!(!score.is_correct);
    assert_eq!(score.points_awarded, 0);
    assert_eq!(score.player_score, 0);
}

#[test]
fn the_time_decay_lowers_the_points_of_a_late_answer() {
    let config = GameConfig {
        time_decay: TimeDecayConfig {
            enabled: true,
            grace_seconds: 5,
            step_seconds: 5,
            step_points: 1,
            min_points_per_correct: 1,
        },
        ..timeline_config()
    };
    let mut session = session_with(config);
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let fast = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, Some(5))
        .expect("the answer is accepted");
    assert_eq!(fast.points_awarded, 1);

    session.skip_broken_song().expect("the song is skipped");
    session
        .draw_song(song("s2", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let slow = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, Some(600))
        .expect("the answer is accepted");
    assert_eq!(
        slow.points_awarded, 1,
        "the decay never falls below the minimum"
    );
}

#[test]
fn the_time_decay_does_not_apply_without_a_time() {
    let config = GameConfig {
        time_decay: TimeDecayConfig {
            enabled: true,
            ..TimeDecayConfig::default()
        },
        ..timeline_config()
    };
    let mut session = session_with(config);
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let score = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert_eq!(score.points_awarded, 1, "the decay needs an answer time");
}

#[test]
fn a_cheat_costs_points_and_never_pushes_the_score_below_zero() {
    let mut session = session_with(timeline_config());
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let penalty = session
        .use_cheat(Cheat::TimelineDecadeHint)
        .expect("the cheat is allowed");
    assert_eq!(penalty, -2);
    assert_eq!(
        session
            .snapshot()
            .players
            .first()
            .map(|player| player.score),
        Some(0),
        "the score is clamped at zero"
    );
}

#[test]
fn the_cheat_is_refused_in_the_mode_without_cheats() {
    let config = GameConfig {
        no_cheat_mode: true,
        ..timeline_config()
    };
    let mut session = session_with(config);
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let error = session
        .use_cheat(Cheat::TimelineDecadeHint)
        .expect_err("the cheat is disabled");
    assert_eq!(error.code(), ErrorCode::ModeNotEnabled);
}

#[test]
fn a_cheat_can_be_used_only_once_per_round() {
    let mut session = session_with(timeline_config());
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .use_cheat(Cheat::TimelineDecadeHint)
        .expect("the cheat is allowed");
    let error = session
        .use_cheat(Cheat::TimelineDecadeHint)
        .expect_err("the cheat is used up");
    assert_eq!(error.code(), ErrorCode::InvalidTransition);
}

#[test]
fn the_points_flow_to_the_team_of_the_player() {
    let config = GameConfig {
        team_mode: TeamMode::Fixed,
        ..timeline_config()
    };
    let mut session = Session::new(
        config,
        players(2),
        common::teams(1),
        artist_pool(),
        11,
        1_000,
    )
    .expect("a session is created");
    session
        .assign_player_to_team("p0", Some("t0"))
        .expect("the player joins the team");
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    let score = session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    assert!(score.points_awarded > 0);
    assert_eq!(score.team_id.as_deref(), Some("t0"));
    assert_eq!(score.team_score, Some(i64::from(score.points_awarded)));
}

#[test]
fn the_timeline_grows_with_a_correct_answer() {
    let mut session = session_with(timeline_config());
    session
        .init_timeline(vec![1970, 1980, 1990])
        .expect("the timeline starts");
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 2 }, None)
        .expect("the answer is accepted");
    let years = session.snapshot().timeline_years;
    assert_eq!(years.len(), 4, "the year of the song is added");
    assert!(years.contains(&1985));
}

#[test]
fn a_duplicate_year_is_removed_again_immediately() {
    let mut session = session_with(timeline_config());
    session
        .init_timeline(vec![1970, 1980, 1990])
        .expect("the timeline starts");
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1980), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 1 }, None)
        .expect("the answer is accepted");
    let years = session.snapshot().timeline_years;
    assert_eq!(years.len(), 3, "a duplicate does not grow the timeline");
}

#[test]
fn the_timeline_needs_three_distinct_years() {
    let mut session = session_with(timeline_config());
    let error = session
        .init_timeline(vec![1970, 1980])
        .expect_err("three years are required");
    assert_eq!(error.code(), ErrorCode::InvalidAnswer);
    let error = session
        .init_timeline(vec![1970, 1970, 1980])
        .expect_err("the years have to be distinct");
    assert_eq!(error.code(), ErrorCode::InvalidAnswer);
}
