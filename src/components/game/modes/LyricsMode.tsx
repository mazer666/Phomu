/**
 * Lyrics labyrinth mode
 *
 * Three real lines and one AI-generated fake line are mixed.
 * The player has to identify the FAKE line.
 *
 * The four options come from the core. The core builds them and it decides
 * which one was the invented line — the shell never learns it. The player
 * sends the line they picked, the core answers with the points.
 *
 * If the song has no lyric lines: a bonus round without lyrics data.
 *
 * Score: 4 points for correctly detecting the fake.
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { AnswerFeedback, RoundQuestion } from '@/core/types';
import { submit } from '@/core/session-service';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';
import { Icon } from '@/components/art/Icon';
import { ModeArt } from '@/components/art/ModeArt';

// ─── Props ────────────────────────────────────────────────────────

interface LyricsModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal: () => void;
}

// ─── Main component ──────────────────────────────────────────────

export function LyricsMode({ question, onAnswer, onReveal }: LyricsModeProps) {
  const options = question.options;

  // Fallback when the song has no lyric lines
  if (options.length === 0) {
    return <BonusRound question={question} onAnswer={onAnswer} onReveal={onReveal} />;
  }

  return (
    <LyricsQuestion
      question={question}
      options={options}
      onAnswer={onAnswer}
      onReveal={onReveal}
    />
  );
}

// ─── Lyrics question (when data is present) ─────────────────────────

function LyricsQuestion({
  question,
  options,
  onAnswer,
  onReveal,
}: {
  question: RoundQuestion;
  options: string[];
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [inventedLine, setInventedLine] = useState<string | null>(null);

  const spicyMessage = useSpicyMessage(isCorrect, question.songId);

  function handleSelect(index: number) {
    setSelected(index);
  }

  async function handleConfirm() {
    if (selected === null || isRevealing) return;
    setIsRevealing(true);
    const picked = options[selected] ?? '';
    // The core decides whether the picked line was the invented one: the
    // shell does not know it and must not learn it
    // (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.2).
    const result = await submit({ kind: 'lyrics', line: picked });
    const feedback: AnswerFeedback = result.feedback;
    setIsCorrect(result.score.isCorrect);
    setInventedLine(feedback.detail.inventedLine ?? null);
    // Lyrics Labyrinth: 4 points base score (cheats were already deducted)
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
    onReveal();
  }

  return (
    // WHY the height: the mode fills the phase of the round and never
    // scrolls the page — the player is bounded, the lines of the lyrics
    // take the rest.
    <div className="flex flex-col px-4 py-3 gap-3 pb-24 max-w-lg mx-auto flex-1 min-h-0">
      {/* Mode banner */}
      <div className="shrink-0 flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
          <ModeArt mode="lyrics" size={22} /> {t('modes.lyrics.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400/60">
          {t('modes.lyrics.tagline')}
        </span>
      </div>

      {/* Music — starts immediately, blurred until the reveal */}
      <div className="shrink-0 w-full">
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
          blurred={!isRevealing}
          className="max-h-[170px]"
        />
      </div>

      {/* Artist hint — the mode discloses the identity of the song */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-1">
          {t('modes.lyrics.songLabel')}
        </p>
        <h3 className="text-2xl font-black">{question.identity?.artist}</h3>
        <p className="text-lg font-bold opacity-70 mb-2">
          {question.identity?.title}
        </p>
        <p className="text-sm opacity-60 mt-1 font-medium">
          {t('modes.lyrics.questionIntro')}{' '}
          <span style={{ color: 'var(--color-error)' }}>
            {t('modes.lyrics.questionEmphasis')}
          </span>
          ?
        </p>
      </motion.div>

      {/* Lyrics options */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isInvented = isRevealing && option === inventedLine;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleSelect(i)}
              disabled={false}
              className="text-left p-4 rounded-xl border-2 text-sm leading-relaxed
                         font-mono transition-all disabled:cursor-default"
              style={{
                borderColor: isSelected
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'var(--color-bg-card)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span className="font-sans font-bold opacity-40 mr-2 text-xs">
                {String.fromCharCode(65 + i)}.
              </span>
              &ldquo;{option}&rdquo;
              {isInvented && (
                <span className="block font-sans font-black text-xs uppercase tracking-widest text-orange-400">
                  {t('modes.lyrics.fakeLine')}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {selected !== null && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex justify-center"
        >
          <button
            onClick={handleConfirm}
            className="px-8 py-4 w-full rounded-2xl text-xl font-black shadow-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
          >
            {t('modes.lyrics.confirm')}
          </button>
        </motion.div>
      )}

      {isRevealing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 text-center"
        >
          <p
            className="text-2xl font-black uppercase italic tracking-tighter mb-1"
            style={{ color: getSpicyColor(isCorrect, question.songId) }}
          >
            {spicyMessage}
          </p>
          <p className="text-sm font-bold opacity-60">
            {isCorrect ? t('modes.lyrics.correct') : t('modes.lyrics.wrong')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Bonus round (no lyrics present) ────────────────────────

function BonusRound({
  question,
  onAnswer,
  onReveal,
}: {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal: () => void;
}) {
  const { t } = useTranslation();
  const [claimed, setClaimed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] px-6 gap-6 text-center">
      <Icon name="gift" size={48} className="text-[var(--color-accent)]" />
      <div>
        <h3 className="text-xl font-black mb-2">
          {t('modes.lyrics.bonusTitle')}
        </h3>
        <p className="opacity-60 text-sm max-w-xs leading-relaxed">
          {t('modes.lyrics.bonusText', { artist: question.identity?.artist ?? '' })}
          <br className="my-1" />
          {t('modes.lyrics.bonusReward')}
        </p>
      </div>
      {!claimed ? (
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setClaimed(true);
              const result = await submit({ kind: 'lyrics-bonus', claimed: true });
              onAnswer(result.score.isCorrect, result.score.pointsAwarded);
              onReveal();
            }}
            className="px-6 py-3 rounded-xl font-black"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            {t('modes.lyrics.bonusClaim')}
          </button>
          <button
            onClick={async () => {
              setClaimed(true);
              const result = await submit({ kind: 'lyrics-bonus', claimed: false });
              onAnswer(result.score.isCorrect, result.score.pointsAwarded);
              onReveal();
            }}
            className="px-6 py-3 rounded-xl font-bold border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {t('modes.lyrics.bonusNoIdea')}
          </button>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm opacity-50"
        >
          {t('modes.lyrics.waitingForReveal')}
        </motion.p>
      )}
    </div>
  );
}
