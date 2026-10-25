//! The error type of the bridge.
//!
//! WHAT: the typed exception hierarchy of the bridge. Every failure of the
//! base has its own variant, and every variant carries the stable numeric
//! code, the i18n message key and the context of the failure.
//!
//! WHY: a shell has to classify a failure the same way on every platform.
//! A free-text message cannot be classified; a typed variant can
//! (docs/spec/REQUIREMENTS-PLATFORM.md, BRIDGE-104). The message key travels
//! with the failure, so that the shell resolves the text in its own locale
//! files and the base never assembles a sentence
//! (docs/design/BUILD-CONTRACT.md § 6.1, rule L-7).
//!
//! The mapping from the taxonomy of the base onto the variants below is a
//! total function: the base adds a failure, the bridge stops compiling. That
//! is deliberate — a failure that cannot cross the bridge unnoticed is worth
//! more than a bridge that compiles.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::error::{PhomuError, to_bridge_error};
//! use phomu_errors::{ErrorCode, PhomuError as CoreError};
//!
//! let error = to_bridge_error(&CoreError::new(ErrorCode::UnknownPlayer)
//!     .with_context("playerId", "p-42"));
//! assert_eq!(error.code(), 1004);
//! assert_eq!(error.message_key(), "errors.unknownPlayer");
//! ```

use std::collections::HashMap;
use std::fmt;

use phomu_errors::{ErrorCode, PhomuError as CoreError};

/// The failure of the base, as the shell sees it.
///
/// WHY the fields are repeated in every variant: the shell reads the code
/// and the message key without knowing the variant, and a shell that only
/// knows the variant still has the numbers. Both are part of the contract.
///
/// Declares the error hierarchy of the bridge and its mapping.
///
/// WHY a macro: the hierarchy has one variant per failure of the taxonomy,
/// and the variant, the accessor and the mapping have to agree. A macro
/// makes that agreement a property of the syntax instead of a convention
/// that a review has to check.
macro_rules! phomu_error_hierarchy {
    ($($variant:ident => $code:literal),* $(,)?) => {
        /// The failure of the base, as the shell sees it.
        ///
        /// The variants are generated: one per failure of the taxonomy of the
        /// base. The documentation of a variant is its name — the name of
        /// the failure and the number of its code.
        #[allow(missing_docs)]
        #[derive(Debug, Clone, PartialEq, Eq, uniffi::Error)]
        pub enum PhomuError {
            $(
                $variant {
                    /// The stable numeric code of the failure.
                    code: u16,
                    /// The i18n message key of the failure.
                    message_key: String,
                    /// The context of the failure, by key.
                    context: HashMap<String, String>,
                },
            )*
        }

        impl PhomuError {
            /// The stable numeric code of the failure.
            ///
            /// EXAMPLE: the code of `PhomuError::UnknownPlayer` is `1004`.
            pub fn code(&self) -> u16 {
                match self {
                    $(PhomuError::$variant { code, .. } => *code,)*
                }
            }

            /// The i18n message key of the failure.
            ///
            /// EXAMPLE: the key of `PhomuError::UnknownPlayer` is
            /// `"errors.unknownPlayer"`.
            pub fn message_key(&self) -> &str {
                match self {
                    $(PhomuError::$variant { message_key, .. } => message_key,)*
                }
            }

            /// The context of the failure.
            pub fn context(&self) -> &HashMap<String, String> {
                match self {
                    $(PhomuError::$variant { context, .. } => context,)*
                }
            }
        }

        /// Turn a failure of the base into the failure of the bridge.
        ///
        /// WHY: the code and the message key come from the base, so that they
        /// cannot drift; the variant is chosen by the closed taxonomy, so that
        /// a new failure of the base breaks the build of the bridge instead
        /// of crossing it unnoticed.
        pub fn to_bridge_error(error: &CoreError) -> PhomuError {
            let code = error.code().code();
            let message_key = error.message_key().to_string();
            let context: HashMap<String, String> = error
                .context()
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect();

            match error.code() {
                $(ErrorCode::$variant => PhomuError::$variant {
                    code,
                    message_key,
                    context,
                },)*
            }
        }
    };
}

// The failures of the base, one variant each.
phomu_error_hierarchy! {
    InvalidConfiguration => 1001,
    InvalidPlayerCount => 1002,
    InvalidTeamCount => 1003,
    UnknownPlayer => 1004,
    UnknownTeam => 1005,
    UnknownMode => 1006,
    InvalidAnswer => 1007,
    InvalidDifficulty => 1008,
    EmptySelection => 1009,
    InvalidDraw => 1010,
    NotAvailableInPhase => 1101,
    AnswersNotLocked => 1102,
    NoSongDrawn => 1103,
    GameAlreadyOver => 1104,
    NoActivePlayer => 1105,
    DuplicateAnswer => 1106,
    InvalidTransition => 1107,
    RoundNotComplete => 1108,
    ModeNotEnabled => 1109,
    CatalogueEmpty => 1201,
    SongNotFound => 1202,
    InvalidSongData => 1203,
    PackNotFound => 1204,
    DuplicateSongId => 1205,
    MediaUnavailable => 1301,
    MediaBlocked => 1302,
    MediaFailed => 1303,
    MediaTimedOut => 1304,
    MediaProvidersExhausted => 1305,
    Internal => 1401,
}

/// Build a failure of the base with a context.
///
/// WHY the helper exists: the bridge reports failures of the base with the
/// code and the message key of the base, so that the two cannot drift.
pub fn failure(code: ErrorCode, context: &[(&str, &str)]) -> PhomuError {
    let mut error = CoreError::new(code);
    for (key, value) in context {
        error = error.with_context(*key, *value);
    }
    to_bridge_error(&error)
}

impl fmt::Display for PhomuError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.message_key(), self.code())
    }
}

impl std::error::Error for PhomuError {}
