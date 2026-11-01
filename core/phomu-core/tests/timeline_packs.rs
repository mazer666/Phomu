//! The starting cards must belong to the packs the party actually selected.
#![allow(clippy::unwrap_used, clippy::expect_used)]
mod common;
use common::{players, song};
use phomu_core::facade::{GameConfig, GameMode, Session};

fn session(packs: &[&str]) -> Session {
    let config = GameConfig {
        selected_modes: vec![GameMode::Timeline],
        selected_packs: packs.iter().map(|s| s.to_string()).collect(),
        ..GameConfig::default()
    };
    Session::new(config, players(1), vec![], vec![], 42, 0).unwrap()
}
fn catalogue() -> Vec<phomu_core::facade::Song> {
    [1700, 1800, 1850, 1975, 1988, 2001, 2020]
        .into_iter()
        .map(|year| {
            let mut song = song(&year.to_string(), "Title", "Artist", year);
            song.packs = vec![if year < 1900 { "Classical" } else { "Pop" }.into()];
            song
        })
        .collect()
}
#[test]
fn pop_does_not_receive_classical_centuries() {
    let mut game = session(&["Pop"]);
    game.prepare_timeline(&catalogue()).unwrap();
    assert_eq!(game.state().timeline_years.len(), 3);
    assert!(game.state().timeline_years.iter().all(|year| *year >= 1975));
}
#[test]
fn classical_selection_uses_its_own_years() {
    let mut game = session(&["Classical"]);
    game.prepare_timeline(&catalogue()).unwrap();
    assert_eq!(game.state().timeline_years, vec![1700, 1800, 1850]);
}
#[test]
fn combined_packs_and_empty_filter_use_only_catalogue_years() {
    for packs in [vec!["Classical", "Pop"], vec![]] {
        let mut game = session(&packs);
        game.prepare_timeline(&catalogue()).unwrap();
        assert!(
            game.state()
                .timeline_years
                .iter()
                .all(|year| catalogue().iter().any(|song| song.year == *year))
        );
    }
}
#[test]
fn unknown_pack_fails_instead_of_falling_back_to_unrelated_years() {
    let mut game = session(&["Missing"]);
    assert!(game.prepare_timeline(&catalogue()).is_err());
    assert!(game.state().timeline_years.is_empty());
}
#[test]
fn existing_timeline_survives_subsequent_preparation() {
    let mut game = session(&["Pop"]);
    game.init_timeline(vec![1980, 1990, 2000]).unwrap();
    game.prepare_timeline(&catalogue()).unwrap();
    assert_eq!(game.state().timeline_years, vec![1980, 1990, 2000]);
}
#[test]
fn tiny_pack_uses_adjacent_years_and_never_an_unrelated_century() {
    let mut game = session(&["Pop"]);
    let only = song("one", "Title", "Artist", 2000);
    let mut only = only;
    only.packs = vec!["Pop".into()];
    game.prepare_timeline(&[only]).unwrap();
    assert_eq!(game.state().timeline_years, vec![2000, 2001, 2002]);
}

#[test]
fn legacy_pack_aliases_are_normalized_before_choosing_years() {
    let mut game = session(&["global-hits"]);
    let songs = [1970, 1980, 1990].map(|year| song("song", "Title", "Artist", year));
    game.prepare_timeline(&songs).unwrap();
    assert_eq!(game.state().timeline_years, vec![1970, 1980, 1990]);
}
