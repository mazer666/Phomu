//! The configuration of a session, as the web shell hands it over.
//!
//! WHAT: the conversion of the JSON of the lobby into the configuration of
//! the base.
//!
//! WHY the conversion lives here: the base is a pure Rust library and does
//! not know the wire format; the bridge is the place where the two meet.

use phomu_core::facade::{
    AiQueueStrategy, DeviceMode, DifficultyFilter, EndingCondition, GameConfig, GameMode,
    HintReleasePolicy, MusicProvider, OverrideGovernance, TeamMode, TimeDecayConfig,
};
use phomu_errors::ErrorCode;
use serde_json::Value;

use crate::BridgeError;

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

/// The failure of a configuration the base does not understand.
fn invalid(field: &str, value: &str) -> BridgeError {
    BridgeError {
        code: ErrorCode::InvalidConfiguration.code(),
        message_key: ErrorCode::InvalidConfiguration.message_key().to_string(),
        context: std::collections::HashMap::from([
            ("field".to_string(), field.to_string()),
            ("value".to_string(), value.to_string()),
        ]),
    }
}

/// The text of a field of the configuration, or the value of the base.
///
/// WHY the fallback: a field that the shell does not send keeps the default
/// of the base. The defaults live in `phomu-config` and are not repeated
/// here (docs/design/BUILD-CONTRACT.md § 5.1, rule K-1).
fn text_or(config: &Value, field: &str, fallback: &str) -> String {
    config
        .get(field)
        .and_then(Value::as_str)
        .unwrap_or(fallback)
        .to_string()
}

/// The number of a field of the configuration, or the value of the base.
fn number_or(config: &Value, field: &str, fallback: i64) -> i64 {
    config
        .get(field)
        .and_then(Value::as_i64)
        .unwrap_or(fallback)
}

/// The flag of a field of the configuration, or the value of the base.
fn flag_or(config: &Value, field: &str, fallback: bool) -> bool {
    config
        .get(field)
        .and_then(Value::as_bool)
        .unwrap_or(fallback)
}

/// The list of a field of the configuration.
fn list(config: &Value, field: &str) -> Vec<String> {
    config
        .get(field)
        .and_then(Value::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| entry.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// Turn the configuration of the shell into the configuration of the base.
///
/// # Errors
/// Returns the failure `InvalidConfiguration` when an identifier of the
/// configuration is not one the base knows.
pub fn to_core_config(config: &Value) -> Result<GameConfig, BridgeError> {
    let defaults = GameConfig::default();
    let mut selected_modes = Vec::new();
    for mode in list(config, "selectedModes") {
        selected_modes
            .push(GameMode::from_str(&mode).ok_or_else(|| invalid("selectedModes", &mode))?);
    }

    if list(config, "selectedModes").is_empty() {
        selected_modes = defaults.selected_modes.clone();
    }
    let team_mode = match text_or(config, "teamMode", team_mode_name(defaults.team_mode)).as_str() {
        "individual" => TeamMode::Individual,
        "fixed" => TeamMode::Fixed,
        "shifting" => TeamMode::Shifting,
        other => return Err(invalid("teamMode", other)),
    };
    let device_mode =
        match text_or(config, "deviceMode", device_mode_name(defaults.device_mode)).as_str() {
            "pass-the-phone" => DeviceMode::PassThePhone,
            "multi-device" => DeviceMode::MultiDevice,
            other => return Err(invalid("deviceMode", other)),
        };
    let ending_condition = match text_or(
        config,
        "endingCondition",
        ending_condition_name(defaults.ending_condition),
    )
    .as_str()
    {
        "points" => EndingCondition::Points,
        "rounds" => EndingCondition::Rounds,
        "time" => EndingCondition::Time,
        other => return Err(invalid("endingCondition", other)),
    };
    let override_governance = match text_or(
        config,
        "overrideGovernance",
        override_governance_name(defaults.override_governance),
    )
    .as_str()
    {
        "host" => OverrideGovernance::Host,
        "co-host" => OverrideGovernance::CoHost,
        "majority" => OverrideGovernance::Majority,
        other => return Err(invalid("overrideGovernance", other)),
    };
    let hint_release_policy = match text_or(
        config,
        "hintReleasePolicy",
        hint_release_policy_name(defaults.hint_release_policy),
    )
    .as_str()
    {
        "auto-publish" => HintReleasePolicy::AutoPublish,
        "manual-review" => HintReleasePolicy::ManualReview,
        other => return Err(invalid("hintReleasePolicy", other)),
    };
    let ai_queue_strategy = match text_or(
        config,
        "aiQueueStrategy",
        ai_queue_strategy_name(defaults.ai_queue_strategy),
    )
    .as_str()
    {
        "queue-retry" => AiQueueStrategy::QueueRetryPending,
        "fail-fast" => AiQueueStrategy::FailFast,
        other => return Err(invalid("aiQueueStrategy", other)),
    };
    let preferred_music_provider = match text_or(
        config,
        "preferredMusicProvider",
        defaults.preferred_music_provider.as_str(),
    )
    .as_str()
    {
        "youtube" => MusicProvider::Youtube,
        "spotify-free" => MusicProvider::SpotifyFree,
        "spotify-premium" => MusicProvider::SpotifyPremium,
        "amazon-music" => MusicProvider::AmazonMusic,
        "amazon-music-premium" => MusicProvider::AmazonMusicPremium,
        "apple-music" => MusicProvider::AppleMusic,
        other => return Err(invalid("preferredMusicProvider", other)),
    };
    let difficulty = match text_or(config, "difficulty", "all").as_str() {
        "all" => DifficultyFilter::All,
        other => DifficultyFilter::Only(
            phomu_catalog::Difficulty::from_str(other)
                .ok_or_else(|| invalid("difficulty", other))?,
        ),
    };
    let elimination_rule = match text_or(config, "eliminationRule", "none").as_str() {
        "none" => phomu_core::facade::EliminationRule::None,
        other => {
            let Some(rest) = other.strip_prefix("below-score:") else {
                return Err(invalid("eliminationRule", other));
            };
            let threshold = rest
                .parse::<i64>()
                .map_err(|_| invalid("eliminationRule", other))?;
            phomu_core::facade::EliminationRule::BelowScore { threshold }
        }
    };

    Ok(GameConfig {
        selected_modes,
        selected_packs: if list(config, "selectedPacks").is_empty() {
            defaults.selected_packs.clone()
        } else {
            list(config, "selectedPacks")
        },
        team_mode,
        device_mode,
        ending_condition,
        target_points: number_or(config, "targetPoints", defaults.target_points),
        target_rounds: number_or(config, "targetRounds", i64::from(defaults.target_rounds)) as u32,
        target_time_minutes: number_or(
            config,
            "targetTimeMinutes",
            i64::from(defaults.target_time_minutes),
        ) as u32,
        time_limit_seconds: config
            .get("timeLimitSeconds")
            .and_then(Value::as_u64)
            .map(|seconds| seconds as u32),
        difficulty,
        timeline_max_points: number_or(
            config,
            "timelineMaxPoints",
            i64::from(defaults.timeline_max_points),
        ) as u32,
        time_decay: TimeDecayConfig {
            enabled: flag_or(config, "timeDecayEnabled", defaults.time_decay.enabled),
            grace_seconds: number_or(
                config,
                "timeDecayGraceSeconds",
                i64::from(defaults.time_decay.grace_seconds),
            ) as u32,
            step_seconds: number_or(
                config,
                "timeDecayStepSeconds",
                i64::from(defaults.time_decay.step_seconds),
            ) as u32,
            step_points: number_or(
                config,
                "timeDecayStepPoints",
                i64::from(defaults.time_decay.step_points),
            ) as u32,
            min_points_per_correct: number_or(
                config,
                "minPointsPerCorrect",
                i64::from(defaults.time_decay.min_points_per_correct),
            ) as u32,
        },
        override_governance,
        hint_release_policy,
        ai_queue_strategy,
        chips_enabled: flag_or(config, "chipsEnabled", defaults.chips_enabled),
        no_cheat_mode: flag_or(config, "noCheatMode", defaults.no_cheat_mode),
        only_qr_compatible: flag_or(config, "onlyQrCompatible", defaults.only_qr_compatible),
        elimination_rule,
        preferred_music_provider,
    })
}
