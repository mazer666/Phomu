//! The version and the capabilities of the exported surface.
//!
//! WHAT: the functions that report the version of the surface and the
//! capabilities the base offers for the declaration of a shell.
//!
//! WHY the version is a function and not a constant of the shell: the shell
//! has to be able to ask the base which version it is, before it uses it
//! (docs/design/BUILD-CONTRACT.md § 3.2).

use crate::dto::PhomuCapabilities;

use crate::abi::VERSION;
use crate::session::kind_of;

/// The version of the exported surface.
///
/// EXAMPLE: `"1.1.0"`.
#[uniffi::export]
pub fn phomu_abi_version() -> String {
    VERSION.to_string()
}

/// Every major version of the surface the base still serves.
#[uniffi::export]
pub fn phomu_abi_versions() -> Vec<String> {
    phomu_core::facade::abi_versions()
}

/// Whether the version of the base lies inside the bracket of a shell.
///
/// WHY the check is closed: a shell that runs against a base it was not
/// written for must stop at start-up and not in the middle of a round
/// (docs/design/BUILD-CONTRACT.md § 3.2).
#[uniffi::export]
pub fn phomu_abi_accepts(
    min_major: u16,
    min_minor: u16,
    min_patch: u16,
    max_major: u16,
    max_minor: u16,
    max_patch: u16,
) -> bool {
    let bracket = phomu_core::facade::VersionBracket::new(
        (min_major, min_minor, min_patch),
        (max_major, max_minor, max_patch),
    );
    bracket.accepts_current()
}

/// The capabilities the base offers for the declaration of a shell.
///
/// WHY the declaration is reduced and not echoed: the base only knows the
/// provider kinds it can plan for. A capability that no provider of the base
/// needs is of no use to the shell, and saying so is the answer of the base
/// (docs/design/BUILD-CONTRACT.md § 2.2).
#[uniffi::export]
pub fn phomu_capabilities(shell: PhomuCapabilities) -> PhomuCapabilities {
    let providers = phomu_media::MusicProvider::ALL;
    let has_embed = providers
        .iter()
        .any(|provider| kind_of(*provider) == "embed");
    let has_preview = providers
        .iter()
        .any(|provider| kind_of(*provider) == "preview-audio");
    let has_deep_link = providers
        .iter()
        .any(|provider| kind_of(*provider) == "deep-link");

    PhomuCapabilities {
        can_play_preview_audio: shell.can_play_preview_audio && has_preview,
        can_embed_youtube: shell.can_embed_youtube && has_embed,
        can_embed_spotify: shell.can_embed_spotify && has_embed,
        can_embed_amazon: shell.can_embed_amazon && has_embed,
        can_open_deep_links: shell.can_open_deep_links && has_deep_link,
        can_play_in_background: shell.can_play_in_background,
    }
}
