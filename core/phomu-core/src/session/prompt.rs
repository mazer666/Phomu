//! The question of a round: the options, the hints and the view model.
//!
//! WHAT: the construction of the progress of a mode
//! ([`Session::build_progress`]) and of the view model of the question
//! phase ([`Session::question_view`]).
//!
//! WHY: the question phase is the phase in which the solution must not be
//! reachable. The view model is built here, in one place, so that every
//! mode is treated the same way and the shell cannot add a field that
//! carries the solution (docs/design/PLATFORM-ARCHITECTURE.md § 10.2).

use phomu_catalog::Song;

use crate::modes::{self, GameMode};
use crate::session::round::ModeProgress;
use crate::session::state::Session;
use crate::spoiler::censor::censor_hint;
use crate::spoiler::view::{
    DrawingView, Prompt, QuestionView, RevealView, RoundView, SongIdentity, SongSolution,
};

impl Session {
    /// Picks the mode of the next round.
    ///
    /// WHY: the mode is drawn from the modes that are enabled in the lobby.
    /// If the list is empty, the Timeline mode applies (GAME-041).
    pub(crate) fn pick_mode(&mut self) -> GameMode {
        let modes = self.state.config.selected_modes.clone();
        if modes.is_empty() {
            return GameMode::Timeline;
        }
        let index = self.rng.index(modes.len());
        modes.get(index).copied().unwrap_or(GameMode::Timeline)
    }

    /// Builds the progress of the mode for a drawn song.
    pub(crate) fn build_progress(&mut self, mode: GameMode, song: &Song) -> ModeProgress {
        let draw = self.rng.next_u64();
        let mut progress = ModeProgress::default();
        match mode {
            GameMode::Lyrics => {
                if let Some(lyrics) = song.lyrics.as_ref() {
                    let options = modes::lyrics::build_options(lyrics, draw);
                    progress.options = options.into_iter().map(|option| option.text).collect();
                }
            }
            GameMode::VibeCheck => {
                progress.options = modes::vibe_check::build_options(&song.mood, false, draw);
            }
            GameMode::CoverConfusion => {
                progress.cover_variation = Some(modes::cover_confusion::variant_for_draw(draw));
                progress.options = self.cover_confusion_options(song, draw);
            }
            GameMode::HintMaster => {
                progress.hint_level = 1;
            }
            GameMode::Timeline | GameMode::Survivor => {}
        }
        progress
    }

    /// The artist options of the Cover Confusion mode.
    ///
    /// WHY: the mode offers the original artist and two other artists of the
    /// catalogue (`src/components/game/modes/CoverConfusionMode.tsx:67-77`).
    /// The catalogue itself does not belong to the session; the pool of the
    /// artists is handed over when the session is created.
    fn cover_confusion_options(&self, song: &Song, draw: u64) -> Vec<String> {
        let wrong: Vec<String> = self
            .state
            .artist_pool
            .iter()
            .filter(|artist| *artist != &song.artist)
            .cloned()
            .collect();
        let mut options = modes::deterministic_shuffle(&wrong, draw);
        options.truncate(phomu_config::COVER_CONFUSION_CHOICE_COUNT - 1);
        options.push(song.artist.clone());
        modes::deterministic_shuffle(&options, draw ^ 0xc0de)
    }

    /// The playback window of the running round.
    ///
    /// EXAMPLE: the window of a Timeline round with the preview window
    /// from 30 to 60 seconds plays the song from 30 to 60 seconds.
    ///
    /// WHY: the offsets are a rule and not a player detail: the Hint-Master
    /// audio grows with the level (GAME-026), the Vibe-Check plays two
    /// minutes after the answer (GAME-030) and every other mode plays the
    /// window of the catalogue entry.
    pub fn playback_window(&self, revealed: bool) -> phomu_media::PlaybackWindow {
        let song = self.state.round.song.as_ref();
        let start = song
            .and_then(|song| song.preview_timestamp.as_ref())
            .map(|preview| preview.start)
            .unwrap_or_default();
        let mode = self.state.round.mode;
        let end = match mode {
            GameMode::HintMaster => {
                let (start, end) = crate::modes::hint_master::audio_window(
                    start,
                    self.state.round.progress.hint_level,
                    revealed,
                );
                Some(end.saturating_sub(start))
            }
            GameMode::VibeCheck => Some(phomu_config::VIBE_CHECK_PLAYBACK_SECONDS),
            _ => song
                .and_then(|song| song.preview_timestamp.as_ref())
                .map(|preview| preview.end.saturating_sub(preview.start)),
        };
        phomu_media::PlaybackWindow {
            start_seconds: start,
            end_seconds: end.map(|length| start.saturating_add(length)),
        }
    }

    /// The view model of the question phase.
    ///
    /// WHY: the hints are censored here, in the base, so that every
    /// platform censors identically (C-2). The identity of the song is only
    /// part of the question in the modes that declare it (C-6).
    pub(crate) fn question_view(&self, song: &Song) -> QuestionView {
        let mode = self.state.round.mode;
        let hints: Vec<String> = song
            .hints
            .iter()
            .map(|hint| censor_hint(hint, &song.artist, &song.title))
            .collect();
        let options = self.state.round.progress.options.clone();
        let reveals_identity = mode.reveals_identity()
            || (mode == GameMode::Survivor
                && crate::modes::survivor::artist_visible(
                    !self.state.round.answers.is_empty(),
                    self.state.round.progress.cheat_used,
                ));
        let prompt = if reveals_identity {
            Prompt::IdentityDisclosed {
                identity: SongIdentity {
                    title: song.title.clone(),
                    artist: song.artist.clone(),
                    year: song.year,
                },
                options,
            }
        } else {
            Prompt::Hidden { hints, options }
        };
        QuestionView {
            round_number: self.state.current_round,
            mode,
            prompt,
            points_possible: crate::session::ending::max_points_of(
                mode,
                &self.state.timeline_years,
                self.state.config.timeline_max_points,
            ),
            answers_locked: self.state.round.answers_locked,
        }
    }

    /// The identity of the song of the round, if there is one.
    ///
    /// WHY the identity leaves the base on an explicit command: the
    /// Hint-Master lets the pilot show the solution before the table
    /// answers, and the Survivor lets a player buy the name of the artist.
    /// The identity therefore never travels with the question view model —
    /// it is released when the round asks for it
    /// (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
    ///
    /// EXAMPLE: the pilot of a Hint-Master round asks for the identity and
    /// gets the title and the artist of the song.
    pub fn disclose_identity(&self) -> Option<SongIdentity> {
        self.state.round.song.as_ref().map(|song| SongIdentity {
            title: song.title.clone(),
            artist: song.artist.clone(),
            year: song.year,
        })
    }

    /// The view model of the drawing phase.
    ///
    /// WHY: the drawing phase knows nothing about the song; the shell only
    /// needs to know whether it has to draw automatically.
    pub(crate) fn drawing_view(&self, auto_draw: bool) -> RoundView {
        RoundView::Drawing(DrawingView {
            round_number: self.state.current_round,
            mode: self.state.round.mode,
            auto_draw,
        })
    }

    /// The view model of the reveal phase.
    ///
    /// WHY: the reveal is the only phase that carries the solution; the
    /// view model is built here so that the question phase cannot grow a
    /// field that would carry it.
    pub(crate) fn reveal_view(&self) -> RoundView {
        let song = self.state.round.song.as_ref();
        let last_answer = self.state.round.answers.last();
        RoundView::Reveal(RevealView {
            round_number: self.state.current_round,
            mode: self.state.round.mode,
            solution: SongSolution {
                title: song.map(|song| song.title.clone()).unwrap_or_default(),
                artist: song.map(|song| song.artist.clone()).unwrap_or_default(),
                year: song.map(|song| song.year).unwrap_or_default(),
            },
            is_correct: last_answer.map(|answer| answer.is_correct).unwrap_or(false),
            points_awarded: last_answer.map(|answer| answer.points_awarded).unwrap_or(0),
        })
    }
}
