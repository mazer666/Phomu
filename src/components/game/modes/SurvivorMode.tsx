/**
 * Survivor mode
 *
 * Players decide: is this artist a one-hit wonder or a long-term star?
 * The song information is hidden — only artist and decade are visible.
 * Correct answer: isOneHitWonder from the song metadata.
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { RoundQuestion, SongIdentity } from '@/core/types';
import { applyCheat, submit } from '@/core/session-service';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';
import { CHEAT_PENALTY_SURVIVOR } from '@/utils/mode-rules';
import { ModeArt } from '@/components/art/ModeArt';

interface SurvivorModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
}

export function SurvivorMode({ question, onAnswer }: SurvivorModeProps) {
  const { t, i18n } = useTranslation();
  const { config, awardPoints, turnOrder, currentTurnIndex } = useGameStore();
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [cheatUsed, setCheatUsed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isOneHitWonder, setIsOneHitWonder] = useState(false);
  const [identity, setIdentity] = useState<SongIdentity | null>(null);

  const currentPlayerId = turnOrder[currentTurnIndex];
  const spicyMessage = useSpicyMessage(isCorrect, question.songId);

  // Year without a thousands separator (a year is not a quantity)
  const yearFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  async function handleChoice(guessedOneHit: boolean) {
    if (answered) return;
    // The core evaluates the answer: the shell does not know whether the
    // artist is a one-hit wonder.
    const result = await submit({ kind: 'survivor', guessedOneHit });
    setChoice(guessedOneHit);
    setAnswered(true);
    setIsCorrect(result.score.isCorrect);
    setIsOneHitWonder(result.feedback.detail.isOneHitWonder ?? false);
    setIdentity(result.feedback.identity);
    // Survivor: 3 points base score (cheats were already deducted)
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
  }

  async function handleCheat() {
    if (cheatUsed || answered || !currentPlayerId) return;
    setCheatUsed(true);
    // The cheat reveals the artist: the base releases the identity of the
    // song on an explicit command.
    const outcome = await applyCheat('survivor-artist');
    setIdentity(outcome.identity);
    // Immediate deduction of 1 point
    awardPoints(currentPlayerId, CHEAT_PENALTY_SURVIVOR);
  }

  return (
    // WHY the height: the mode fills the phase of the round and never
    // scrolls the page — the player is bounded, the answers take the rest.
    <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-6 py-3 gap-4 pb-24">
      {/* Mode banner */}
      <div className="shrink-0 w-full max-w-sm flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
          <ModeArt mode="survivor" size={22} /> {t('modes.survivor.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400/60">
          {t('modes.survivor.tagline')}
        </span>
      </div>

      {/* Music — starts immediately, the artist stays hidden */}
      <div className="shrink-0 w-full max-w-sm mx-auto">
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
          blurred={!answered && !cheatUsed}
        className="max-h-[170px]"
        />
      </div>

      {/* Song info — the artist only becomes visible after the answer or the cheat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-3 relative">
          <span className="px-3 py-1 rounded-full border border-[var(--color-accent)]/40 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
            {t('modes.survivor.pointsReward')}
          </span>
          {cheatUsed && (
            <span
              className="absolute -top-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-black shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#ef4444',
                transform: 'rotate(6deg)',
                boxShadow: '0 2px 8px rgba(239,68,68,0.6)',
              }}
            >
              {t('modes.survivor.cheatBadge')}
            </span>
          )}
        </div>

        {!answered && !cheatUsed ? (
          <>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
              {t('modes.survivor.artistLabel')}
            </p>
            <h3 className="text-4xl font-black mb-1 opacity-20 select-none tracking-widest">
              {t('modes.survivor.hiddenArtist')}
            </h3>
            <p className="opacity-30 text-sm italic">
              {t('modes.survivor.hiddenHint')}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
              {t('modes.survivor.artistLabel')}
            </p>
            <h3 className="text-3xl font-black mb-1">{identity?.artist}</h3>
            <p className="text-lg font-bold opacity-70 mb-1">
              {identity?.title}
            </p>
            {answered && (
              <p className="opacity-50 text-sm">
                {t('modes.survivor.decadeAndGenre', {
                  decade: yearFormat.format(
                    Math.floor((identity?.year ?? 0) / 10) * 10
                  ),
                  genre: question.context.genre,
                })}
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Question */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-bold text-center"
      >
        {t('modes.survivor.question')}
      </motion.p>

      {/* Answer buttons */}
      {!answered ? (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => handleChoice(true)}
              className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90 shadow-lg shadow-red-500/20"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              {t('modes.survivor.yes')}
            </button>
            <button
              onClick={() => handleChoice(false)}
              className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90 shadow-lg shadow-green-500/20"
              style={{ backgroundColor: 'var(--color-success)' }}
            >
              {t('modes.survivor.no')}
            </button>
          </motion.div>

          {/* Cheat: reveal the artist early */}
          {!cheatUsed && !config.noCheatMode && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              onClick={handleCheat}
              className="text-[10px] font-black uppercase tracking-widest border border-white/10 py-3 rounded-xl hover:bg-white/5 transition-all min-h-[44px]"
            >
              {t('modes.survivor.cheatButton')}
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {choice !== null ? (
            <>
              <p className="text-5xl mb-3">
                {isCorrect ? '✅' : '❌'}
              </p>
              <p
                className="font-black uppercase italic tracking-tighter text-xl mb-1"
                style={{
                  color: getSpicyColor(isCorrect, question.songId),
                }}
              >
                {spicyMessage}
              </p>
              <p className="font-bold opacity-80">
                {isOneHitWonder
                  ? t('modes.survivor.resultOneHit')
                  : t('modes.survivor.resultMainstay')}
              </p>
            </>
          ) : (
            <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              <ModeArt mode="survivor" size={36} className="mb-1" />
              <p className="text-sm font-bold uppercase tracking-tight text-red-500">
                {t('modes.survivor.cheatUsed')}
              </p>
              <p className="text-xs opacity-60">
                {t('modes.survivor.cheatUsedInfo')}
              </p>
            </div>
          )}
          <p className="text-sm opacity-50 mt-4 font-black uppercase tracking-[0.2em]">
            {t('modes.survivor.waitingForReveal')}
          </p>
        </motion.div>
      )}
    </div>
  );
}
