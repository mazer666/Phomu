//! The audit of the media links of a catalogue.
//!
//! WHAT: for every song, the providers that can play it and the findings of
//! the audit.
//!
//! WHY: the base owns the media policy ([`phomu_media::MediaPlan`]). The
//! audit asks the base for the plan of every provider and reports what comes
//! out; it never decides which provider a song should use.

use phomu_catalog::{Song, is_http_url, is_youtube_url};
use phomu_media::{MediaPlan, MediaSources, MusicProvider, PlaybackWindow, ProviderKind};

/// One finding of the audit.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Finding {
    /// The identifier of the song the finding belongs to.
    pub song_id: String,
    /// How serious the finding is.
    pub severity: String,
    /// A stable, machine-readable description of the reason.
    pub kind: String,
    /// A human-readable detail.
    pub detail: String,
}

/// The audit of one song.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct SongAudit {
    /// The identifier of the song.
    pub song_id: String,
    /// The number of candidates of the plan of the preferred provider.
    pub candidates: usize,
    /// Whether at least one source is portable — a source a shell without an
    /// embedded player can use.
    pub has_portable_source: bool,
    /// Whether at least one source needs an embedded player.
    pub has_embed_source: bool,
    /// The findings of the audit.
    pub findings: Vec<Finding>,
}

/// The result of the audit of a whole catalogue.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize)]
pub struct AuditReport {
    /// The number of songs that were audited.
    pub songs: usize,
    /// The number of songs that no provider can play.
    pub unplayable: usize,
    /// The number of songs that only an embedded player can play.
    pub embed_only: usize,
    /// The number of songs that a portable source can play.
    pub portable: usize,
    /// The number of songs per provider that can play them.
    pub by_provider: std::collections::BTreeMap<String, usize>,
    /// The findings of the audit.
    pub findings: Vec<Finding>,
}

/// Audit one song of the catalogue against the media policy of the base.
///
/// # Errors
/// The function never fails: a song that cannot be played is a finding and
/// not an error of the tool.
pub fn audit_song(song: &Song) -> SongAudit {
    audit_entry(
        &song.id,
        &sources_of(song),
        window_of(song),
        &song.links.youtube,
    )
}

/// Audit one entry that carries the media sources of a song.
///
/// WHY: the audit needs the identifier of the song, its sources and its
/// playback window — not the whole catalogue model. The tool therefore does
/// not have to rebuild a [`Song`] it does not need.
pub fn audit_entry(
    song_id: &str,
    sources: &MediaSources,
    window: PlaybackWindow,
    youtube_link: &str,
) -> SongAudit {
    let plan = MediaPlan::build(MusicProvider::Youtube, sources, window);
    let candidates = plan.candidates();

    let has_embed_source = candidates
        .iter()
        .any(|candidate| candidate.kind == ProviderKind::Embed);
    let has_portable_source = candidates
        .iter()
        .any(|candidate| candidate.kind != ProviderKind::Embed);

    let mut findings = Vec::new();
    if candidates.is_empty() {
        findings.push(Finding {
            song_id: song_id.to_string(),
            severity: "error".to_string(),
            kind: "noPlayableSource".to_string(),
            detail: "the song has no source that any provider could play".to_string(),
        });
    } else if !has_portable_source {
        findings.push(Finding {
            song_id: song_id.to_string(),
            severity: "warning".to_string(),
            kind: "embedOnly".to_string(),
            detail: "only an embedded player can play the song".to_string(),
        });
    }

    let youtube = youtube_link;
    if !youtube.is_empty() && !is_youtube_url(youtube) {
        findings.push(Finding {
            song_id: song_id.to_string(),
            severity: "warning".to_string(),
            kind: "unexpectedYoutubeLink".to_string(),
            detail: format!("the YouTube link {youtube:?} is not a YouTube URL"),
        });
    }

    SongAudit {
        song_id: song_id.to_string(),
        candidates: candidates.len(),
        has_portable_source,
        has_embed_source,
        findings,
    }
}

/// The media sources of a song, in the shape the media policy expects.
pub fn sources_of(song: &Song) -> MediaSources {
    let links = &song.links;
    MediaSources {
        youtube: Some(links.youtube.clone()).filter(|link| !link.is_empty()),
        youtube_alternatives: links.youtube_alternatives.clone(),
        spotify_embed: links.spotify.clone(),
        spotify_preview: links.spotify_free_preview.clone(),
        amazon_embed: links.amazon_music.clone(),
        amazon_preview: links.amazon_prime_preview.clone(),
        apple_music: links.apple_music.clone(),
    }
}

/// The playback window of a song.
fn window_of(song: &Song) -> PlaybackWindow {
    match song.preview_timestamp {
        None => PlaybackWindow::default(),
        Some(preview) => PlaybackWindow {
            start_seconds: preview.start,
            end_seconds: Some(preview.end),
        },
    }
}

/// Audit a whole catalogue.
///
/// # Errors
/// The function never fails.
pub fn audit_catalogue(entries: &[(&str, MediaSources, PlaybackWindow, String)]) -> AuditReport {
    let mut report = AuditReport {
        songs: entries.len(),
        ..AuditReport::default()
    };

    for (song_id, sources, window, youtube) in entries {
        let audit = audit_entry(song_id, sources, *window, youtube);
        if audit.candidates == 0 {
            report.unplayable += 1;
        } else if audit.has_portable_source {
            report.portable += 1;
        } else {
            report.embed_only += 1;
        }

        for provider in direct_providers(sources) {
            *report
                .by_provider
                .entry(provider.as_str().to_string())
                .or_insert(0) += 1;
        }

        report.findings.extend(audit.findings);
    }

    report
}

/// The providers that have a source of their own for a song.
///
/// WHY: the plan of a provider always contains the YouTube fallback, so
/// "the plan is not empty" would say that every provider can play every
/// song. The report asks the question that matters: which provider carries
/// the song itself.
pub fn direct_providers(sources: &MediaSources) -> Vec<MusicProvider> {
    let mut providers = Vec::new();
    if sources.youtube.is_some() {
        providers.push(MusicProvider::Youtube);
    }
    if sources.spotify_embed.is_some() {
        providers.push(MusicProvider::SpotifyPremium);
    }
    if sources.spotify_preview.is_some() {
        providers.push(MusicProvider::SpotifyFree);
    }
    if sources.amazon_embed.is_some() {
        providers.push(MusicProvider::AmazonMusicPremium);
    }
    if sources.amazon_preview.is_some() {
        providers.push(MusicProvider::AmazonMusic);
    }
    if sources.apple_music.is_some() {
        providers.push(MusicProvider::AppleMusic);
    }
    providers
}

/// Whether a link of the catalogue is a well-formed HTTP URL.
///
/// WHY: the tool reports the shape of a link; the base decides what a link
/// means.
pub fn is_well_formed_url(link: &str) -> bool {
    is_http_url(link)
}
