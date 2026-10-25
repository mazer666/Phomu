//! The playback plan and the fallback chain.
//!
//! WHAT: [`MediaPlan`] — the ordered list of the sources that may be
//! played, together with the playback window — and the rule that decides
//! which source follows a failed one.
//!
//! WHY: the order is a rule and the fallback behaviour is a rule. The
//! reference implementation keeps both in the component
//! `src/components/game/MusicPlayer.tsx`; a shell that builds its own plan
//! would build a different one. The rule is the one of
//! `docs/design/PLATFORM-ARCHITECTURE.md` § 8.8:
//!
//! ```text
//! unavailable or blocked → try the next provider of the same kind
//! no provider left       → the song cannot be played
//!                         → the auto-skip policy applies
//!                         → the phase returns to `drawing`
//!                         → the shell shows the named error state
//! ```

use crate::provider::{MediaSource, MediaSources, MusicProvider, ProviderKind, provider_kind};

/// The part of the song that is played.
///
/// WHY: the window is a rule and not a player detail: the Hint-Master audio
/// grows with the level, the Vibe-Check plays two minutes after the answer
/// and every other mode plays the window of the catalogue entry.
///
/// EXAMPLE: the default window starts at zero and has no end.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct PlaybackWindow {
    /// The offset in seconds at which the playback starts.
    pub start_seconds: u32,
    /// The offset in seconds at which the playback stops. `None` plays the
    /// song to its end.
    pub end_seconds: Option<u32>,
}

/// One source the shell may play.
///
/// WHY: the candidate carries the kind of the source, so that a shell can
/// tell before the round starts whether it can play the plan at all
/// (docs/design/PLATFORM-ARCHITECTURE.md § 8.2).
///
/// EXAMPLE: the primary YouTube link is a candidate of the kind `Embed`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderCandidate {
    /// The source of the song.
    pub source: MediaSource,
    /// The kind of the source.
    pub kind: ProviderKind,
    /// The location the shell has to open. It is empty for a deep link that
    /// the catalogue does not carry.
    pub location: String,
}

/// The plan the shell receives instead of deciding the policy itself.
///
/// WHY: the shell decides *how* the song is played, the base decides *what*
/// and *in which order* (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
///
/// EXAMPLE: a song with only a YouTube link produces a plan with one
/// candidate.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaPlan {
    candidates: Vec<ProviderCandidate>,
    window: PlaybackWindow,
}

impl MediaPlan {
    /// Builds the plan for a song.
    ///
    /// WHY: the order of the sources is a rule and not a player detail; the
    /// order is the one of the reference implementation
    /// (`docs/design/GAME-CONTRACT.md` § 8.3): the preferred provider comes
    /// first — if the song has a source for it — and the YouTube chain is
    /// the universal fallback. The remaining sources follow in the
    /// canonical order, so that a shell that does not support the preferred
    /// provider still has something to play.
    ///
    /// EXAMPLE: a song with only a YouTube link and the preference
    /// `SpotifyFree` produces a plan with the YouTube source.
    pub fn build(preferred: MusicProvider, sources: &MediaSources, window: PlaybackWindow) -> Self {
        let mut candidates: Vec<ProviderCandidate> = Vec::new();

        if let Some(candidate) = candidate_for(preferred, sources) {
            candidates.push(candidate);
        }

        if let Some(youtube) = sources.youtube.as_ref() {
            candidates.push(ProviderCandidate {
                source: MediaSource::YoutubePrimary,
                kind: ProviderKind::Embed,
                location: youtube.clone(),
            });
        }
        for (index, alternative) in sources.youtube_alternatives.iter().enumerate() {
            candidates.push(ProviderCandidate {
                source: MediaSource::YoutubeAlternative(index),
                kind: ProviderKind::Embed,
                location: alternative.clone(),
            });
        }

        for candidate in [
            candidate_for(MusicProvider::SpotifyPremium, sources),
            candidate_for(MusicProvider::SpotifyFree, sources),
            candidate_for(MusicProvider::AmazonMusicPremium, sources),
            candidate_for(MusicProvider::AmazonMusic, sources),
            candidate_for(MusicProvider::AppleMusic, sources),
        ]
        .into_iter()
        .flatten()
        {
            candidates.push(candidate);
        }

        // A source appears exactly once in the plan, at the position of the
        // highest priority.
        let mut unique: Vec<ProviderCandidate> = Vec::new();
        for candidate in candidates {
            if !unique
                .iter()
                .any(|existing| existing.source == candidate.source)
            {
                unique.push(candidate);
            }
        }

        Self {
            candidates: unique,
            window,
        }
    }

    /// The sources of the plan, in the order they have to be tried.
    ///
    /// WHY: the shell walks the list from the front; the order therefore
    /// carries the policy.
    ///
    /// EXAMPLE: the first candidate of a YouTube plan is the primary link.
    pub fn candidates(&self) -> &[ProviderCandidate] {
        &self.candidates
    }

    /// The playback window of the plan.
    ///
    /// EXAMPLE: the default window starts at zero and has no end.
    pub const fn window(&self) -> &PlaybackWindow {
        &self.window
    }

    /// Whether the plan contains nothing that could be played.
    ///
    /// WHY: the shell needs to know before the round starts whether it can
    /// play the song at all — the auto-skip policy applies otherwise.
    ///
    /// EXAMPLE: a song without any link produces an empty plan.
    pub fn is_empty(&self) -> bool {
        self.candidates.is_empty()
    }

    /// The source that follows a failed one.
    ///
    /// WHY: the fallback stays inside the kind of the failed source. A shell
    /// that can play a preview URL cannot play an embed, and the plan must
    /// not send it there.
    ///
    /// Returns `None` when the chain of that kind is exhausted — the song
    /// cannot be played and the auto-skip policy applies.
    ///
    /// EXAMPLE: with a plan of a YouTube source and two alternatives, the
    /// first alternative follows the primary source.
    pub fn next_candidate(&self, index: usize, kind: ProviderKind) -> Option<&ProviderCandidate> {
        self.candidates
            .iter()
            .skip(index.saturating_add(1))
            .find(|candidate| candidate.kind == kind)
    }

    /// The index of the first candidate of a kind.
    ///
    /// WHY: the shell starts at the first candidate of the kind it can play
    /// and walks the chain from there.
    ///
    /// EXAMPLE: `plan.index_of_kind(ProviderKind::Embed)` is `Some(0)` for a
    /// YouTube plan.
    pub fn index_of_kind(&self, kind: ProviderKind) -> Option<usize> {
        self.candidates
            .iter()
            .position(|candidate| candidate.kind == kind)
    }

    /// The kind of the preferred provider, for the shell to check whether it
    /// can play the plan at all.
    ///
    /// EXAMPLE: the preferred provider `SpotifyFree` has the kind
    /// `PreviewAudio`.
    pub const fn preferred_kind(preferred: MusicProvider) -> ProviderKind {
        provider_kind(preferred)
    }
}

/// The candidate of a provider, if the song has a source for it.
fn candidate_for(provider: MusicProvider, sources: &MediaSources) -> Option<ProviderCandidate> {
    let (source, kind, location) = match provider {
        MusicProvider::Youtube => (
            MediaSource::YoutubePrimary,
            ProviderKind::Embed,
            sources.youtube.clone()?,
        ),
        MusicProvider::SpotifyFree => (
            MediaSource::SpotifyPreview,
            ProviderKind::PreviewAudio,
            sources.spotify_preview.clone()?,
        ),
        MusicProvider::SpotifyPremium => (
            MediaSource::SpotifyEmbed,
            ProviderKind::Embed,
            sources.spotify_embed.clone()?,
        ),
        MusicProvider::AmazonMusic => (
            MediaSource::AmazonPreview,
            ProviderKind::PreviewAudio,
            sources.amazon_preview.clone()?,
        ),
        MusicProvider::AmazonMusicPremium => (
            MediaSource::AmazonEmbed,
            ProviderKind::Embed,
            sources.amazon_embed.clone()?,
        ),
        MusicProvider::AppleMusic => (
            MediaSource::AppleMusic,
            ProviderKind::DeepLink,
            sources.apple_music.clone()?,
        ),
    };
    Some(ProviderCandidate {
        source,
        kind,
        location,
    })
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{MediaPlan, MediaSources, MusicProvider, PlaybackWindow, ProviderKind};

    fn sources() -> MediaSources {
        MediaSources {
            youtube: Some("youtube".to_string()),
            youtube_alternatives: vec!["alt-1".to_string(), "alt-2".to_string()],
            spotify_embed: Some("spotify-embed".to_string()),
            spotify_preview: Some("spotify-preview".to_string()),
            amazon_embed: Some("amazon-embed".to_string()),
            amazon_preview: Some("amazon-preview".to_string()),
            apple_music: Some("apple".to_string()),
        }
    }

    #[test]
    fn the_preferred_provider_comes_first() {
        let plan = MediaPlan::build(
            MusicProvider::SpotifyFree,
            &sources(),
            PlaybackWindow::default(),
        );
        assert_eq!(
            plan.candidates().first().map(|c| c.location.as_str()),
            Some("spotify-preview")
        );
    }

    #[test]
    fn the_youtube_chain_is_the_universal_fallback() {
        let plan = MediaPlan::build(
            MusicProvider::AppleMusic,
            &sources(),
            PlaybackWindow::default(),
        );
        let locations: Vec<&str> = plan
            .candidates()
            .iter()
            .map(|candidate| candidate.location.as_str())
            .collect();
        let youtube = locations
            .iter()
            .position(|location| *location == "youtube")
            .expect("a youtube candidate");
        assert!(youtube > 0);
        assert_eq!(locations.get(youtube + 1).copied(), Some("alt-1"));
        assert_eq!(locations.get(youtube + 2).copied(), Some("alt-2"));
    }

    #[test]
    fn the_fallback_stays_inside_the_kind() {
        let plan = MediaPlan::build(
            MusicProvider::SpotifyFree,
            &sources(),
            PlaybackWindow::default(),
        );
        let preview = plan.index_of_kind(ProviderKind::PreviewAudio);
        assert!(preview.is_some());
        let next = plan.next_candidate(preview.unwrap_or(0), ProviderKind::PreviewAudio);
        assert!(next.is_some());
        assert_eq!(next.map(|c| c.kind), Some(ProviderKind::PreviewAudio));
    }

    #[test]
    fn an_exhausted_chain_has_no_next_candidate() {
        let mut only_youtube = sources();
        only_youtube.spotify_embed = None;
        only_youtube.spotify_preview = None;
        only_youtube.amazon_embed = None;
        only_youtube.amazon_preview = None;
        only_youtube.apple_music = None;
        only_youtube.youtube_alternatives.clear();
        let plan = MediaPlan::build(
            MusicProvider::Youtube,
            &only_youtube,
            PlaybackWindow::default(),
        );
        let index = plan.index_of_kind(ProviderKind::Embed);
        assert!(index.is_some());
        assert!(
            plan.next_candidate(index.unwrap_or(0), ProviderKind::Embed)
                .is_none()
        );
    }

    #[test]
    fn a_song_without_any_source_produces_an_empty_plan() {
        let plan = MediaPlan::build(
            MusicProvider::Youtube,
            &MediaSources::default(),
            PlaybackWindow::default(),
        );
        assert!(plan.is_empty());
    }

    #[test]
    fn the_preferred_source_is_not_repeated() {
        let plan = MediaPlan::build(
            MusicProvider::Youtube,
            &sources(),
            PlaybackWindow::default(),
        );
        let youtube = plan
            .candidates()
            .iter()
            .filter(|candidate| candidate.location == "youtube")
            .count();
        assert_eq!(youtube, 1);
    }
}
