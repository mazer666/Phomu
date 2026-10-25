//! The ABI version of the exported surface.
//!
//! WHAT: the version triple of the exported surface, re-exported from the
//! base, and the helpers a shell needs to check it.
//!
//! WHY: the base and the shells are released independently. A shell that
//! runs against a base it was not written for has to fail **closed** — at
//! start-up, not in the middle of a round
//! (docs/design/BUILD-CONTRACT.md § 3.2). The version is therefore part of
//! the exported surface and lands in every generated binding.
//!
//! EXAMPLE:
//!
//! ```
//! use phomu_ffi::abi::{AbiVersion, VERSION};
//!
//! assert_eq!(VERSION.major, 1);
//! ```

use phomu_core::facade::{ABI_VERSION_MAJOR, ABI_VERSION_MINOR, ABI_VERSION_PATCH, VersionBracket};

/// The three parts of the ABI version.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct AbiVersion {
    /// The compatibility level. A change means that an export was removed
    /// or renamed.
    pub major: u16,
    /// The feature level. A change means that an export was added.
    pub minor: u16,
    /// The patch level. A change means that nothing outside of the base is
    /// affected.
    pub patch: u16,
}

impl AbiVersion {
    /// The version of the exported surface.
    pub const VERSION: AbiVersion = AbiVersion {
        major: ABI_VERSION_MAJOR,
        minor: ABI_VERSION_MINOR,
        patch: ABI_VERSION_PATCH,
    };

    /// Whether the version lies inside a bracket of a shell.
    ///
    /// EXAMPLE: `AbiVersion::VERSION.is_accepted_by(VersionBracket::any_1_x())`
    /// is `true`.
    pub fn is_accepted_by(self, bracket: VersionBracket) -> bool {
        bracket.contains((self.major, self.minor, self.patch))
    }
}

impl std::fmt::Display for AbiVersion {
    /// The version as the string the bindings carry.
    ///
    /// EXAMPLE: `AbiVersion::VERSION.to_string()` is `"1.0.0"`.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)
    }
}

/// The version of the exported surface of this bridge.
///
/// WHY: the single definition lives in the base
/// (`core/phomu-core/src/abi.rs`), because the base *is* the exported
/// surface. The bridge only re-exports it, so that a version can never exist
/// in two places.
pub const VERSION: AbiVersion = AbiVersion::VERSION;

/// The bracket a shell accepts when it wants every `1.x` of the base.
pub fn any_1_x_bracket() -> VersionBracket {
    VersionBracket::any_1_x()
}
