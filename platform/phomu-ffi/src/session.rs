//! The exported functions of the bridge.
//!
//! WHAT: the commands a shell sends to the base and the answers it gets.
//!
//! WHY the functions are thin: a function of the bridge marshals its
//! arguments, calls the base and marshals the answer. It decides nothing —
//! the rules live in the base (docs/design/BUILD-CONTRACT.md § 2.4).
//!
//! EXAMPLE:
//!
//! ```text
//! let handle = phomu_session_new(config, players, teams, catalogue, 42, 0)?;
//! let view = phomu_session_start(handle, 0)?;
//! ```

use phomu_core::facade::ErrorCode;
use phomu_core::facade::{SelectionCriteria, Session, SongSource, select_song};

use crate::error::{PhomuError, failure, to_bridge_error};

use crate::answer::{PhomuAnswer, to_core_answer};
use crate::core_api::{
    from_core_reveal_view, from_core_round_view, from_core_score_snapshot, from_core_snapshot,
    to_core_config, to_core_player, to_core_team,
};
use crate::dto::{
    PhomuGameConfig, PhomuGameOverSnapshot, PhomuPlayer, PhomuScoreSnapshot, PhomuSessionHandle,
    PhomuSessionSnapshot, PhomuTeam,
};
use crate::registry::{SessionEntry, insert_catalogue, insert_session, session_of};
use crate::view::{PhomuRevealView, PhomuRoundView};

/// Open a catalogue.
///
/// # Errors
/// Returns a failure when the artefact cannot be read.
#[uniffi::export]
pub fn phomu_catalog_open(source: String) -> Result<crate::dto::PhomuCatalogHandle, PhomuError> {
    let catalogue = crate::catalogue::read_catalogue(&source)?;
    let id = insert_catalogue(catalogue);
    Ok(crate::catalogue::handle_of(id))
}

/// The packs of an open catalogue.
///
/// # Errors
/// Returns a failure when the handle is unknown.
#[uniffi::export]
pub fn phomu_catalog_packs(
    handle: crate::dto::PhomuCatalogHandle,
) -> Result<Vec<crate::dto::PhomuPackInfo>, PhomuError> {
    let registry = crate::registry::catalogue_of(handle.id)?;
    let Some(catalogue) = registry.catalogues.get(&handle.id) else {
        return Err(unknown_catalogue(handle.id));
    };
    Ok(catalogue
        .packs
        .iter()
        .map(|pack| {
            let song_count = catalogue
                .songs
                .iter()
                .filter(|song| song.packs.iter().any(|id| id == &pack.id))
                .count() as u32;
            crate::catalogue::pack_info(pack, song_count)
        })
        .collect())
}

/// The songs of an open catalogue, optionally of a list of packs.
///
/// # Errors
/// Returns a failure when the handle is unknown.
#[uniffi::export]
pub fn phomu_catalog_songs(
    handle: crate::dto::PhomuCatalogHandle,
    packs: Vec<String>,
) -> Result<Vec<crate::dto::PhomuSongSummary>, PhomuError> {
    let registry = crate::registry::catalogue_of(handle.id)?;
    let Some(catalogue) = registry.catalogues.get(&handle.id) else {
        return Err(unknown_catalogue(handle.id));
    };
    Ok(catalogue
        .songs
        .iter()
        .filter(|song| packs.is_empty() || song.packs.iter().any(|pack| packs.contains(pack)))
        .map(crate::catalogue::summary_of)
        .collect())
}

/// The kind of a provider, in the vocabulary of the wire.
///
/// WHY the spelling lives here: the base names its kinds in Rust; the wire
/// needs a spelling that a shell can switch on.
pub(crate) fn kind_of(provider: phomu_media::MusicProvider) -> &'static str {
    match phomu_media::provider_kind(provider) {
        phomu_media::ProviderKind::Embed => "embed",
        phomu_media::ProviderKind::PreviewAudio => "preview-audio",
        phomu_media::ProviderKind::DeepLink => "deep-link",
    }
}

/// The failure of a catalogue the registry does not know.
fn unknown_catalogue(id: u64) -> PhomuError {
    failure(
        ErrorCode::InvalidConfiguration,
        &[("catalogue", &id.to_string())],
    )
}

/// Create a session.
///
/// # Errors
/// Returns a failure when the configuration is not one the base knows.
#[uniffi::export]
pub fn phomu_session_new(
    config: PhomuGameConfig,
    players: Vec<PhomuPlayer>,
    teams: Vec<PhomuTeam>,
    catalogue: Option<crate::dto::PhomuCatalogHandle>,
    seed: u64,
    now_ms: u64,
) -> Result<PhomuSessionHandle, PhomuError> {
    let core_config = to_core_config(&config)?;
    let core_players: Vec<phomu_core::facade::Player> =
        players.iter().map(to_core_player).collect();
    let core_teams: Vec<phomu_core::facade::Team> = teams.iter().map(to_core_team).collect();
    let artist_pool = Vec::new();
    let session = Session::new(
        core_config,
        core_players,
        core_teams,
        artist_pool,
        seed,
        now_ms,
    )
    .map_err(|error| to_bridge_error(&error))?;
    let id = insert_session(SessionEntry {
        session,
        catalogue_id: catalogue.map(|handle| handle.id),
    });
    Ok(PhomuSessionHandle { id })
}

/// The state of a session.
///
/// # Errors
/// Returns a failure when the handle is unknown.
#[uniffi::export]
pub fn phomu_session_snapshot(
    handle: PhomuSessionHandle,
) -> Result<PhomuSessionSnapshot, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    Ok(from_core_snapshot(&entry.session.snapshot()))
}

/// The failure of a session the registry does not know.
fn unknown_session(id: u64) -> PhomuError {
    failure(
        ErrorCode::InvalidConfiguration,
        &[("session", &id.to_string())],
    )
}

/// Start the game.
///
/// # Errors
/// Returns a failure when the session cannot be started.
#[uniffi::export]
pub fn phomu_session_start(
    handle: PhomuSessionHandle,
    now_ms: u64,
) -> Result<PhomuRoundView, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    let view = entry
        .session
        .start_game(now_ms)
        .map_err(|error| to_bridge_error(&error))?;
    from_core_round_view(&view)
}

/// Draw a song and open the question phase.
///
/// WHY the source decides who draws: a scanned card carries its song in the
/// bytes of the shell, a random draw comes from the catalogue of the base.
///
/// # Errors
/// Returns a failure when the round cannot draw a song.
#[uniffi::export]
pub fn phomu_session_draw(
    handle: PhomuSessionHandle,
    source: String,
    song: Option<String>,
) -> Result<PhomuRoundView, PhomuError> {
    let mut registry = session_of(handle.id)?;

    // The draw is prepared before the session is borrowed mutably: the
    // catalogue and the session live in the same registry.
    let (core_song, core_source) = match source.as_str() {
        "qr" => {
            let json =
                song.ok_or_else(|| failure(ErrorCode::InvalidSongData, &[("reason", "no song")]))?;
            (crate::catalogue::read_single_song(&json)?, SongSource::Qr)
        }
        "random" => {
            let Some(entry) = registry.sessions.get(&handle.id) else {
                return Err(unknown_session(handle.id));
            };
            let catalogue_id = entry
                .catalogue_id
                .ok_or_else(|| failure(ErrorCode::CatalogueEmpty, &[("reason", "no catalogue")]))?;
            let criteria = criteria_of(&entry.session);
            let draw = entry.session.rng_state();
            let Some(catalogue) = registry.catalogues.get(&catalogue_id) else {
                return Err(unknown_catalogue(catalogue_id));
            };
            let selection = select_song(&catalogue.songs, &criteria, draw)
                .ok_or_else(|| failure(ErrorCode::CatalogueEmpty, &[("reason", "no song")]))?;
            (selection.song, SongSource::Random)
        }
        other => {
            return Err(failure(
                ErrorCode::InvalidConfiguration,
                &[("source", other)],
            ));
        }
    };

    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    let view = entry
        .session
        .draw_song(core_song, core_source)
        .map_err(|error| to_bridge_error(&error))?;
    from_core_round_view(&view)
}

/// The criteria of the next draw of a session.
fn criteria_of(session: &Session) -> SelectionCriteria {
    let state = session.state();
    SelectionCriteria {
        played_ids: state.played_song_ids.clone(),
        selected_packs: state.config.selected_packs.clone(),
        difficulty: match state.config.difficulty {
            phomu_core::facade::DifficultyFilter::All => None,
            phomu_core::facade::DifficultyFilter::Only(difficulty) => Some(difficulty),
        },
        only_qr_compatible: state.config.only_qr_compatible,
        mode_id: Some(state.round.mode.as_str().to_string()),
    }
}

/// Submit the answer of the active player.
///
/// # Errors
/// Returns a failure when the answer does not fit the mode of the round.
#[uniffi::export]
pub fn phomu_session_answer(
    handle: PhomuSessionHandle,
    answer: PhomuAnswer,
    answered_in_seconds: Option<u32>,
) -> Result<PhomuScoreSnapshot, PhomuError> {
    let core_answer = to_core_answer(&answer)?;
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    let snapshot = entry
        .session
        .submit_answer(&core_answer, answered_in_seconds)
        .map_err(|error| to_bridge_error(&error))?;
    Ok(from_core_score_snapshot(&snapshot))
}

/// Release the solution of the round.
///
/// WHY the reveal has its own type: the question phase must not be able to
/// carry the identity of the song (C-1).
///
/// # Errors
/// Returns a failure when the answers are not locked in.
#[uniffi::export]
pub fn phomu_session_reveal(handle: PhomuSessionHandle) -> Result<PhomuRevealView, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    let view = entry
        .session
        .reveal()
        .map_err(|error| to_bridge_error(&error))?;
    match view {
        phomu_core::facade::RoundView::Reveal(reveal) => Ok(from_core_reveal_view(&reveal)),
        _ => Err(failure(
            ErrorCode::NotAvailableInPhase,
            &[("phase", "reveal")],
        )),
    }
}

/// Close the round and prepare the next one.
///
/// # Errors
/// Returns a failure when the round cannot be closed.
#[uniffi::export]
pub fn phomu_session_next_round(
    handle: PhomuSessionHandle,
    now_ms: u64,
) -> Result<PhomuRoundView, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    let view = entry
        .session
        .next_round(now_ms)
        .map_err(|error| to_bridge_error(&error))?;
    from_core_round_view(&view)
}

/// End the game.
///
/// # Errors
/// Returns a failure when the game cannot be ended.
#[uniffi::export]
pub fn phomu_session_end(
    handle: PhomuSessionHandle,
    winner_id: Option<String>,
) -> Result<PhomuGameOverSnapshot, PhomuError> {
    let mut registry = session_of(handle.id)?;
    let Some(entry) = registry.sessions.get_mut(&handle.id) else {
        return Err(unknown_session(handle.id));
    };
    entry
        .session
        .end_game(winner_id.clone())
        .map_err(|error| to_bridge_error(&error))?;
    let snapshot = entry.session.snapshot();
    Ok(PhomuGameOverSnapshot {
        winner_id: snapshot.winner_id.clone(),
        round_count: snapshot.current_round,
        players: from_core_snapshot(&snapshot).players,
        team_scores: from_core_snapshot(&snapshot).team_scores,
    })
}
