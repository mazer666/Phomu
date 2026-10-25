//! The providers and their kinds.
//!
//! WHAT: the six providers the product knows, the three kinds they belong
//! to and the sources a single song can offer.
//!
//! WHY: the provider is not a name but a **kind**, and the kinds differ in
//! how portable they are (docs/design/PLATFORM-ARCHITECTURE.md § 8.2). An
//! embed is a browser construct, a preview URL is playable by any audio
//! stack and a deep link hands the playback over to an installed
//! application. A shell that can only play preview URLs has to be able to
//! ask which kind a source belongs to *before* the round starts.

/// The provider the players prefer.
///
/// WHY: the preference is a session setting and is persisted
/// (`src/config/game-config.ts:20-26`, `src/types/game-state.ts:193`); it
/// therefore names a provider and not a playback technique.
///
/// EXAMPLE: `MusicProvider::Youtube` is the default of a new session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum MusicProvider {
    /// The YouTube player — the default, free, everybody has access.
    Youtube,
    /// The 30-second Spotify preview.
    SpotifyFree,
    /// The full Spotify playback through the Web Playback SDK.
    SpotifyPremium,
    /// The 30-second Amazon Prime preview.
    AmazonMusic,
    /// The full Amazon playback through the embed.
    AmazonMusicPremium,
    /// The Apple Music link — a deep link into the installed application.
    AppleMusic,
}

impl MusicProvider {
    /// Every provider, in the order of the reference implementation
    /// (`src/config/game-config.ts:20-26`).
    ///
    /// EXAMPLE: `MusicProvider::ALL` has six entries.
    pub const ALL: &'static [MusicProvider] = &[
        MusicProvider::Youtube,
        MusicProvider::SpotifyFree,
        MusicProvider::SpotifyPremium,
        MusicProvider::AmazonMusic,
        MusicProvider::AmazonMusicPremium,
        MusicProvider::AppleMusic,
    ];

    /// The identifier of the provider.
    ///
    /// WHY: the identifier is the key of the provider in the persisted
    /// state of a session; it has to stay stable.
    ///
    /// EXAMPLE: `MusicProvider::SpotifyFree.as_str()` is `"spotify-free"`.
    pub const fn as_str(self) -> &'static str {
        match self {
            MusicProvider::Youtube => "youtube",
            MusicProvider::SpotifyFree => "spotify-free",
            MusicProvider::SpotifyPremium => "spotify-premium",
            MusicProvider::AmazonMusic => "amazon-music",
            MusicProvider::AmazonMusicPremium => "amazon-music-premium",
            MusicProvider::AppleMusic => "apple-music",
        }
    }

    /// The provider of an identifier, if the identifier is known.
    ///
    /// WHY the name and not the trait `std::str::FromStr`: the lookup is
    /// total and therefore returns `Option`; a `Result` would force a second
    /// error type into this leaf crate, which may not depend on the error
    /// taxonomy of `phomu-errors` (the star topology of
    /// `docs/design/BUILD-CONTRACT.md` § 1.1).
    ///
    /// EXAMPLE: `MusicProvider::from_str("youtube")` is
    /// `Some(MusicProvider::Youtube)`.
    #[expect(
        clippy::should_implement_trait,
        reason = "a total lookup that returns Option; a leaf crate may not carry a second error taxonomy"
    )]
    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "youtube" => Some(MusicProvider::Youtube),
            "spotify-free" => Some(MusicProvider::SpotifyFree),
            "spotify-premium" => Some(MusicProvider::SpotifyPremium),
            "amazon-music" => Some(MusicProvider::AmazonMusic),
            "amazon-music-premium" => Some(MusicProvider::AmazonMusicPremium),
            "apple-music" => Some(MusicProvider::AppleMusic),
            _ => None,
        }
    }
}

/// How portable a provider is.
///
/// WHY: the kinds differ in how portable they are
/// (docs/design/PLATFORM-ARCHITECTURE.md § 8.2); a shell has to know
/// before the round starts whether it can play the plan at all.
///
/// EXAMPLE: `ProviderKind::PreviewAudio` is portable, `ProviderKind::Embed`
/// is not.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ProviderKind {
    /// An HTML embed player driven by an iframe — web only.
    Embed,
    /// A plain audio URL that any audio stack can play.
    PreviewAudio,
    /// A hand playback to the installed application of the provider.
    DeepLink,
}

impl ProviderKind {
    /// Every kind, in the order of the reference documentation.
    ///
    /// EXAMPLE: `ProviderKind::ALL` has three entries.
    pub const ALL: &'static [ProviderKind] = &[
        ProviderKind::Embed,
        ProviderKind::PreviewAudio,
        ProviderKind::DeepLink,
    ];

    /// Whether a shell with this kind can play every source of that kind.
    ///
    /// WHY: a native shell cannot play an embed; the property therefore
    /// decides whether the plan is playable at all
    /// (docs/design/PLATFORM-ARCHITECTURE.md § 8.2).
    ///
    /// EXAMPLE: `ProviderKind::PreviewAudio.is_portable()` is `true`.
    pub const fn is_portable(self) -> bool {
        match self {
            ProviderKind::Embed => false,
            ProviderKind::PreviewAudio => true,
            ProviderKind::DeepLink => true,
        }
    }
}

/// A source of a song that a provider can play.
///
/// WHY: the source is what the fallback chain walks; it therefore names
/// the place and not the provider.
///
/// EXAMPLE: `MediaSource::YoutubePrimary` is the link of the song itself.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MediaSource {
    /// The primary YouTube link of the song.
    YoutubePrimary,
    /// An alternative YouTube link, by its position in the fallback chain.
    YoutubeAlternative(usize),
    /// The Spotify embed of the song.
    SpotifyEmbed,
    /// The Spotify preview URL of the song.
    SpotifyPreview,
    /// The Amazon embed of the song.
    AmazonEmbed,
    /// The Amazon Prime preview URL of the song.
    AmazonPreview,
    /// The Apple Music link of the song.
    AppleMusic,
}

impl MediaSource {
    /// The kind the source belongs to.
    ///
    /// WHY: the fallback stays inside the kind; a shell that can play a
    /// preview URL cannot play an embed.
    ///
    /// EXAMPLE: `MediaSource::SpotifyPreview.kind()` is
    /// `ProviderKind::PreviewAudio`.
    pub const fn kind(&self) -> ProviderKind {
        match self {
            MediaSource::YoutubePrimary | MediaSource::YoutubeAlternative(_) => ProviderKind::Embed,
            MediaSource::SpotifyEmbed | MediaSource::AmazonEmbed => ProviderKind::Embed,
            MediaSource::SpotifyPreview | MediaSource::AmazonPreview => ProviderKind::PreviewAudio,
            MediaSource::AppleMusic => ProviderKind::DeepLink,
        }
    }
}

/// The kind a provider belongs to.
///
/// WHY: the preference of the players names a provider; the plan needs the
/// kind of that provider to decide whether the source is portable at all.
///
/// EXAMPLE: `provider_kind(MusicProvider::SpotifyFree)` is
/// `ProviderKind::PreviewAudio`.
pub const fn provider_kind(provider: MusicProvider) -> ProviderKind {
    match provider {
        MusicProvider::Youtube | MusicProvider::SpotifyPremium => ProviderKind::Embed,
        MusicProvider::SpotifyFree | MusicProvider::AmazonMusic => ProviderKind::PreviewAudio,
        MusicProvider::AmazonMusicPremium => ProviderKind::Embed,
        MusicProvider::AppleMusic => ProviderKind::DeepLink,
    }
}

/// The sources a song offers, without the catalogue model.
///
/// WHY: the media policy does not know the catalogue. The core hands the
/// links over in this shape, so that `phomu-media` stays a leaf.
///
/// EXAMPLE: a song without any link produces an empty `MediaSources`.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct MediaSources {
    /// The primary YouTube link.
    pub youtube: Option<String>,
    /// The alternative YouTube links, in the order of the fallback.
    pub youtube_alternatives: Vec<String>,
    /// The Spotify embed link.
    pub spotify_embed: Option<String>,
    /// The Spotify preview URL.
    pub spotify_preview: Option<String>,
    /// The Amazon embed link.
    pub amazon_embed: Option<String>,
    /// The Amazon Prime preview URL.
    pub amazon_preview: Option<String>,
    /// The Apple Music link.
    pub apple_music: Option<String>,
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{MediaSource, MusicProvider, ProviderKind, provider_kind};

    #[test]
    fn the_provider_identifiers_round_trip() {
        for provider in MusicProvider::ALL {
            assert_eq!(MusicProvider::from_str(provider.as_str()), Some(*provider));
        }
        assert_eq!(MusicProvider::from_str("tidal"), None);
    }

    #[test]
    fn the_six_providers_are_declared() {
        assert_eq!(MusicProvider::ALL.len(), 6);
    }

    #[test]
    fn the_sources_have_the_expected_kind() {
        assert_eq!(MediaSource::YoutubePrimary.kind(), ProviderKind::Embed);
        assert_eq!(
            MediaSource::YoutubeAlternative(0).kind(),
            ProviderKind::Embed
        );
        assert_eq!(
            MediaSource::SpotifyPreview.kind(),
            ProviderKind::PreviewAudio
        );
        assert_eq!(
            MediaSource::AmazonPreview.kind(),
            ProviderKind::PreviewAudio
        );
        assert_eq!(MediaSource::AppleMusic.kind(), ProviderKind::DeepLink);
    }

    #[test]
    fn the_provider_kinds_match_the_sources() {
        assert_eq!(provider_kind(MusicProvider::Youtube), ProviderKind::Embed);
        assert_eq!(
            provider_kind(MusicProvider::SpotifyFree),
            ProviderKind::PreviewAudio
        );
        assert_eq!(
            provider_kind(MusicProvider::AmazonMusic),
            ProviderKind::PreviewAudio
        );
        assert_eq!(
            provider_kind(MusicProvider::AppleMusic),
            ProviderKind::DeepLink
        );
    }

    #[test]
    fn only_the_preview_and_the_deep_link_are_portable() {
        assert!(!ProviderKind::Embed.is_portable());
        assert!(ProviderKind::PreviewAudio.is_portable());
        assert!(ProviderKind::DeepLink.is_portable());
    }
}
