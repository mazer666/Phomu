//! The ABI version of the C-ABI bridge.
pub struct AbiVersion {
    /// The compatibility level.
    pub major: u16,
    /// The feature level.
    pub minor: u16,
    /// The patch level.
    pub patch: u16,
}

impl AbiVersion {
    /// Creates a version from its three parts.
    pub const fn new(major: u16, minor: u16, patch: u16) -> Self {
        Self { major, minor, patch }
    }
}

/// The ABI version of the exported surface.
pub const ABI_VERSION: AbiVersion = AbiVersion::new(1, 0, 0);
