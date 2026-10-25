//! The commands of the session that the lobby and the power user need.
//!
//! WHY: the reference implementation spreads these commands over the store
//! (`src/stores/game-store.ts`). The base owns them, therefore the rules
//! have to be proven here: the tests name the line of the reference
//! implementation they port.

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` is the idiomatic way to do that in a test; the ban of
// the workspace lints applies to the production code, not to the tests that
// prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

mod common;

use common::{artist_pool, players, song, teams};
use phomu_core::facade::{
    ErrorCode, GameConfig, GameMode, ModeAnswer, Session, SongSource, TeamMode,
};

fn session_with(config: GameConfig) -> Session {
    Session::new(config, players(2), Vec::new(), artist_pool(), 11, 1_000)
        .expect("a session is created")
}

#[test]
fn the_reset_clears_the_scores_and_keeps_the_experience_points() {
    // WHY: the reference implementation clears the scores, the round
    // history, the played songs and the timeline, but keeps the experience
    // points and the configuration (`src/stores/game-store.ts:479-493`).
    let mut session = session_with(GameConfig::default());
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    session.reveal().expect("the reveal is permitted");
    session.next_round(2_000).expect("the round is closed");
    session.end_game(None).expect("the game ends");

    let before = session.state().total_xp;
    assert!(before > 0, "the game has awarded experience points");

    session.reset_scores();

    assert!(
        session
            .state()
            .players
            .iter()
            .all(|player| player.score == 0),
        "the scores are cleared"
    );
    assert!(session.state().round_history.is_empty());
    assert!(session.state().played_song_ids.is_empty());
    assert!(session.state().timeline_years.is_empty());
    assert!(!session.state().is_game_over);
    assert_eq!(
        session.state().total_xp,
        before,
        "the experience points stay"
    );
}

#[test]
fn the_end_of_the_game_awards_the_sum_of_the_player_scores() {
    // WHY: the experience points of the session are the sum of the scores
    // of the players (`src/stores/game-store.ts:380-383`).
    let mut session = session_with(GameConfig::default());
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");

    let expected: i64 = session
        .state()
        .players
        .iter()
        .map(|player| player.score)
        .sum();
    session.end_game(None).expect("the game ends");

    assert_eq!(session.state().total_xp, expected);
    assert!(session.state().is_game_over);
    assert_eq!(session.phase().as_str(), "scoring");
}

#[test]
fn a_player_who_joins_a_team_leaves_the_old_one() {
    // WHY: the membership of the team and the team of the player have to
    // stay in sync, otherwise the points flow to the wrong team
    // (`src/stores/game-store.ts:572-592`).
    let mut session = Session::new(
        GameConfig::default(),
        players(2),
        teams(2),
        artist_pool(),
        11,
        1_000,
    )
    .expect("a session is created");
    session
        .assign_player_to_team("p0", Some("t0"))
        .expect("the player joins the first team");
    session
        .assign_player_to_team("p1", Some("t0"))
        .expect("the player joins the first team");
    session
        .assign_player_to_team("p0", Some("t1"))
        .expect("the player changes the team");

    let first = session.state().teams.first();
    let second = session.state().teams.get(1);
    assert_eq!(
        first.map(|team| team.player_ids.clone()),
        Some(vec!["p1".to_string()])
    );
    assert_eq!(
        second.map(|team| team.player_ids.clone()),
        Some(vec!["p0".to_string()])
    );
    assert_eq!(
        session
            .state()
            .players
            .iter()
            .find(|player| player.id == "p0")
            .and_then(|player| player.team_id.clone()),
        Some("t1".to_string())
    );
}

#[test]
fn a_removed_team_leaves_its_players_without_a_team() {
    // WHY: a player without a team plays for themselves
    // (`src/stores/game-store.ts:562-570`).
    let mut session = Session::new(
        GameConfig::default(),
        players(1),
        teams(1),
        artist_pool(),
        11,
        1_000,
    )
    .expect("a session is created");
    session
        .assign_player_to_team("p0", Some("t0"))
        .expect("the player joins the team");
    session.remove_team("t0").expect("the team is removed");

    assert!(session.state().teams.is_empty());
    assert!(
        session
            .state()
            .players
            .iter()
            .all(|player| player.team_id.is_none())
    );
}

#[test]
fn the_credit_of_points_to_an_unknown_entity_is_refused() {
    // WHY: the reference implementation ignores the operation silently
    // (`src/stores/game-store.ts:462-463`); the core is stricter and
    // returns a typed error (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-111).
    let mut session = session_with(GameConfig::default());
    let error = session
        .award_points("does-not-exist", 4)
        .expect_err("the entity is unknown");
    assert_eq!(error.code(), ErrorCode::UnknownPlayer);
}

#[test]
fn the_redistribution_of_the_shifting_teams_recomputes_the_team_scores() {
    // WHY: the reference implementation leaves the team scores untouched
    // (`docs/design/GAME-CONTRACT.md` § 6.2, deviation A8); the core
    // recomputes them, so that the team score stays the sum of the points
    // of its members (GAME-007).
    let config = GameConfig {
        team_mode: TeamMode::Shifting,
        ..GameConfig::default()
    };
    let mut session = Session::new(config, players(3), teams(2), artist_pool(), 11, 1_000)
        .expect("a session is created");
    session
        .award_points("p0", 5)
        .expect("the first player has five points");
    session
        .award_points("p1", 7)
        .expect("the second player has seven points");
    session.start_game(1_000).expect("the game starts");
    session
        .draw_song(song("s1", "Titel", "Künstler", 1985), SongSource::Random)
        .expect("the song is drawn");
    session
        .submit_answer(&ModeAnswer::Timeline { slot: 0 }, None)
        .expect("the answer is accepted");
    session.reveal().expect("the reveal is permitted");
    session.next_round(2_000).expect("the round is closed");

    let sum: i64 = session.state().teams.iter().map(|team| team.score).sum();
    let member_sum: i64 = session
        .state()
        .teams
        .iter()
        .flat_map(|team| team.player_ids.clone())
        .filter_map(|id| {
            session
                .state()
                .players
                .iter()
                .find(|player| player.id == id)
                .map(|player| player.score)
        })
        .sum();
    assert_eq!(sum, member_sum, "the team scores are the member scores");
}

#[test]
fn the_turn_order_of_the_team_modes_names_the_teams() {
    // WHY: in the individual mode the order contains the player
    // identifiers, in the team modes the team identifiers
    // (`src/stores/game-store.ts:258-261`).
    let config = GameConfig {
        team_mode: TeamMode::Fixed,
        selected_modes: vec![GameMode::Timeline],
        ..GameConfig::default()
    };
    let mut session = Session::new(config, players(2), teams(2), artist_pool(), 11, 1_000)
        .expect("a session is created");
    session.start_game(1_000).expect("the game starts");
    assert_eq!(
        session.snapshot().turn_order,
        vec!["t0".to_string(), "t1".to_string()]
    );
    assert_eq!(session.active_turn_id(), Some("t0"));
}
