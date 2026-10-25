//! The construction of the session of a vector.
//!
//! WHAT: the building of the session ([`build_session`]), the building of
//! its configuration ([`build_config`]) and the reading of the names of the
//! format ([`parse_phase`], [`parse_mode`], [`parse_source`]).
//!
//! WHY: the situation of a vector (`given`) is data, and the session of the
//! core is a state. The translation between the two is one concern of its
//! own: it is the place where a name of the vector format becomes a value of
//! the core, and a mistake here is a silent difference between the two
//! implementations (QA-09 backlog item 2.9).

use phomu_core::facade::{
    GameConfig, Player, RoundPhase, RoundState, Session, SessionState, SongSource, Team,
};

use crate::vector::{Given, Vector, VectorError};

/// Builds the session of a vector from its situation.
pub(crate) fn build_session(vector: &Vector) -> Result<Session, VectorError> {
    let given: &Given = &vector.given;
    let config = build_config(given)?;
    let players: Vec<Player> = given
        .players
        .iter()
        .map(|player| {
            let mut built = Player::new(player.id.clone(), player.name.clone());
            built.score = player.score;
            built.team_id = player.team_id.clone();
            built.is_eliminated = player.is_eliminated;
            built.is_spectator = player.is_spectator;
            built.is_pilot = player.is_pilot;
            built
        })
        .collect();
    let teams: Vec<Team> = given
        .teams
        .iter()
        .map(|team| Team {
            id: team.id.clone(),
            name: team.name.clone(),
            player_ids: team.player_ids.clone(),
            score: team.score,
            color: team.color.clone(),
        })
        .collect();

    let song = given.current_song.as_ref().and_then(|id| vector.song(id));
    // A song that is the current song has been drawn: the source is the
    // random draw and the song counts as played.
    let song_source = given
        .current_song_source
        .as_deref()
        .and_then(parse_source)
        .or_else(|| given.current_song.as_ref().map(|_| SongSource::Random));
    let mut played_song_ids = given.played_song_ids.clone();
    if let Some(song) = given.current_song.as_ref() {
        if !played_song_ids.contains(song) {
            played_song_ids.push(song.clone());
        }
    }
    let phase = given
        .round_phase
        .as_deref()
        .and_then(parse_phase)
        .unwrap_or(RoundPhase::Drawing);
    let mode = given
        .current_mode
        .as_deref()
        .and_then(parse_mode)
        .unwrap_or(phomu_core::facade::GameMode::Timeline);

    let state = SessionState {
        schema_version: phomu_core::facade::SCHEMA_VERSION,
        session_id: format!("vector-{}", vector.id),
        players,
        teams,
        turn_order: given.turn_order.clone(),
        current_turn_index: given.current_turn_index,
        config,
        current_round: given.current_round,
        round: RoundState {
            phase,
            song,
            mode,
            answers: Vec::new(),
            answers_locked: false,
            song_source,
            progress: Default::default(),
        },
        round_history: Vec::new(),
        played_song_ids,
        is_game_over: given.is_game_over,
        winner_id: given.winner_id.clone(),
        total_xp: given.total_xp,
        timeline_years: given.timeline_years.clone(),
        game_start_ms: given.game_start_time,
        seed: 0,
        rng_state: 0,
        artist_pool: Vec::new(),
        auto_draw_intent: given.auto_draw_intent,
    };
    Session::from_state(state, 0).map_err(|error| VectorError {
        id: vector.id.clone(),
        reason: error.to_string(),
    })
}

/// Builds the configuration of a vector.
pub(crate) fn build_config(given: &Given) -> Result<GameConfig, VectorError> {
    let partial = &given.config;
    let mut config = GameConfig::default();
    if !partial.selected_modes.is_empty() {
        let mut modes = Vec::new();
        for mode in &partial.selected_modes {
            let parsed = parse_mode(mode).ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the mode {mode} does not exist"),
            })?;
            modes.push(parsed);
        }
        config.selected_modes = modes;
    }
    if let Some(team_mode) = partial.team_mode.as_deref() {
        config.team_mode =
            phomu_core::facade::TeamMode::from_str(team_mode).ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the team mode {team_mode} does not exist"),
            })?;
    }
    if let Some(condition) = partial.ending_condition.as_deref() {
        config.ending_condition = phomu_core::facade::EndingCondition::from_str(condition)
            .ok_or_else(|| VectorError {
                id: "config".to_string(),
                reason: format!("the ending condition {condition} does not exist"),
            })?;
    }
    if let Some(points) = partial.target_points {
        config.target_points = points;
    }
    if let Some(rounds) = partial.target_rounds {
        config.target_rounds = rounds;
    }
    if let Some(minutes) = partial.target_time_minutes {
        config.target_time_minutes = minutes;
    }
    if let Some(enabled) = partial.time_decay_enabled {
        config.time_decay.enabled = enabled;
    }
    if let Some(seconds) = partial.time_decay_grace_seconds {
        config.time_decay.grace_seconds = seconds;
    }
    if let Some(seconds) = partial.time_decay_step_seconds {
        config.time_decay.step_seconds = seconds;
    }
    if let Some(points) = partial.time_decay_step_points {
        config.time_decay.step_points = points;
    }
    if let Some(points) = partial.min_points_per_correct {
        config.time_decay.min_points_per_correct = points;
    }
    if let Some(points) = partial.timeline_max_points {
        config.timeline_max_points = points;
    }
    if let Some(disabled) = partial.no_cheat_mode {
        config.no_cheat_mode = disabled;
    }
    Ok(config)
}

/// Reads a phase.
pub(crate) fn parse_phase(name: &str) -> Option<RoundPhase> {
    match name {
        "drawing" => Some(RoundPhase::Drawing),
        "question" => Some(RoundPhase::Question),
        "locked-in" => Some(RoundPhase::LockedIn),
        "reveal" => Some(RoundPhase::Reveal),
        "scoring" => Some(RoundPhase::Scoring),
        _ => None,
    }
}

/// Reads a mode.
pub(crate) fn parse_mode(name: &str) -> Option<phomu_core::facade::GameMode> {
    phomu_core::facade::GameMode::from_str(name)
}

/// Reads the source of a song.
pub(crate) fn parse_source(name: &str) -> Option<SongSource> {
    match name {
        "random" => Some(SongSource::Random),
        "qr" => Some(SongSource::Qr),
        _ => None,
    }
}
