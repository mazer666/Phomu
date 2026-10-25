//! The ABI version of the base.
//!
//! WHAT: the version triple of the exported surface and the bracket check a
//! shell performs at start-up.
//!
//! WHY: the base and the shells are released independently. A shell that
//! runs against a base it was not written for must fail *closed* — at
//! start-up, not in the middle of a round
//! (docs/design/BUILD-CONTRACT.md § 3.2).

/// The major version of the exported surface.
///
/// A change of the major version means that an export was removed or
/// renamed, or that the semantics of a field or of an error code changed.
pub const ABI_VERSION_MAJOR: u16 = 1;

/// The minor version of the exported surface.
///
/// A change of the minor version means that an export was added or that an
/// optional field of a DTO was added.
pub const ABI_VERSION_MINOR: u16 = 0;

/// The patch version of the exported surface.
///
/// A change of the patch version means that nothing outside of the base is
/// affected.
pub const ABI_VERSION_PATCH: u16 = 0;

/// The version of the exported surface as a string.
///
/// WHY: the shell reads the version at start-up and compares it with the
/// bracket it was written for (docs/design/BUILD-CONTRACT.md § 3.2).
///
/// EXAMPLE: `abi_version()` is `"1.0.0"`.
pub fn abi_version() -> String {
    format!("{ABI_VERSION_MAJOR}.{ABI_VERSION_MINOR}.{ABI_VERSION_PATCH}")
}

/// Every major version of the surface the core still serves.
///
/// WHY: a shell that supports several major versions needs the list of them
/// to build its bracket.
///
/// EXAMPLE: `abi_versions()` is `["1.0.0"]`.
pub fn abi_versions() -> Vec<String> {
    vec![abi_version()]
}

/// A range of base versions a shell accepts.
///
/// WHY: the base and the shells are released independently; the bracket is
/// the contract that says which combinations work together
/// (docs/design/BUILD-CONTRACT.md § 3.2).
///
/// EXAMPLE: the bracket `VersionBracket::any_1_x()` accepts every version
/// of the major version 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VersionBracket {
    /// The oldest acceptable version.
    pub min: (u16, u16, u16),
    /// The newest acceptable version.
    pub max: (u16, u16, u16),
}

impl VersionBracket {
    /// Builds a bracket.
    ///
    /// EXAMPLE: `VersionBracket::new((1, 0, 0), (1, 2, 0))` accepts the
    /// versions 1.0.0 to 1.2.0.
    pub const fn new(min: (u16, u16, u16), max: (u16, u16, u16)) -> Self {
        Self { min, max }
    }

    /// The bracket that accepts every `1.x` version.
    ///
    /// EXAMPLE: `VersionBracket::any_1_x().contains((1, 3, 0))` is `true`.
    pub const fn any_1_x() -> Self {
        Self::new((1, 0, 0), (1, 99, 0))
    }

    /// Whether a version lies inside the bracket.
    ///
    /// WHY: the check happens at start-up, not in the middle of a round —
    /// a shell that runs against a base it was not written for must fail
    /// closed (docs/design/BUILD-CONTRACT.md § 3.2).
    ///
    /// EXAMPLE: the bracket `any_1_x` accepts `1.3.0` and rejects `2.0.0`.
    pub fn contains(&self, version: (u16, u16, u16)) -> bool {
        version >= self.min && version <= self.max
    }

    /// Whether the version of this core lies inside the bracket.
    ///
    /// WHY: the check belongs to the shell, but the base offers it so that
    /// the three bridges answer it the same way.
    ///
    /// EXAMPLE: `VersionBracket::any_1_x().accepts_current()` is `true`.
    pub fn accepts_current(&self) -> bool {
        self.contains((ABI_VERSION_MAJOR, ABI_VERSION_MINOR, ABI_VERSION_PATCH))
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{
        ABI_VERSION_MAJOR, ABI_VERSION_MINOR, ABI_VERSION_PATCH, VersionBracket, abi_version,
    };

    #[test]
    fn the_version_is_formatted_as_three_numbers() {
        assert_eq!(abi_version(), "1.0.0");
    }

    #[test]
    fn the_bracket_accepts_the_current_version() {
        assert!(VersionBracket::any_1_x().accepts_current());
    }

    #[test]
    fn the_bracket_rejects_a_newer_major_version() {
        let bracket = VersionBracket::any_1_x();
        assert!(!bracket.contains((2, 0, 0)));
        assert!(!bracket.contains((0, 9, 0)));
    }

    #[test]
    fn the_parts_of_the_version_are_the_declared_constants() {
        assert_eq!(ABI_VERSION_MAJOR, 1);
        assert_eq!(ABI_VERSION_MINOR, 0);
        assert_eq!(ABI_VERSION_PATCH, 0);
    }
}
