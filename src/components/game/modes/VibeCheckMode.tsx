/**
 * Vibe-Check mode
 *
 * The artist and the decade are visible — players pick a mood.
 * Points are awarded when at least one selected mood is in song.mood.
 * All 6 mood options are shown so that no hint arises from a reduced list.
 *
 * Cheat: halve the options (6 → 3), but max. +1 pt instead of +2 pts.
 *
 * The mood values are catalog data (they must match `song.mood`);
 * the translated label is displayed.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useGameStore } from '@/stores/game-store';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { RoundQuestion } from '@/core/types';
import { applyCheat, submit } from '@/core/session-service';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';

// ─── Design constants (colours, no text) ─────────────────────────

const MOOD_IDLE_BG = 'rgba(255,255,255,0.03)';
const MOOD_IDLE_BORDER = 'rgba(255,255,255,0.1)';
const MOOD_IDLE_TEXT = 'rgba(255,255,255,0.6)';
const MOOD_CORRECT_BG = 'rgba(34,197,94,0.2)';
const MOOD_CORRECT_BORDER = '#22c55e';
const MOOD_CORRECT_SHADOW = '0 0 20px rgba(34,197,94,0.3)';
const MOOD_WRONG_BG = 'rgba(239,68,68,0.2)';

// ─── Moods ───────────────────────────────────────────────────

/** Translates a mood value into the display label (fallback: the raw value). */
function moodLabel(mood: string, t: TFunction): string {
  switch (mood) {
    case 'Dance Floor':
      return t('modes.vibe-check.moods.danceFloor');
    case 'Nostalgic':
      return t('modes.vibe-check.moods.nostalgic');
    case 'Party Anthem':
      return t('modes.vibe-check.moods.partyAnthem');
    case 'Heartbreak':
      return t('modes.vibe-check.moods.heartbreak');
    case 'Epic':
      return t('modes.vibe-check.moods.epic');
    case 'Chill':
      return t('modes.vibe-check.moods.chill');
    case 'Rebellious':
      return t('modes.vibe-check.moods.rebellious');
    case 'Euphoric':
      return t('modes.vibe-check.moods.euphoric');
    case 'Melancholic':
      return t('modes.vibe-check.moods.melancholic');
    case 'Feel Good':
      return t('modes.vibe-check.moods.feelGood');
    case 'Dark':
      return t('modes.vibe-check.moods.dark');
    case 'Romantic':
      return t('modes.vibe-check.moods.romantic');
    default:
      return mood;
  }
}

interface VibeCheckModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
}

export function VibeCheckMode({ question, onAnswer }: VibeCheckModeProps) {
  const { t, i18n } = useTranslation();
  const { config } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [cheatUsed, setCheatUsed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctMood, setCorrectMood] = useState('');
  const [cheatedOptions, setCheatedOptions] = useState<string[]>([]);
  const spicyMessage = useSpicyMessage(isCorrect, question.songId);

  // Year without a thousands separator (a year is not a quantity)
  const yearFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  async function handleCheat() {
    if (cheatUsed || answered) return;
    setCheatUsed(true);
    // The base builds the shortened list: it has to keep the correct mood
    // of the song, and only the base knows it.
    const outcome = await applyCheat('vibe-check-options');
    setCheatedOptions(outcome.options);
  }

  async function handleSelect(mood: string) {
    if (answered) return;
    const result = await submit({ kind: 'vibe-check', mood, cheatUsed });
    setSelected(mood);
    setAnswered(true);
    setIsCorrect(result.score.isCorrect);
    setCorrectMood(result.feedback.detail.correctMood ?? '');
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
  }

  // The options come from the core — the core knows the correct mood.
  const options = cheatUsed && cheatedOptions.length > 0
    ? cheatedOptions
    : question.options;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-6">
      {/* Mode banner */}
      <div className="w-full max-w-sm flex items-center justify-between bg-teal-500/10 border border-teal-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
          {t('modes.vibe-check.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400/60">
          {t('modes.vibe-check.tagline')}
        </span>
      </div>

      {/* Music — starts immediately, not covered up */}
      {!answered && (
        <div className="w-full max-w-sm mx-auto">
          <MusicPlayer
            songId={question.songId}
            songPack={question.context.pack ?? undefined}
            youtubeLink={question.media.youtube}
            youtubeAlternatives={question.media.youtubeAlternatives}
            spotifyLink={question.media.spotify ?? undefined}
            spotifyFreePreview={question.media.spotifyFreePreview ?? undefined}
            amazonMusicLink={question.media.amazonMusic ?? undefined}
            amazonPrimePreview={question.media.amazonPrimePreview ?? undefined}
            startSeconds={question.media.startSeconds}
            blurred={false}
          />
        </div>
      )}

      {/* Artist info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-3">
          <span className="px-3 py-1 rounded-full border border-[var(--color-accent)]/40 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
            {cheatUsed
              ? t('modes.vibe-check.pointsCheated')
              : t('modes.vibe-check.pointsFull')}
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
          {t('modes.vibe-check.songInfo')}
        </p>
        <h3 className="text-3xl font-black mb-1">
          {question.identity?.artist}
        </h3>
        <p className="text-xl font-bold opacity-80">
          {question.identity?.title}
        </p>
        <p className="opacity-50 text-sm mt-1">
          {t('modes.decade', {
            decade: yearFormat.format(
              Math.floor((question.identity?.year ?? 0) / 10) * 10
            ),
          })}
        </p>
      </motion.div>

      {/* Question */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-lg font-bold text-center"
      >
        {t('modes.vibe-check.question')}
      </motion.p>

      {/* Cheat button */}
      <AnimatePresence>
        {!answered &&
          !config.noCheatMode &&
          (cheatUsed ? (
            <motion.div
              key="cheat-active"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500/70"
            >
              {t('modes.vibe-check.cheatActive')}
            </motion.div>
          ) : (
            <motion.button
              key="cheat-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              whileHover={{ opacity: 1 }}
              onClick={handleCheat}
              className="w-full max-w-sm py-2 rounded-xl border border-yellow-500/20 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500 hover:bg-yellow-500/5 transition-all"
            >
              {t('modes.vibe-check.cheatButton')}
            </motion.button>
          ))}
      </AnimatePresence>

      {/* Mood grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`grid gap-2 w-full max-w-sm ${cheatUsed ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}
      >
        {options.map((mood) => {
          const isSelected = selected === mood;
          const isCorrectMood = answered && mood === correctMood;

          let bgColor = MOOD_IDLE_BG;
          let borderColor = MOOD_IDLE_BORDER;
          let textColor = MOOD_IDLE_TEXT;
          let scale = 1;
          let shadow = 'none';

          if (answered) {
            if (isCorrectMood) {
              bgColor = MOOD_CORRECT_BG;
              borderColor = MOOD_CORRECT_BORDER;
              textColor = '#fff';
              scale = isSelected ? 1.05 : 1;
              shadow = MOOD_CORRECT_SHADOW;
            } else if (isSelected) {
              bgColor = MOOD_WRONG_BG;
              borderColor = '#ef4444';
              textColor = '#fff';
              scale = 0.95;
            } else {
              // Fades out the others
            }
          }

          return (
            <motion.button
              key={mood}
              onClick={() => handleSelect(mood)}
              disabled={answered}
              animate={{
                scale,
                opacity: answered && !isCorrectMood && !isSelected ? 0.3 : 1,
              }}
              className="py-4 px-2 rounded-2xl border text-sm font-black transition-colors disabled:cursor-default"
              style={{
                backgroundColor: bgColor,
                borderColor,
                color: textColor,
                boxShadow: shadow,
              }}
            >
              {moodLabel(mood, t)}
            </motion.button>
          );
        })}
      </motion.div>

      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Main Reveal Card */}
          <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-green-500/20 to-blue-500/10 border-2 border-green-500/30 text-center shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 bg-white rounded-bl-3xl">
              ✨
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-green-400 mb-4 drop-shadow-md">
              {t('modes.vibe-check.theVibeIs')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[correctMood].filter(Boolean).map((m, i) => (
                <motion.span
                  key={m}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-2xl shadow-[0_10px_30px_rgba(34,197,94,0.4)] border-b-4 border-black/20"
                >
                  {moodLabel(m, t)}
                </motion.span>
              ))}
            </div>

            <p
              className="mt-6 text-xl font-black uppercase italic tracking-tighter"
              style={{
                color: getSpicyColor(isCorrect, question.songId),
              }}
            >
              {spicyMessage}
            </p>

            <p className="mt-2 text-sm font-bold opacity-60">
              {isCorrect
                ? t('modes.vibe-check.perfect')
                : t('modes.vibe-check.almost')}
            </p>
          </div>

          {/* Music Integration */}
          <div className="p-1.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] border border-white/10 shadow-inner">
            <MusicPlayer
              songId={question.songId}
              songPack={question.context.pack ?? undefined}
              youtubeLink={question.media.youtube}
              youtubeAlternatives={question.media.youtubeAlternatives}
              spotifyLink={question.media.spotify ?? undefined}
              spotifyFreePreview={question.media.spotifyFreePreview ?? undefined}
              amazonMusicLink={question.media.amazonMusic ?? undefined}
              amazonPrimePreview={question.media.amazonPrimePreview ?? undefined}
              startSeconds={question.media.startSeconds}
              endSeconds={question.media.startSeconds + 120}
              blurred={false}
            />
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
              {question.identity?.title} &middot; {question.identity?.artist} (
              {yearFormat.format(question.identity?.year ?? 0)})
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
