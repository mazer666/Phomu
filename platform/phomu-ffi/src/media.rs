//! The media plan and the message keys of the bridge.
//!
//! WHAT: the plan the base hands to the shell for the media of the running
//! round, and the mapping of a game event onto its i18n key.
//!
//! WHY the plan and not a decision: the base decides *what* is played and in
//! which order, the shell decides *how*
//! (docs/design/PLATFORM-ARCHITECTURE.md § 8.3).
//!
//! WHY the keys and not the texts: the base supplies the keys, the shell
//! supplies the texts (docs/design/BUILD-CONTRACT.md § 6.1).
//!
//! EXAMPLE:
//!
//! ```text
//! let plan = phomu_media_plan(handle)?;
//! let key = phomu_message_key("answer-correct".to_string());
//! ```

use phomu_core::facade::ErrorCode;
use phomu_core::facade::{GameEvent, MediaPlan, MediaSource, MediaSources, PlaybackWindow};

use crate::error::{PhomuError, failure};

use crate::dto::{PhomuMediaCandidate, PhomuMediaPlan, PhomuSessionHandle};
use crate::registry::session_of;

/// The events of the base and the identifiers the shells use for them.
///
/// WHY the identifiers live here: the base names its events in Rust; the
/// wire needs a spelling. The table is the whole vocabulary, so that a
/// shell cannot invent an event that the base does not know.
const GAME_EVENTS: &[(&str, GameEvent)] = &[
    ("phase-drawing", GameEvent::PhaseDrawing),
    ("phase-question", GameEvent::PhaseQuestion),
    ("phase-locked-in", GameEvent::PhaseLockedIn),
    ("phase-reveal", GameEvent::PhaseReveal),
    ("phase-scoring", GameEvent::PhaseScoring),
    ("answer-correct", GameEvent::AnswerCorrect),
    ("answer-incorrect", GameEvent::AnswerIncorrect),
    ("last-round", GameEvent::LastRound),
    ("round-discarded", GameEvent::RoundDiscarded),
    ("cheat-decade-hint", GameEvent::CheatDecadeHint),
    ("cheat-joker", GameEvent::CheatJoker),
    ("cheat-music", GameEvent::CheatMusic),
    ("cheat-artist", GameEvent::CheatArtist),
    ("media-unavailable", GameEvent::MediaUnavailable),
    ("media-blocked", GameEvent::MediaBlocked),
    ("media-failed", GameEvent::MediaFailed),
    ("media-timed-out", GameEvent::MediaTimedOut),
    ("media-auto-skip", GameEvent::MediaAutoSkip),
    ("media-no-video", GameEvent::MediaNoVideo),
    ("game-won", GameEvent::GameWon),
    ("game-drawn", GameEvent::GameDrawn),
    ("teams-shifted", GameEvent::TeamsShifted),
];

/// The plan of the base for the media of the running round.
///
/// # Errors
/// Returns a failure when no song is drawn.
#[uniffi::export]
pub fn phomu_media_plan(handle: PhomuSessionHandle) -> Result<PhomuMediaPlan, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(failure(
            ErrorCode::InvalidConfiguration,
            &[("session", &handle.id.to_string())],
        ));
    };
    let state = entry.session.state();
    let song = state
        .round
        .song
        .as_ref()
        .ok_or_else(|| failure(ErrorCode::NoSongDrawn, &[]))?;

    let sources = MediaSources {
        youtube: Some(song.links.youtube.clone()).filter(|link| !link.is_empty()),
        youtube_alternatives: song.links.youtube_alternatives.clone(),
        spotify_embed: song.links.spotify.clone(),
        spotify_preview: song.links.spotify_free_preview.clone(),
        amazon_embed: song.links.amazon_music.clone(),
        amazon_preview: song.links.amazon_prime_preview.clone(),
        apple_music: song.links.apple_music.clone(),
    };
    let window = match song.preview_timestamp {
        None => PlaybackWindow::default(),
        Some(preview) => PlaybackWindow {
            start_seconds: preview.start,
            end_seconds: Some(preview.end),
        },
    };
    let plan = MediaPlan::build(state.config.preferred_music_provider, &sources, window);

    Ok(PhomuMediaPlan {
        candidates: plan
            .candidates()
            .iter()
            .map(|candidate| PhomuMediaCandidate {
                source: source_name(candidate.source.clone()).to_string(),
                kind: kind_name(candidate.kind).to_string(),
                location: candidate.location.clone(),
            })
            .collect(),
        start_seconds: plan.window().start_seconds,
        end_seconds: plan.window().end_seconds,
    })
}

/// The i18n key of a game event.
///
/// WHY an unknown event answers with an empty string: the key space is
/// closed; an event that the base does not know has no key, and a shell that
/// asks for it learns that it is wrong.
///
/// EXAMPLE: the key of `answer-correct` is `"game.feedback.correct"`.
#[uniffi::export]
pub fn phomu_message_key(event: String) -> String {
    let Some((_, game_event)) = GAME_EVENTS.iter().find(|(name, _)| *name == event) else {
        return String::new();
    };
    phomu_core::facade::message_key(*game_event)
        .as_str()
        .to_string()
}

/// The identifier of a source of the media plan.
fn source_name(source: MediaSource) -> &'static str {
    match source {
        MediaSource::YoutubePrimary => "youtube-primary",
        MediaSource::YoutubeAlternative(_) => "youtube-alternative",
        MediaSource::SpotifyEmbed => "spotify-embed",
        MediaSource::SpotifyPreview => "spotify-preview",
        MediaSource::AmazonEmbed => "amazon-embed",
        MediaSource::AmazonPreview => "amazon-preview",
        MediaSource::AppleMusic => "apple-music",
    }
}

/// The identifier of a kind of a source.
///
/// WHY the spelling lives here: the base names its kinds in Rust; the wire
/// needs a spelling that a shell can switch on.
fn kind_name(kind: phomu_core::facade::ProviderKind) -> &'static str {
    match kind {
        phomu_core::facade::ProviderKind::Embed => "embed",
        phomu_core::facade::ProviderKind::PreviewAudio => "preview-audio",
        phomu_core::facade::ProviderKind::DeepLink => "deep-link",
    }
}
