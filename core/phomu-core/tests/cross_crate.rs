//! The consistency between the crates of the base.
//!
//! WHY: the base is split into seven crates. A value that exists in two of
//! them can drift apart, and a drifted value is a wrong score on one
//! platform. The relations between the crates are therefore checked by
//! tests, not by review.

// WHY the two lints below: a test that fails has to stop with a readable
// message. `expect` and `unwrap` are the idiomatic way to do that in a
// test; the ban of the workspace lints applies to the production code, not
// to the tests that prove it.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use phomu_core::facade::{ErrorCode, GameMode, MessageKey};

#[test]
fn every_error_code_belongs_to_the_closed_key_space() {
    for code in ErrorCode::ALL {
        let key = code.message_key();
        assert!(
            MessageKey::from_key(key).is_some(),
            "the error code {code:?} names the unknown key {key}"
        );
    }
}

#[test]
fn every_error_key_is_used_by_an_error_code() {
    for key in MessageKey::ALL {
        let name = key.as_str();
        if !name.starts_with("errors.") {
            continue;
        }
        let used = ErrorCode::ALL.iter().any(|code| code.message_key() == name);
        assert!(used, "the key {name} belongs to no error code");
    }
}

#[test]
fn the_mode_identifiers_match_the_catalogue() {
    for mode in GameMode::ALL {
        let name = mode.as_str();
        assert!(
            phomu_catalog::known_supported_mode(name),
            "the mode {name} is unknown to the catalogue"
        );
    }
}

#[test]
fn the_catalogue_knows_exactly_the_six_modes() {
    assert_eq!(
        phomu_catalog::KNOWN_SUPPORTED_MODES.len(),
        GameMode::ALL.len()
    );
    for name in phomu_catalog::KNOWN_SUPPORTED_MODES {
        assert!(
            GameMode::from_str(name).is_some(),
            "the catalogue knows the mode {name} that the core does not"
        );
    }
}

#[test]
fn every_game_event_has_a_key() {
    for event in phomu_i18n::GameEvent::ALL {
        let key = phomu_i18n::message_key(*event);
        assert!(MessageKey::ALL.contains(&key));
    }
}

#[test]
fn the_base_carries_no_text_but_only_keys() {
    // Every key of the space is an identifier: dot-separated, camelCase,
    // without a placeholder. A sentence would contain a space.
    for key in MessageKey::ALL {
        let name = key.as_str();
        assert!(!name.contains(' '), "the key {name} contains a space");
        assert!(!name.contains('"'), "the key {name} contains a quote");
    }
}

#[test]
fn the_config_holds_the_values_the_rules_expect() {
    assert_eq!(phomu_config::HINT_MASTER_POINTS, [5, 4, 3, 2, 1]);
    assert_eq!(phomu_config::COVER_CONFUSION_POINTS_BY_HINTS, [5, 4, 3, 2]);
    assert_eq!(phomu_config::LYRICS_POINTS, 4);
    assert_eq!(phomu_config::SURVIVOR_POINTS, 3);
    assert_eq!(phomu_config::VIBE_CHECK_POINTS, 2);
    assert_eq!(phomu_config::MAX_PLAYERS, 24);
}
