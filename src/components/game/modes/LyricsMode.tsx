/**
 * Lyrics labyrinth mode
 *
 * Three real lines and one AI-generated fake line are mixed.
 * The player has to identify the FAKE line.
 *
 * If song.lyrics is null: a bonus round without lyrics data.
 *
 * Score: 4 points for correctly detecting the fake.
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { PhomuSong } from '@/types/song';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';

// ─── Constants ───────────────────────────────────────────────────

const LYRICS_POINTS = 4;

/** Shuffles an array randomly */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Props ────────────────────────────────────────────────────────

interface LyricsModeProps {
  song: PhomuSong;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal: () => void;
}

// ─── Main component ──────────────────────────────────────────────

export function LyricsMode({ song, onAnswer, onReveal }: LyricsModeProps) {
  const lyrics = song.lyrics;

  // Fallback when no lyrics are present
  if (!lyrics) {
    return <BonusRound song={song} onAnswer={onAnswer} onReveal={onReveal} />;
  }

  return (
    <LyricsQuestion
      song={song}
      lyrics={lyrics}
      onAnswer={onAnswer}
      onReveal={onReveal}
    />
  );
}

// ─── Lyrics question (when data is present) ─────────────────────────

type SongLyrics = NonNullable<PhomuSong['lyrics']>;

function LyricsQuestion({
  song,
  lyrics,
  onAnswer,
  onReveal,
}: {
  song: PhomuSong;
  lyrics: SongLyrics;
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

  // Mix 3 real + 1 fake line — stabilised once
  const options = useMemo(() => {
    // If several fakes are present, pick one at random
    const selectedFake = Array.isArray(lyrics.fake)
      ? lyrics.fake[Math.floor(Math.random() * lyrics.fake.length)]
      : lyrics.fake;

    const items = [
      { text: lyrics.real[0], isFake: false },
      { text: lyrics.real[1], isFake: false },
      { text: lyrics.real[2], isFake: false },
      { text: selectedFake, isFake: true },
    ];
    return shuffle(items);
    // song.id is stable as long as the same song is displayed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);

  const spicyMessage = useSpicyMessage(
    options[selected!]?.isFake ?? false,
    song.id
  );

  function handleSelect(index: number) {
    setSelected(index);
  }

  function handleConfirm() {
    if (selected === null || isRevealing) return;
    setIsRevealing(true);
    const isCorrect = options[selected]?.isFake ?? false;
    // Lyrics Labyrinth: 4 points base score (cheats were already deducted)
    onAnswer(isCorrect, isCorrect ? LYRICS_POINTS : 0);
    onReveal();
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-lg mx-auto">
      {/* Mode banner */}
      <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
          {t('modes.lyrics.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400/60">
          {t('modes.lyrics.tagline')}
        </span>
      </div>

      {/* Music — starts immediately, blurred until the reveal */}
      <div className="w-full">
        <MusicPlayer
          songId={song.id}
          songTitle={song.title}
          songArtist={song.artist}
          songPack={song.packs[0]}
          youtubeLink={song.links.youtube}
          youtubeAlternatives={
            song.links.youtubeAlternatives ??
            (song.links.fallbackYoutubeId
              ? [song.links.fallbackYoutubeId]
              : undefined)
          }
          spotifyLink={song.links.spotify}
          spotifyFreePreview={song.links.spotifyFreePreview}
          amazonMusicLink={song.links.amazonMusic}
          amazonPrimePreview={song.links.amazonPrimePreview}
          startSeconds={song.previewTimestamp?.start ?? 0}
          blurred={!isRevealing}
        />
      </div>

      {/* Artist hint */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-1">
          {t('modes.lyrics.songLabel')}
        </p>
        <h3 className="text-2xl font-black">{song.artist}</h3>
        <p className="text-lg font-bold opacity-70 mb-2">{song.title}</p>
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
              &ldquo;{option.text}&rdquo;
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
            style={{
              color: getSpicyColor(
                options[selected!]?.isFake ?? false,
                song.id
              ),
            }}
          >
            {spicyMessage}
          </p>
          <p className="text-sm font-bold opacity-60">
            {options[selected!]?.isFake
              ? t('modes.lyrics.correct')
              : t('modes.lyrics.wrong')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Bonus round (no lyrics present) ────────────────────────

function BonusRound({
  song,
  onAnswer,
  onReveal,
}: {
  song: PhomuSong;
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
      <p className="text-5xl">🎁</p>
      <div>
        <h3 className="text-xl font-black mb-2">
          {t('modes.lyrics.bonusTitle')}
        </h3>
        <p className="opacity-60 text-sm max-w-xs leading-relaxed">
          {t('modes.lyrics.bonusText', { artist: song.artist })}
          <br className="my-1" />
          {t('modes.lyrics.bonusReward')}
        </p>
      </div>
      {!claimed ? (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setClaimed(true);
              onAnswer(true, 2);
              onReveal();
            }}
            className="px-6 py-3 rounded-xl font-black"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            {t('modes.lyrics.bonusClaim')}
          </button>
          <button
            onClick={() => {
              setClaimed(true);
              onAnswer(false, 0);
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
