//! The configuration of a session.
//!
//! WHAT: the value types of the lobby configuration ([`DeviceMode`],
//! [`OverrideGovernance`], [`HintReleasePolicy`], [`AiQueueStrategy`],
//! [`DifficultyFilter`]) and the configuration itself ([`GameConfig`]).
//!
//! WHY: the configuration is the input of a session; the rules read it and
//! never change it (docs/design/BUILD-CONTRACT.md § 5.1, rule K-4). The
//! numbers of the configuration come from `phomu-config`; the identifiers
//! live here, because the topology of the base forbids a leaf crate from
//! depending on another leaf crate.

use phomu_catalog::Difficulty;
use phomu_config::{
    DEFAULT_MIN_POINTS_PER_CORRECT, DEFAULT_NO_CHEAT_MODE, DEFAULT_ROUNDS_TO_PLAY,
    DEFAULT_TARGET_POINTS, DEFAULT_TARGET_TIME_MINUTES, DEFAULT_TIME_DECAY_ENABLED,
    DEFAULT_TIME_DECAY_GRACE_SECONDS, DEFAULT_TIME_DECAY_STEP_POINTS,
    DEFAULT_TIME_DECAY_STEP_SECONDS, DEFAULT_TIMELINE_MAX_POINTS, DEFAULT_WIN_SCORE,
};
use phomu_media::MusicProvider;

use crate::modes::GameMode;
use crate::rules::scoring::TimeDecayConfig;
use crate::rules::teams::{EliminationRule, TeamMode};
use crate::rules::winner::EndingCondition;

/// How the game is played.
///
/// WHY: the device mode decides how many answers a round expects; the
/// rules therefore depend on it (GAME-004).
///
/// EXAMPLE: `DeviceMode::PassThePhone` is the default of a new session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceMode {
    /// One device is passed between the players.
    PassThePhone,
    /// Every player uses their own device.
    MultiDevice,
}

/// Who may perform the override actions.
///
/// WHY: the power user may correct an answer after the fact; who is
/// allowed to do so is a rule of the session, not of the shell.
///
/// EXAMPLE: `OverrideGovernance::Host` lets the host alone correct an
/// answer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverrideGovernance {
    /// The host alone.
    Host,
    /// The host and a co-host.
    CoHost,
    /// A majority of the players.
    Majority,
}

/// How the generated hints are published.
///
/// WHY: a generated hint is checked before it is shown; the policy decides
/// whether the check is obligatory.
///
/// EXAMPLE: `HintReleasePolicy::AutoPublish` publishes a hint at once.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HintReleasePolicy {
    /// The hints are published automatically.
    AutoPublish,
    /// The hints are published after a review.
    ManualReview,
}

/// What happens when the hint service is blocked.
///
/// WHY: the service may be blocked by the rate limit; the strategy decides
/// whether the request waits or fails.
///
/// EXAMPLE: `AiQueueStrategy::FailFast` fails the request immediately.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiQueueStrategy {
    /// The request is queued and retried.
    QueueRetryPending,
    /// The request fails immediately.
    FailFast,
}

/// The difficulty the songs have to have.
///
/// WHY: the difficulty filter is a soft fallback in the draw; the filter
/// itself therefore has to name the permitted difficulties
/// (docs/design/GAME-CONTRACT.md` § 4).
///
/// EXAMPLE: `DifficultyFilter::All` accepts every difficulty.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DifficultyFilter {
    /// Every difficulty is allowed.
    All,
    /// Only one difficulty is allowed.
    Only(Difficulty),
}

/// The configuration of a session.
///
/// WHY: the configuration is the input of a session; the rules read it and
/// never change it (docs/design/BUILD-CONTRACT.md § 5.1, rule K-4).
///
/// EXAMPLE: `GameConfig::default()` describes a game of ten rounds per
/// player in the Timeline mode.
///
/// The defaults are the defaults of the reference implementation
/// (`src/stores/game-store.ts:41-66`). The reference implementation carries
/// two target values for the same thing — `targetPoints` and `winCondition`
/// (`docs/design/GAME-CONTRACT.md` § 11.1, A11) — and a second one for the
/// rounds (`roundsToPlay`, A12). The base has exactly one target per ending
/// condition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameConfig {
    /// The modes that are active in the session.
    pub selected_modes: Vec<GameMode>,
    /// The packs the session draws from.
    pub selected_packs: Vec<String>,
    /// How the players are grouped.
    pub team_mode: TeamMode,
    /// How the game is played.
    pub device_mode: DeviceMode,
    /// The condition that ends the game.
    pub ending_condition: EndingCondition,
    /// The score that ends the game.
    pub target_points: i64,
    /// The number of rounds per player or per team.
    pub target_rounds: u32,
    /// The number of minutes the game lasts.
    pub target_time_minutes: u32,
    /// The upper bound of a question round, in seconds.
    pub time_limit_seconds: Option<u32>,
    /// The difficulty the songs have to have.
    pub difficulty: DifficultyFilter,
    /// The maximum number of points in the Timeline mode.
    pub timeline_max_points: u32,
    /// The parameters of the time decay.
    pub time_decay: TimeDecayConfig,
    /// Who may perform the override actions.
    pub override_governance: OverrideGovernance,
    /// How the generated hints are published.
    pub hint_release_policy: HintReleasePolicy,
    /// What happens when the hint service is blocked.
    pub ai_queue_strategy: AiQueueStrategy,
    /// Whether the chips mechanic is active.
    pub chips_enabled: bool,
    /// Whether the cheat buttons are hidden.
    pub no_cheat_mode: bool,
    /// Whether only songs with a physical card may be drawn.
    pub only_qr_compatible: bool,
    /// The rule that decides who leaves the game.
    pub elimination_rule: EliminationRule,
    /// The provider the players prefer.
    pub preferred_music_provider: MusicProvider,
}

impl Default for GameConfig {
    /// The defaults of the reference implementation.
    ///
    /// EXAMPLE: a new configuration ends after ten rounds per player.
    fn default() -> Self {
        Self {
            selected_modes: vec![GameMode::Timeline],
            selected_packs: Vec::new(),
            team_mode: TeamMode::Individual,
            device_mode: DeviceMode::PassThePhone,
            ending_condition: EndingCondition::Rounds,
            target_points: i64::from(DEFAULT_TARGET_POINTS),
            target_rounds: DEFAULT_ROUNDS_TO_PLAY,
            target_time_minutes: DEFAULT_TARGET_TIME_MINUTES,
            time_limit_seconds: None,
            difficulty: DifficultyFilter::All,
            timeline_max_points: DEFAULT_TIMELINE_MAX_POINTS,
            time_decay: TimeDecayConfig {
                enabled: DEFAULT_TIME_DECAY_ENABLED,
                grace_seconds: DEFAULT_TIME_DECAY_GRACE_SECONDS,
                step_seconds: DEFAULT_TIME_DECAY_STEP_SECONDS,
                step_points: DEFAULT_TIME_DECAY_STEP_POINTS,
                min_points_per_correct: DEFAULT_MIN_POINTS_PER_CORRECT,
            },
            override_governance: OverrideGovernance::Host,
            hint_release_policy: HintReleasePolicy::AutoPublish,
            ai_queue_strategy: AiQueueStrategy::QueueRetryPending,
            chips_enabled: false,
            no_cheat_mode: DEFAULT_NO_CHEAT_MODE,
            only_qr_compatible: false,
            elimination_rule: EliminationRule::None,
            preferred_music_provider: MusicProvider::Youtube,
        }
    }
}

impl GameConfig {
    /// The number of answers the core expects in one round.
    ///
    /// WHY: in the mode "one device, passed around" exactly one player
    /// answers per round; in the mode "many devices" every player answers
    /// (`src/types/game-state.ts:23-26`).
    ///
    /// EXAMPLE: in the mode "one device, passed around" the number of the
    /// expected answers is 1, whatever the number of the players is.
    pub fn expected_answers(&self, player_count: usize) -> usize {
        match self.device_mode {
            DeviceMode::PassThePhone => 1,
            DeviceMode::MultiDevice => player_count.max(1),
        }
    }

    /// The legacy win score of the reference implementation.
    ///
    /// WHY: the reference implementation keeps `winCondition` as an alias of
    /// `targetPoints` (`src/types/game-state.ts:62`). The base has one
    /// target; the alias exists here only so that a shell that still reads
    /// the old field can be migrated.
    pub const fn legacy_win_score() -> u32 {
        DEFAULT_WIN_SCORE
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{DeviceMode, DifficultyFilter, GameConfig};
    use crate::modes::GameMode;
    use crate::rules::teams::TeamMode;
    use crate::rules::winner::EndingCondition;

    #[test]
    fn the_defaults_match_the_reference_implementation() {
        let config = GameConfig::default();
        assert_eq!(config.selected_modes, vec![GameMode::Timeline]);
        assert_eq!(config.team_mode, TeamMode::Individual);
        assert_eq!(config.device_mode, DeviceMode::PassThePhone);
        assert_eq!(config.ending_condition, EndingCondition::Rounds);
        assert_eq!(config.target_rounds, 10);
        assert_eq!(config.target_points, 100);
        assert_eq!(config.target_time_minutes, 60);
        assert_eq!(config.timeline_max_points, 5);
        assert!(!config.time_decay.enabled);
        assert!(!config.no_cheat_mode);
    }

    #[test]
    fn one_device_expects_one_answer_per_round() {
        let config = GameConfig::default();
        assert_eq!(config.expected_answers(4), 1);
    }

    #[test]
    fn many_devices_expect_one_answer_per_player() {
        let config = GameConfig {
            device_mode: DeviceMode::MultiDevice,
            ..GameConfig::default()
        };
        assert_eq!(config.expected_answers(4), 4);
    }

    #[test]
    fn the_difficulty_filter_defaults_to_every_difficulty() {
        assert_eq!(GameConfig::default().difficulty, DifficultyFilter::All);
    }
}
