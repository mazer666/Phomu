//! Mix-Tape rotates independent rounds; it never combines three answers.
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod common;
use common::{players, song};
use phomu_core::facade::{GameConfig, GameMode, ModeAnswer, RoundView, Session, SongSource};

#[test]
fn mix_tape_cycles_one_question_per_round_and_caps_awards_and_budget() {
    let config = GameConfig {
        selected_modes: vec![GameMode::MixTape],
        target_rounds: 20,
        ..GameConfig::default()
    };
    let mut session = Session::new(
        config,
        players(1),
        vec![],
        vec!["Other Artist".into()],
        42,
        0,
    )
    .unwrap();
    session.start_game(0).unwrap();
    let order = [
        GameMode::VibeCheck,
        GameMode::Survivor,
        GameMode::CoverConfusion,
    ];
    for expected in order.into_iter().cycle().take(9) {
        assert_eq!(session.state().round.mode, expected);
        let view = session
            .draw_song(
                song("song", "Hidden title", "Artist", 1985),
                SongSource::Random,
            )
            .unwrap();
        let RoundView::Question(question) = view else {
            panic!("expected a question")
        };
        assert_eq!(question.mode, expected);
        assert!(question.points_possible <= phomu_config::MIX_TAPE_MAX_POINTS);
        if expected != GameMode::VibeCheck {
            assert!(question.prompt.identity().is_none());
            assert!(!format!("{:?}", question.prompt).contains("Hidden title"));
        }
        let answer = match expected {
            GameMode::VibeCheck => ModeAnswer::VibeCheck {
                mood: "Chill".into(),
                cheat_used: false,
            },
            GameMode::Survivor => ModeAnswer::Survivor {
                guessed_one_hit: true,
            },
            _ => ModeAnswer::CoverConfusion {
                hints_used: 0,
                picked_artist: Some("Artist".into()),
                self_assess: None,
            },
        };
        let score = session.submit_answer(&answer, None).unwrap();
        assert!(score.is_correct);
        assert!(score.points_awarded <= phomu_config::MIX_TAPE_MAX_POINTS);
        session.reveal().unwrap();
        session.next_round(1).unwrap();
    }
}

#[test]
fn standalone_cover_confusion_keeps_its_original_scoring() {
    let config = GameConfig {
        selected_modes: vec![GameMode::CoverConfusion],
        ..GameConfig::default()
    };
    let mut session = Session::new(config, players(1), vec![], vec![], 1, 0).unwrap();
    session.start_game(0).unwrap();
    session
        .draw_song(song("s", "Title", "Artist", 1985), SongSource::Random)
        .unwrap();
    let score = session
        .submit_answer(
            &ModeAnswer::CoverConfusion {
                hints_used: 0,
                picked_artist: Some("Artist".into()),
                self_assess: None,
            },
            None,
        )
        .unwrap();
    assert_eq!(
        score.points_awarded,
        phomu_core::facade::evaluate_mode_answer(
            GameMode::CoverConfusion,
            &ModeAnswer::CoverConfusion {
                hints_used: 0,
                picked_artist: Some("Artist".into()),
                self_assess: None
            },
            &song("s", "Title", "Artist", 1985),
            &phomu_core::facade::ModeContext::new(&[], 5)
        )
        .unwrap()
        .points
    );
}
