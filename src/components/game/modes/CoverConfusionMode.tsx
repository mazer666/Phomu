/**
 * Cover confusion mode
 *
 * A cover song is playing. Goal: guess the original artist.
 *
 * Point system (the fewer hints, the more points):
 *   No hint    → 5 points (honour system: the player decides)
 *   1 text hint → 4 points (honour system)
 *   2 text hints → 3 points (honour system)
 *   3rd hint = 3 options → 2 points (the app decides)
 *
 * No text input: honour system or multiple choice.
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { RoundQuestion, SongIdentity } from '@/core/types';
import { submit } from '@/core/session-service';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';
import { coverConfusionPoints } from '@/utils/mode-rules';

type Phase = 'listening' | 'self-assess' | 'choice' | 'done';

interface CoverConfusionModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal?: () => void;
}

export function CoverConfusionMode({
  question,
  onAnswer,
  onReveal,
}: CoverConfusionModeProps) {
  const { t, i18n } = useTranslation();
  const [hintsUsed, setHintsUsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('listening');
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [identity, setIdentity] = useState<SongIdentity | null>(null);

  // 50% chance for "Original or Cover" variation - stabilized in state
  const [variation] = useState(() =>
    Math.random() > 0.5 ? 'who-is-it' : 'original-or-cover'
  );

  const points = coverConfusionPoints(hintsUsed);
  const playLink = question.media.coverLink || question.media.youtube;
  const spicyMessage = useSpicyMessage(wasCorrect!, question.songId);

  // Number format of the active locale
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  // The artists of the multiple choice come from the core: the core knows
  // which one of them is the original artist.
  const choiceOptions = question.options;

  function handleGetHint() {
    if (hintsUsed < 2) {
      setHintsUsed((h) => h + 1);
    } else {
      // 3rd "hint" = multiple choice
      setHintsUsed(3);
      setPhase('choice');
    }
  }

  async function handleSelfAssess(correct: boolean) {
    setWasCorrect(correct);
    // The core evaluates the answer — the shell does not know the rules of
    // the mode a second time.
    const result = await submit({
      kind: 'cover-confusion',
      hintsUsed,
      selfAssess: correct,
    });
    setIdentity(result.feedback.identity);
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
    setPhase('done');
  }

  async function handleChoice(artist: string) {
    // The core compares the picked artist with the original one.
    const result = await submit({
      kind: 'cover-confusion',
      hintsUsed,
      pickedArtist: artist,
    });
    setWasCorrect(result.score.isCorrect);
    setIdentity(result.feedback.identity);
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
    setPhase('done');
  }

  async function handleChoiceVariation(guessCover: boolean) {
    const result = await submit({
      kind: 'cover-confusion-variation',
      guessCover,
    });
    setWasCorrect(result.score.isCorrect);
    setIdentity(result.feedback.identity);
    onAnswer(result.score.isCorrect, result.score.pointsAwarded); // 3 pts for the variation
    setPhase('done');
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">
      {/* Modus-Banner mit Variante */}
      <div className="w-full flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
          {t('modes.cover-confusion.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400/80">
          {variation === 'who-is-it'
            ? t('modes.cover-confusion.variationWhoIsIt')
            : t('modes.cover-confusion.variationCoverOrOriginal')}
        </span>
      </div>

      {/* Music player — blurred until the answer is given (swipe to reveal) */}
      <MusicPlayer
        songId={question.songId}
        songPack={question.context.pack ?? undefined}
        youtubeLink={playLink}
        youtubeAlternatives={
          question.media.coverLink ? undefined : question.media.youtubeAlternatives
        }
        spotifyLink={question.media.spotify ?? undefined}
        spotifyFreePreview={question.media.spotifyFreePreview ?? undefined}
        amazonMusicLink={question.media.amazonMusic ?? undefined}
        amazonPrimePreview={question.media.amazonPrimePreview ?? undefined}
        startSeconds={question.media.startSeconds}
        blurred={phase !== 'done'}
      />
      {question.media.coverLink && (
        <p className="text-[10px] text-center -mt-2 font-black uppercase text-[var(--color-accent)] animate-pulse">
          {t('modes.cover-confusion.coverActive')}
        </p>
      )}

      {/* Text hints (shown cumulatively) */}
      <AnimatePresence initial={false}>
        {hintsUsed > 0 && hintsUsed <= 2 && (
          <div className="space-y-2">
            {question.hints.slice(0, hintsUsed).map((hint, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={[
                  'p-4 rounded-2xl text-sm leading-relaxed border',
                  i === hintsUsed - 1
                    ? 'border-[var(--color-accent)] bg-white/5'
                    : 'border-white/5 opacity-50',
                ].join(' ')}
              >
                <span className="font-black opacity-30 mr-2 text-xs">
                  0{i + 1}
                </span>
                {hint}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Listening phase: Know it / Get hint ────────────────────── */}
      {phase === 'listening' && (
        <div className="space-y-4 mt-2">
          {variation === 'who-is-it' ? (
            <>
              <button
                onClick={() => setPhase('self-assess')}
                className="w-full py-5 rounded-3xl bg-[var(--color-accent)] font-black text-lg text-white shadow-xl shadow-[var(--color-accent)]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t('modes.cover-confusion.knowIt', {
                  points: numberFormat.format(points),
                })}
              </button>

              <button
                onClick={handleGetHint}
                className="w-full py-4 rounded-2xl border-2 border-white/10 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all active:scale-95"
              >
                {hintsUsed < 2
                  ? t('modes.cover-confusion.getHint', {
                      points: numberFormat.format(
                        coverConfusionPoints(hintsUsed + 1)
                      ),
                    })
                  : t('modes.cover-confusion.lastHint', {
                      points: numberFormat.format(coverConfusionPoints(3)),
                    })}
              </button>
            </>
          ) : (
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center space-y-6">
              <p className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)] opacity-80">
                {t('modes.cover-confusion.specialVariation')}
              </p>
              <h3 className="text-xl font-bold">
                {t('modes.cover-confusion.coverOrOriginalQuestion')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoiceVariation(true)}
                  className="py-6 bg-blue-500 rounded-3xl font-black text-white shadow-lg active:scale-95 transition-all"
                >
                  {t('modes.cover-confusion.coverButton')}
                </button>
                <button
                  onClick={() => handleChoiceVariation(false)}
                  className="py-6 bg-purple-500 rounded-3xl font-black text-white shadow-lg active:scale-95 transition-all"
                >
                  {t('modes.cover-confusion.originalButton')}
                </button>
              </div>
              <p className="text-[10px] opacity-40 uppercase font-black">
                {t('modes.cover-confusion.variationPoints')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Self-assess: show answer, player decides ──────────────── */}
      {phase === 'self-assess' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6"
        >
          <div>
            <p className="text-[10px] font-black uppercase opacity-40 mb-2">
              {t('modes.cover-confusion.originalArtistWas')}
            </p>
            <h3 className="text-2xl font-black">{identity?.artist}</h3>
            <p className="text-xs opacity-40 mt-1">
              {identity?.title} &middot; {identity?.year}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold italic opacity-50">
              {t('modes.cover-confusion.didYouKnow')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleSelfAssess(true)}
                className="flex-1 py-4 bg-green-500 rounded-2xl font-black text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              >
                {t('modes.cover-confusion.yes')}
              </button>
              <button
                onClick={() => handleSelfAssess(false)}
                className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                {t('modes.cover-confusion.no')}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Multiple choice (3 artists) ───────────────────────────── */}
      {phase === 'choice' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs font-black uppercase tracking-widest text-center opacity-40">
            {t('modes.cover-confusion.whoIsOriginal')}
          </p>
          {choiceOptions.map((artist) => (
            <button
              key={artist}
              onClick={() => handleChoice(artist)}
              className="w-full py-4 px-6 rounded-2xl border-2 border-white/10 bg-white/5 font-black text-sm hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all active:scale-95"
            >
              {artist}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Result card ───────────────────────────────────────────── */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={[
            'text-center p-5 rounded-3xl border space-y-2',
            wasCorrect
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10',
          ].join(' ')}
        >
          <p
            className="text-xl font-black uppercase italic tracking-tighter mb-1"
            style={{ color: getSpicyColor(wasCorrect!, question.songId) }}
          >
            {spicyMessage}
          </p>
          <p className="text-sm font-bold opacity-60">
            {wasCorrect
              ? t('modes.cover-confusion.correct')
              : t('modes.cover-confusion.wrong')}
          </p>
          <p className="text-sm opacity-60">
            {t('modes.cover-confusion.originalLabel')}{' '}
            <span className="font-bold text-white">{identity?.artist}</span>
          </p>
          {wasCorrect && (
            <p className="text-xs font-black text-[var(--color-accent)]">
              {t('modes.cover-confusion.pointsAwarded', {
                points: numberFormat.format(points),
              })}
            </p>
          )}
        </motion.div>
      )}

      {/* ── Footer: WEITER after done ─────────────────────────────── */}
      {phase === 'done' && onReveal && (
        <footer className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-8 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
          <div className="max-w-md mx-auto">
            <button
              onClick={onReveal}
              className="w-full py-5 rounded-3xl font-black text-lg bg-[var(--color-accent)] text-white shadow-2xl active:scale-95 transition-all"
            >
              {t('modes.continue')}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
