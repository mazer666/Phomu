//! The view models of a round, as the web shell receives them.
//!
//! WHAT: the JSON of the question phase ([`question_payload`]), of the reveal
//! phase ([`reveal_payload`]) and of the feedback of a submitted answer
//! ([`feedback_payload`]).
//!
//! WHY the payloads live in the bridge: the base decides *what* a phase may
//! show — the question view model has no field for the solution
//! (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1). The bridge only
//! marshals that decision into the wire format of the shell and adds the
//! data a shell needs to *draw* the phase: the media of the round and the
//! context of the mode.
//!
//! EXAMPLE: the question payload of a Timeline round carries the censored
//! hints, the slots of the timeline and the media — and no year of the song.

use phomu_core::facade::{GameMode, RoundView, Session};
use serde_json::{Value, json};

use crate::catalogue::song_to_json;

/// The media of the running round.
///
/// WHY the links travel with the question: the player has to hear the song
/// before he can answer. The links are therefore part of the question and
/// not part of the solution — they name no title and no artist.
fn media_of(session: &Session, song: Option<&phomu_catalog::Song>) -> Value {
    let window = session.playback_window(false);
    let Some(song) = song else {
        return json!({
            "youtube": "",
            "youtubeAlternatives": Vec::<String>::new(),
            "spotify": Value::Null,
            "spotifyFreePreview": Value::Null,
            "amazonMusic": Value::Null,
            "amazonPrimePreview": Value::Null,
            "coverLink": Value::Null,
            "startSeconds": window.start_seconds,
            "endSeconds": window.end_seconds,
        });
    };
    let mut alternatives = song.links.youtube_alternatives.clone();
    if let Some(fallback) = song.links.fallback_youtube_id.as_ref() {
        if !alternatives.iter().any(|link| link == fallback) {
            alternatives.push(fallback.clone());
        }
    }
    json!({
        "youtube": song.links.youtube,
        "youtubeAlternatives": alternatives,
        "spotify": song.links.spotify,
        "spotifyFreePreview": song.links.spotify_free_preview,
        "amazonMusic": song.links.amazon_music,
        "amazonPrimePreview": song.links.amazon_prime_preview,
        "coverLink": song.links.cover_link,
        "startSeconds": window.start_seconds,
        "endSeconds": window.end_seconds,
    })
}

/// The context of the mode, as the shell needs it to draw the question.
///
/// WHY the slots of the timeline travel with the question: the Timeline mode
/// places the song between the years that are already on the timeline. The
/// slots therefore depend on the year of the song — they are computed by the
/// base and never by the shell.
fn context_of(session: &Session, mode: GameMode, song: Option<&phomu_catalog::Song>) -> Value {
    let years = session.state().timeline_years.clone();
    let mut context = json!({
        "timelineYears": years,
        "timelineSlots": Vec::<usize>::new(),
        "genre": "",
        "pack": "",
        "coverVariation": Value::Null,
    });
    let Some(song) = song else {
        return context;
    };
    if let Some(object) = context.as_object_mut() {
        object.insert("genre".to_string(), json!(song.genre));
        object.insert("pack".to_string(), json!(song.packs.first()));
        if mode == GameMode::Timeline {
            let slots: Vec<usize> = phomu_core::facade::valid_slots(song.year, &years)
                .into_iter()
                .collect();
            object.insert("timelineSlots".to_string(), json!(slots));
        }
    }
    context
}

/// The JSON of the question phase.
///
/// WHY there is no title, no artist and no year: the question view model of
/// the base has no field for the solution, and the bridge does not add one.
/// The identity is only part of the payload in the modes that declare it
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// EXAMPLE: the payload of a Lyrics Labyrinth round carries four options and
/// no marking that would name the invented one.
pub fn question_payload(view: &RoundView, session: &Session) -> Value {
    let RoundView::Question(question) = view else {
        return json!({ "phase": "question" });
    };
    let song = session.state().round.song.as_ref();
    let identity = question.prompt.identity().map(|identity| {
        json!({
            "title": identity.title,
            "artist": identity.artist,
            "year": identity.year,
        })
    });
    json!({
        "phase": "question",
        "roundNumber": question.round_number,
        "mode": question.mode.as_str(),
        "hints": question.prompt.hints(),
        "options": question.prompt.options(),
        "identity": identity,
        "pointsPossible": question.points_possible,
        "answersLocked": question.answers_locked,
        "songId": song.map(|song| song.id.clone()).unwrap_or_default(),
        "media": media_of(session, song),
        "context": context_of(session, question.mode, song),
    })
}

/// The JSON of the reveal phase.
///
/// WHY the whole entry travels here: the reveal is the phase in which the
/// solution is released. The question phase never carries it
/// (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
///
/// EXAMPLE: the payload of the reveal names the title, the artist and the
/// year of the song.
pub fn reveal_payload(view: &RoundView, session: &Session) -> Value {
    let RoundView::Reveal(reveal) = view else {
        return json!({ "phase": "reveal" });
    };
    let song = session.state().round.song.as_ref();
    json!({
        "phase": "reveal",
        "roundNumber": reveal.round_number,
        "mode": reveal.mode.as_str(),
        "title": reveal.solution.title,
        "artist": reveal.solution.artist,
        "year": reveal.solution.year,
        "isCorrect": reveal.is_correct,
        "pointsAwarded": reveal.points_awarded,
        "timelineYears": session.state().timeline_years.clone(),
        "song": song.map(song_to_json),
    })
}

/// The JSON of the view of the running round, whatever phase it is in.
///
/// EXAMPLE: the payload of a drawing round carries the number of the round
/// and the mode.
pub fn round_payload(view: &RoundView, session: &Session) -> Value {
    match view {
        RoundView::Question(_) => question_payload(view, session),
        RoundView::Reveal(_) => reveal_payload(view, session),
        RoundView::Drawing(drawing) => json!({
            "phase": "drawing",
            "roundNumber": drawing.round_number,
            "mode": drawing.mode.as_str(),
            "autoDraw": drawing.auto_draw,
        }),
        RoundView::Scoring(scoring) => json!({
            "phase": "scoring",
            "roundNumber": scoring.round_number,
            "winnerId": scoring.winner_id,
        }),
    }
}

/// The JSON of the feedback of a submitted answer.
///
/// WHY the feedback carries the solution: the answer of the player is in, so
/// the round may show what it was worth and what the song was. The feedback
/// is therefore released together with the answer and not before
/// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-3).
///
/// EXAMPLE: the feedback of a Lyrics Labyrinth round names the invented
/// line, so that the shell can mark it.
pub fn feedback_payload(session: &Session, mode: GameMode) -> Value {
    let song = session.state().round.song.as_ref();
    let Some(song) = song else {
        return json!({ "identity": Value::Null, "detail": json!({}) });
    };
    let identity = json!({
        "title": song.title,
        "artist": song.artist,
        "year": song.year,
    });
    let years = session.state().timeline_years.clone();
    let detail = match mode {
        GameMode::Timeline => {
            let effect = phomu_core::facade::apply_year(&years, song.year);
            json!({
                "year": song.year,
                "slot": phomu_core::facade::canonical_slot(song.year, &years),
                "effect": {
                    "isDuplicate": effect.is_duplicate,
                    "removalOffered": effect.removal_offered,
                },
            })
        }
        GameMode::Lyrics => json!({
            "inventedLine": song
                .lyrics
                .as_ref()
                .and_then(|lyrics| lyrics.fake.first())
                .cloned()
                .unwrap_or_default(),
        }),
        GameMode::VibeCheck => json!({
            "correctMood": song.mood.first().cloned().unwrap_or_default(),
        }),
        GameMode::Survivor => json!({
            "isOneHitWonder": song.is_one_hit_wonder,
        }),
        GameMode::HintMaster | GameMode::CoverConfusion => json!({}),
    };
    json!({
        "identity": identity,
        "genre": song.genre,
        "detail": detail,
    })
}
