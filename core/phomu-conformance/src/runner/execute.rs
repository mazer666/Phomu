//! The execution of the inputs of a vector.
//!
//! WHAT: the failure of an input ([`Failure`]), the execution of one input
//! ([`execute`]), the translation of a typed error of the core
//! ([`core_failure`]) and the filter probe ([`filter_songs`]).
//!
//! WHY: the execution is the only place where the rules of the core are
//! called. It lives in its own module because it is the part of the runner
//! with the highest correctness risk: a mistake here is a difference
//! between the two implementations that no vector of the corpus covers
//! (QA-09 backlog item 2.9).

use phomu_core::facade::{PhomuError, Session};

use crate::vector::{FilterOptions, Op, Vector, VectorAnswer};

use super::observation::{ObservedError, Observation};
use super::session::{build_config, parse_phase, parse_source};

/// The error codes of the vector level.
const ERROR_UNKNOWN_SONG: &str = "UNKNOWN_SONG";
const ERROR_NO_CURRENT_SONG: &str = "NO_CURRENT_SONG";

/// The failure of an input.
///
/// WHY: a failure of the core and a failure of the vector layer are two
/// different things. The failure of the core is a rule of the game — the
/// replay continues and the phase is recorded. The failure of the vector
/// layer means that the input cannot be executed at all — the replay ends.
pub(crate) struct Failure {
    /// The error of the vector level, if the failure is one.
    pub(crate) vector_error: Option<ObservedError>,
    /// The typed error of the core, if the input was refused by the rules.
    pub(crate) core_error: Option<ObservedError>,
}

impl Failure {
    /// A failure that carries no error — the input was not executed and no
    /// error situation was produced.
    const fn silent() -> Self {
        Failure {
            vector_error: None,
            core_error: None,
        }
    }
}

/// Executes one input of a vector.
pub(crate) fn execute(
    session: &mut Session,
    vector: &Vector,
    op: &Op,
    now_ms: &mut u64,
    observation: &mut Observation,
) -> Result<(), Failure> {
    match op {
        Op::StartGame => {
            session.start_game(*now_ms).map_err(core_failure)?;
        }
        Op::DrawSong { song_id, source } => {
            let Some(song) = vector.song(song_id) else {
                return Err(Failure {
                    vector_error: Some(ObservedError {
                        code: ERROR_UNKNOWN_SONG.to_string(),
                        message: format!("the vector has no song {song_id:?}"),
                    }),
                    core_error: None,
                });
            };
            let source = source
                .as_deref()
                .and_then(parse_source)
                .unwrap_or(phomu_core::facade::SongSource::Random);
            session.draw_song(song, source).map_err(core_failure)?;
        }
        Op::AdvancePhase { phase } => {
            let Some(phase) = parse_phase(phase) else {
                return Err(Failure::silent());
            };
            session.advance_phase(phase).map_err(core_failure)?;
        }
        Op::SubmitAnswer {
            player_id,
            answer,
            is_correct,
            points_awarded,
            answered_in_seconds,
        } => {
            session
                .submit_answer_raw(
                    player_id,
                    answer,
                    *is_correct,
                    *points_awarded,
                    *answered_in_seconds,
                )
                .map_err(core_failure)?;
        }
        Op::AwardPoints { entity_id, points } => {
            session
                .award_points(entity_id, *points)
                .map_err(core_failure)?;
        }
        Op::NextRound => {
            session.next_round(*now_ms).map_err(core_failure)?;
        }
        Op::EndGame { winner_id } => {
            session.end_game(winner_id.clone()).map_err(core_failure)?;
        }
        Op::SkipBrokenSong => {
            session.skip_broken_song().map_err(core_failure)?;
        }
        Op::InitTimeline { years } => {
            session.init_timeline(years.clone()).map_err(core_failure)?;
        }
        Op::AddTimelineYear { year } => {
            session.add_timeline_year(*year).map_err(core_failure)?;
        }
        Op::RemoveTimelineYear { year } => {
            session.remove_timeline_year(*year).map_err(core_failure)?;
        }
        Op::AssignPlayerToTeam { player_id, team_id } => {
            session
                .assign_player_to_team(player_id, team_id.as_deref())
                .map_err(core_failure)?;
        }
        Op::RemoveTeam { team_id } => {
            session.remove_team(team_id).map_err(core_failure)?;
        }
        Op::ResetScores => {
            session.reset_scores();
        }
        Op::SetConfig { config } => {
            let config = build_config(&crate::vector::Given {
                config: config.clone(),
                ..crate::vector::Given::default()
            })
            .map_err(|_| Failure::silent())?;
            session.set_config(config);
        }
        Op::SetNow { ms } => {
            *now_ms = *ms;
        }
        Op::Answer {
            mode: _mode,
            answer,
            answered_in_seconds,
        } => {
            if session.state().round.song.is_none() {
                return Err(Failure {
                    vector_error: Some(ObservedError {
                        code: ERROR_NO_CURRENT_SONG.to_string(),
                        message: "the answer input needs a drawn song".to_string(),
                    }),
                    core_error: None,
                });
            }
            if let VectorAnswer::Timeline { slot } = answer {
                if slot.is_none() {
                    // Without a selection the mode does nothing — the
                    // reference implementation aborts the reveal
                    // (`src/components/game/modes/TimelineMode.tsx:175`).
                    return Ok(());
                }
            }
            let answer = Vector::mode_answer(answer).map_err(|_| Failure::silent())?;
            session
                .submit_answer(&answer, *answered_in_seconds)
                .map_err(core_failure)?;
        }
        Op::Cheat { cheat } => {
            let Some(cheat) = Vector::cheat(cheat) else {
                return Err(Failure::silent());
            };
            session.use_cheat(cheat).map_err(core_failure)?;
        }
        Op::CensorHint {
            hint,
            artist,
            title,
        } => {
            observation.censor_hint = Some(phomu_core::facade::censor_hint(hint, artist, title));
        }
        Op::FilterSongs { options } => {
            observation.filtered_song_ids = Some(filter_songs(vector, options));
        }
    }
    Ok(())
}

/// The songs that survive the filters of a probe.
///
/// WHY: the probe uses the filter of the catalogue and not a second
/// implementation, so that the probe and the draw cannot drift apart.
fn filter_songs(vector: &Vector, options: &FilterOptions) -> Vec<String> {
    let catalogue = vector.catalogue();
    let difficulty = options
        .difficulty
        .as_deref()
        .and_then(phomu_core::facade::Difficulty::from_str);
    let criteria = phomu_core::facade::SelectionCriteria {
        played_ids: Vec::new(),
        selected_packs: options.selected_packs.clone(),
        difficulty,
        only_qr_compatible: options.only_qr_compatible,
        mode_id: options.current_mode.clone(),
    };
    let (pool, _fallbacks) = phomu_core::facade::filter_pool(&catalogue, &criteria);
    pool.iter().map(|song| song.id.clone()).collect()
}

/// Turns a typed error of the core into the error situation of the
/// observation.
///
/// WHY: the refusal of the core is a part of its contract — the errors are
/// typed and exhaustive (CORE-111) and the promise of the same named error
/// situations on every platform
/// ([`../../docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md)
/// § 1.4) is only checkable when the observation carries the refusal. The
/// identifiers that are used are the two that the core already owns: the
/// numeric code and the i18n message key.
///
/// EXAMPLE: the refusal of an unknown player becomes the error
/// `{ code: "1004", message: "errors.unknownPlayer" }`.
fn core_failure(error: PhomuError) -> Failure {
    Failure {
        vector_error: None,
        core_error: Some(ObservedError {
            code: error.code().code().to_string(),
            message: error.message_key().to_string(),
        }),
    }
}
