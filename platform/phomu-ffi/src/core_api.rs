//! The adapter between the wire model of the bridge and the base.
//!
//! WHAT: the conversion from the records of [`crate::dto`] into the types of
//! the base and back.
//!
//! WHY the conversion lives here and nowhere else: the base is a pure Rust
//! library and does not know the generator of the bindings; the bridge is
//! the place where the two meet. One module means one place to look when
//! the facade changes.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::core_api::to_core_config;
//! use phomu_ffi::dto::PhomuGameConfig;
//!
//! let config = PhomuGameConfig::default();
//! assert!(to_core_config(&config).is_ok());
//! ```

use phomu_core::facade::{AiQueueStrategy, EliminationRule, TeamMode};
use phomu_core::facade::{
    DeviceMode, Difficulty, DifficultyFilter, EndingCondition, GameConfig, GameMode,
    HintReleasePolicy, MusicProvider, OverrideGovernance, Player, ScoreSnapshot, SessionSnapshot,
    Team, TimeDecayConfig,
};
use phomu_errors::ErrorCode;

use crate::error::{PhomuError, failure};

use crate::dto::{
    PhomuGameConfig, PhomuPlayer, PhomuPlayerScore, PhomuScoreSnapshot, PhomuSessionSnapshot,
    PhomuTeam, PhomuTeamScore,
};
use crate::view::PhomuRoundView;

/// The failure of an unknown identifier in the configuration.
fn invalid_configuration(field: &str, value: &str) -> PhomuError {
    failure(
        ErrorCode::InvalidConfiguration,
        &[("field", field), ("value", value)],
    )
}

impl Default for PhomuGameConfig {
    /// The default configuration of a session.
    ///
    /// WHY the defaults come from the base: every game constant lives in
    /// `phomu-config`, and a second set of defaults in the bridge would be a
    /// second truth (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).
    fn default() -> Self {
        from_core_config(&GameConfig::default())
    }
}

/// Turn the configuration of the base into the configuration of the shell.
pub fn from_core_config(config: &GameConfig) -> PhomuGameConfig {
    PhomuGameConfig {
        selected_modes: config
            .selected_modes
            .iter()
            .map(|mode| mode.as_str().to_string())
            .collect(),
        selected_packs: config.selected_packs.clone(),
        team_mode: team_mode_name(config.team_mode).to_string(),
        device_mode: device_mode_name(config.device_mode).to_string(),
        ending_condition: ending_condition_name(config.ending_condition).to_string(),
        target_points: config.target_points,
        target_rounds: config.target_rounds,
        target_time_minutes: config.target_time_minutes,
        time_limit_seconds: config.time_limit_seconds,
        difficulty: difficulty_name(config.difficulty).to_string(),
        timeline_max_points: config.timeline_max_points,
        time_decay_enabled: config.time_decay.enabled,
        time_decay_grace_seconds: config.time_decay.grace_seconds,
        time_decay_step_seconds: config.time_decay.step_seconds,
        time_decay_step_points: config.time_decay.step_points,
        min_points_per_correct: config.time_decay.min_points_per_correct,
        override_governance: override_governance_name(config.override_governance).to_string(),
        hint_release_policy: hint_release_policy_name(config.hint_release_policy).to_string(),
        ai_queue_strategy: ai_queue_strategy_name(config.ai_queue_strategy).to_string(),
        chips_enabled: config.chips_enabled,
        no_cheat_mode: config.no_cheat_mode,
        only_qr_compatible: config.only_qr_compatible,
        elimination_rule: elimination_rule_name(config.elimination_rule).to_string(),
        preferred_music_provider: config.preferred_music_provider.as_str().to_string(),
    }
}

/// The name of the way the players are grouped.
fn team_mode_name(mode: TeamMode) -> &'static str {
    match mode {
        TeamMode::Individual => "individual",
        TeamMode::Fixed => "fixed",
        TeamMode::Shifting => "shifting",
    }
}

/// The name of the way the game is played.
fn device_mode_name(mode: DeviceMode) -> &'static str {
    match mode {
        DeviceMode::PassThePhone => "pass-the-phone",
        DeviceMode::MultiDevice => "multi-device",
    }
}

/// The name of the condition that ends the game.
fn ending_condition_name(condition: EndingCondition) -> &'static str {
    match condition {
        EndingCondition::Points => "points",
        EndingCondition::Rounds => "rounds",
        EndingCondition::Time => "time",
    }
}

/// The name of the difficulty filter.
fn difficulty_name(filter: DifficultyFilter) -> String {
    match filter {
        DifficultyFilter::All => "all".to_string(),
        DifficultyFilter::Only(difficulty) => difficulty.as_str().to_string(),
    }
}

/// The name of the override governance.
fn override_governance_name(governance: OverrideGovernance) -> &'static str {
    match governance {
        OverrideGovernance::Host => "host",
        OverrideGovernance::CoHost => "co-host",
        OverrideGovernance::Majority => "majority",
    }
}

/// The name of the hint release policy.
fn hint_release_policy_name(policy: HintReleasePolicy) -> &'static str {
    match policy {
        HintReleasePolicy::AutoPublish => "auto-publish",
        HintReleasePolicy::ManualReview => "manual-review",
    }
}

/// The name of the queue strategy.
fn ai_queue_strategy_name(strategy: AiQueueStrategy) -> &'static str {
    match strategy {
        AiQueueStrategy::QueueRetryPending => "queue-retry",
        AiQueueStrategy::FailFast => "fail-fast",
    }
}

/// The name of the elimination rule.
fn elimination_rule_name(rule: EliminationRule) -> String {
    match rule {
        EliminationRule::None => "none".to_string(),
        EliminationRule::BelowScore { threshold } => format!("below-score:{threshold}"),
    }
}

/// Turn the configuration of the shell into the configuration of the base.
///
/// # Errors
/// Returns the failure `InvalidConfiguration` when an identifier of the
/// configuration is not one the base knows.
pub fn to_core_config(config: &PhomuGameConfig) -> Result<GameConfig, PhomuError> {
    let mut selected_modes = Vec::with_capacity(config.selected_modes.len());
    for mode in &config.selected_modes {
        selected_modes.push(
            GameMode::from_str(mode).ok_or_else(|| invalid_configuration("selectedModes", mode))?,
        );
    }

    let team_mode = TeamMode::from_str(&config.team_mode)
        .ok_or_else(|| invalid_configuration("teamMode", &config.team_mode))?;
    let device_mode = match config.device_mode.as_str() {
        "pass-the-phone" => DeviceMode::PassThePhone,
        "multi-device" => DeviceMode::MultiDevice,
        other => return Err(invalid_configuration("deviceMode", other)),
    };
    let ending_condition = EndingCondition::from_str(&config.ending_condition)
        .ok_or_else(|| invalid_configuration("endingCondition", &config.ending_condition))?;
    let override_governance = match config.override_governance.as_str() {
        "host" => OverrideGovernance::Host,
        "co-host" => OverrideGovernance::CoHost,
        "majority" => OverrideGovernance::Majority,
        other => return Err(invalid_configuration("overrideGovernance", other)),
    };
    let hint_release_policy = match config.hint_release_policy.as_str() {
        "auto-publish" => HintReleasePolicy::AutoPublish,
        "manual-review" => HintReleasePolicy::ManualReview,
        other => return Err(invalid_configuration("hintReleasePolicy", other)),
    };
    let ai_queue_strategy = match config.ai_queue_strategy.as_str() {
        "queue-retry" => AiQueueStrategy::QueueRetryPending,
        "fail-fast" => AiQueueStrategy::FailFast,
        other => return Err(invalid_configuration("aiQueueStrategy", other)),
    };
    let preferred_music_provider = MusicProvider::from_str(&config.preferred_music_provider)
        .ok_or_else(|| {
            invalid_configuration("preferredMusicProvider", &config.preferred_music_provider)
        })?;

    let difficulty = match config.difficulty.as_str() {
        "all" => DifficultyFilter::All,
        other => DifficultyFilter::Only(
            Difficulty::from_str(other)
                .ok_or_else(|| invalid_configuration("difficulty", other))?,
        ),
    };

    let elimination_rule = parse_elimination_rule(&config.elimination_rule)?;

    Ok(GameConfig {
        selected_modes,
        selected_packs: config.selected_packs.clone(),
        team_mode,
        device_mode,
        ending_condition,
        target_points: config.target_points,
        target_rounds: config.target_rounds,
        target_time_minutes: config.target_time_minutes,
        time_limit_seconds: config.time_limit_seconds,
        difficulty,
        timeline_max_points: config.timeline_max_points,
        time_decay: TimeDecayConfig {
            enabled: config.time_decay_enabled,
            grace_seconds: config.time_decay_grace_seconds,
            step_seconds: config.time_decay_step_seconds,
            step_points: config.time_decay_step_points,
            min_points_per_correct: config.min_points_per_correct,
        },
        override_governance,
        hint_release_policy,
        ai_queue_strategy,
        chips_enabled: config.chips_enabled,
        no_cheat_mode: config.no_cheat_mode,
        only_qr_compatible: config.only_qr_compatible,
        elimination_rule,
        preferred_music_provider,
    })
}

/// Parse the rule that decides who leaves the game.
///
/// WHY the format is `below-score:<threshold>`: the rule carries a number,
/// and a number needs a place in an identifier that crosses a boundary.
fn parse_elimination_rule(value: &str) -> Result<EliminationRule, PhomuError> {
    if value == "none" {
        return Ok(EliminationRule::None);
    }
    let Some(rest) = value.strip_prefix("below-score:") else {
        return Err(invalid_configuration("eliminationRule", value));
    };
    let threshold = rest
        .parse::<i64>()
        .map_err(|_| invalid_configuration("eliminationRule", value))?;
    Ok(EliminationRule::BelowScore { threshold })
}

/// Turn the player of the shell into the player of the base.
pub fn to_core_player(player: &PhomuPlayer) -> Player {
    Player {
        id: player.id.clone(),
        name: player.name.clone(),
        score: 0,
        team_id: player.team_id.clone(),
        is_eliminated: false,
        is_spectator: player.is_spectator,
        is_pilot: player.is_pilot,
        color: player.color.clone(),
        avatar: player.avatar.clone(),
    }
}

/// Turn the team of the shell into the team of the base.
pub fn to_core_team(team: &PhomuTeam) -> Team {
    Team {
        id: team.id.clone(),
        name: team.name.clone(),
        player_ids: team.player_ids.clone(),
        score: 0,
        color: team.color.clone(),
    }
}

/// Turn the snapshot of the base into the snapshot of the shell.
pub fn from_core_snapshot(snapshot: &SessionSnapshot) -> PhomuSessionSnapshot {
    PhomuSessionSnapshot {
        phase: snapshot.phase.as_str().to_string(),
        round_number: snapshot.current_round,
        current_mode: snapshot.current_mode.as_str().to_string(),
        points_possible: 0,
        round_count: snapshot.current_round.saturating_sub(1),
        players: snapshot
            .players
            .iter()
            .map(|player| PhomuPlayerScore {
                id: player.id.clone(),
                name: player.name.clone(),
                score: player.score,
                team_id: player.team_id.clone(),
                is_eliminated: player.is_eliminated,
                is_spectator: player.is_spectator,
            })
            .collect(),
        team_scores: snapshot
            .teams
            .iter()
            .map(|team| PhomuTeamScore {
                id: team.id.clone(),
                score: team.score,
            })
            .collect(),
        is_game_over: snapshot.is_game_over,
        winner_id: snapshot.winner_id.clone(),
    }
}

/// Turn the view of the base into the view of the shell.
///
/// WHY the reveal is an error here: the reveal is the one phase that
/// discloses the identity of the song, and it has its own type. A call that
/// answers with a reveal therefore fails instead of handing the solution to
/// a surface that cannot carry it (C-1 and C-3).
///
/// # Errors
/// Returns the failure `NotAvailableInPhase` when the base answers with the
/// reveal of the round.
pub fn from_core_round_view(
    view: &phomu_core::facade::RoundView,
) -> Result<PhomuRoundView, PhomuError> {
    Ok(match view {
        phomu_core::facade::RoundView::Drawing(drawing) => PhomuRoundView::Drawing {
            round_number: drawing.round_number,
            mode: drawing.mode.as_str().to_string(),
            auto_draw: drawing.auto_draw,
        },
        phomu_core::facade::RoundView::Question(question) => PhomuRoundView::Question {
            round_number: question.round_number,
            mode: question.mode.as_str().to_string(),
            hints: question.prompt.hints().to_vec(),
            options: question.prompt.options().to_vec(),
            points_possible: question.points_possible,
            answers_locked: question.answers_locked,
        },
        phomu_core::facade::RoundView::Scoring(scoring) => PhomuRoundView::Scoring {
            round_number: scoring.round_number,
            mode: String::new(),
            winner_id: scoring.winner_id.clone(),
        },
        phomu_core::facade::RoundView::Reveal(reveal) => {
            return Err(failure(
                ErrorCode::NotAvailableInPhase,
                &[
                    ("phase", reveal.mode.as_str()),
                    ("reason", "the reveal has its own surface"),
                ],
            ));
        }
    })
}

/// Turn the reveal of the base into the reveal of the shell.
pub fn from_core_reveal_view(
    reveal: &phomu_core::facade::RevealView,
) -> crate::view::PhomuRevealView {
    crate::view::PhomuRevealView {
        round_number: reveal.round_number,
        mode: reveal.mode.as_str().to_string(),
        title: reveal.solution.title.clone(),
        artist: reveal.solution.artist.clone(),
        year: reveal.solution.year,
        is_correct: reveal.is_correct,
        points_awarded: reveal.points_awarded,
    }
}

/// Turn the score of the base into the score of the shell.
pub fn from_core_score_snapshot(snapshot: &ScoreSnapshot) -> PhomuScoreSnapshot {
    PhomuScoreSnapshot {
        round_number: snapshot.round_number,
        mode: String::new(),
        answers: vec![crate::dto::PhomuPlayerAnswer {
            player_id: snapshot.player_id.clone(),
            is_correct: snapshot.is_correct,
            points_awarded: snapshot.points_awarded,
            answered_in_seconds: None,
        }],
        players: vec![PhomuPlayerScore {
            id: snapshot.player_id.clone().unwrap_or_default(),
            name: String::new(),
            score: snapshot.player_score,
            team_id: snapshot.team_id.clone(),
            is_eliminated: false,
            is_spectator: false,
        }],
    }
}
