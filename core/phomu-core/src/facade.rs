//! The one surface every bridge exports.
//!
//! WHAT: the types and the functions that a bridge hands to a shell.
//!
//! WHY: the three bridges — UniFFI, wasm-bindgen and the C-ABI — are three
//! marshalling strategies over **one** surface. If they exported different
//! things, they would drift apart
//! (docs/design/BUILD-CONTRACT.md § 2.1). Everything in this crate that
//! is not reachable from here is private.
//!
//! ## What is exported
//!
//! | Export | Purpose |
//! |---|---|
//! | [`Session`] | the session: the commands a shell sends and the answers it gets |
//! | [`GameConfig`] | the configuration of a session |
//! | [`RoundView`] and its parts | the view model of the running round |
//! | [`SessionSnapshot`], [`ScoreSnapshot`] | the immutable values a shell reads |
//! | [`ModeAnswer`], [`ModeOutcome`] | the answer of a mode and its result |
//! | [`RoundPhase`] | the phase of the round |
//! | [`FieldId`] | the fields a shell may persist |
//! | [`censor_hint`] | the censoring of a hint |
//! | [`valid_slots`], [`canonical_slot`], [`apply_year`] | the slots of the Timeline mode |
//! | [`abi_version`] | the version of the surface |
//!
//! ## What is not exported
//!
//! * the internal state of a session — the shell sees the snapshots;
//! * a song with its solution — the question phase has no field for it;
//! * panics, raw pointers, references and `unsafe` types;
//! * callbacks that capture Rust state — the core never calls the shell.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_core::facade::{GameConfig, Session};
//!
//! let session = Session::new(
//!     GameConfig::default(),
//!     Vec::new(),
//!     Vec::new(),
//!     Vec::new(),
//!     1,
//!     0,
//! )
//! .expect("a session is created");
//! assert_eq!(session.phase().as_str(), "drawing");
//! ```

pub use phomu_catalog::{
    Confidence, CoverMode, Difficulty, Fallback, Links, Lyrics, Pack, PreviewTimestamp,
    RelationType, Selection, SelectionCriteria, Song, filter_pool, select_song,
};
pub use phomu_errors::{ErrorCode, PhomuError, Result};
pub use phomu_i18n::{GameEvent, Language, MessageKey, message_key};
pub use phomu_media::{
    AutoSkipDecision, MediaPlan, MediaSource, MediaSources, MusicProvider, PlaybackWindow,
    ProviderCandidate, ProviderFailure, ProviderKind,
};

pub use crate::abi::{
    ABI_VERSION_MAJOR, ABI_VERSION_MINOR, ABI_VERSION_PATCH, VersionBracket, abi_version,
    abi_versions,
};
pub use crate::modes::timeline::{TimelineEffect, apply_year, canonical_slot, valid_slots};
pub use crate::modes::{
    GameMode, KnewWhat, ModeAnswer, ModeContext, ModeOutcome, evaluate_mode_answer,
};
pub use crate::rules::phase::RoundPhase;
pub use crate::rules::scoring::TimeDecayConfig;
pub use crate::rules::teams::{EliminationRule, TeamMode};
pub use crate::rules::winner::EndingCondition;
pub use crate::session::answers::Cheat;
pub use crate::session::config::{
    AiQueueStrategy, DeviceMode, DifficultyFilter, GameConfig, HintReleasePolicy,
    OverrideGovernance,
};
pub use crate::session::dto::{ScoreSnapshot, SessionSnapshot};
pub use crate::session::model::SessionState;
pub use crate::session::model::{AnswerValue, Player, PlayerAnswer, RoundRecord, SongSource, Team};
pub use crate::session::persist::{FieldId, PERSISTABLE_FIELDS, is_persistable};
pub use crate::session::round::{ModeProgress, RoundState};
pub use crate::session::state::{SCHEMA_VERSION, Session};
pub use crate::spoiler::censor::censor_hint;
pub use crate::spoiler::view::{
    DrawingView, Prompt, QuestionView, RevealView, RoundView, ScoringView, SongIdentity,
    SongSolution,
};
