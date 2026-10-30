/**
 * The mode-specific cards of the reveal.
 *
 * WHAT: one card per game mode — the year of the timeline, the title of the
 * hint master, the invented line of the lyrics, the mood of the vibe check,
 * the artist of the survivor and the cover of the confusion.
 *
 * WHY: every mode has its own visual language, and no generic song dump.
 * The cards are the presentation of the solution, and they belong together —
 * but not in the component that decides what the solution is.
 *
 * WHY the variant of a text is picked here: the seed is the song, and the
 * same song must show the same variant in every session.
 */
'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RevealSong } from '@/core/types';
import {
  COVER_HEADLINE_KEYS,
  HINT_SUBLINE_KEYS,
  LYRICS_FAKE_LABEL_KEYS,
  SURVIVOR_NO_KEYS,
  SURVIVOR_YES_KEYS,
  VIBE_HEADLINE_KEYS,
} from '@/i18n/variant-keys';
import { buildTimelineHeadlineKeys, pickVariantIndex } from './reveal-logic';
import { ModeArt } from '@/components/art/ModeArt';
import { Icon } from '@/components/art/Icon';

export function TimelineReveal({ song }: { song: RevealSong }) {
  const { t, i18n } = useTranslation();
  // Years without a thousands separator (Intl with the active locale)
  const yearFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  const headline = useMemo(() => {
    const keys = buildTimelineHeadlineKeys(song.year);
    const key = keys[pickVariantIndex(`timeline:${song.id}`, keys.length)]!;
    return t(key, { year: song.year });
  }, [song.id, song.year, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center overflow-hidden relative"
      style={{
        background:
          'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.08))',
        border: '2px solid rgba(6,182,212,0.4)',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">
        {t('game.reveal.timeline.label')}
      </p>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 18,
          delay: 0.15,
        }}
        className="text-8xl font-black tabular-nums mb-3"
        style={{
          color: '#22d3ee',
          textShadow: '0 0 40px rgba(34,211,238,0.5)',
        }}
      >
        {yearFormatter.format(song.year)}
      </motion.div>
      <p className="text-lg font-black mb-5" style={{ color: '#67e8f9' }}>
        {headline}
      </p>
      <SongAttribution song={song} />
    </motion.div>
  );
}

export function HintMasterReveal({ song }: { song: RevealSong }) {
  const { t, i18n } = useTranslation();
  const yearFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  const subline = useMemo(() => {
    const index = pickVariantIndex(`hint:${song.id}`, HINT_SUBLINE_KEYS.length);
    return t(HINT_SUBLINE_KEYS[index]!);
  }, [song.id, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.08))',
        border: '2px solid rgba(139,92,246,0.4)',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-4">
        <ModeArt mode="hint-master" size={40} /> {subline}
      </p>
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-4xl font-black leading-tight mb-2"
        style={{ color: '#c4b5fd' }}
      >
        {song.title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold opacity-80 mb-2"
      >
        {song.artist}
      </motion.p>
      <p className="text-xs opacity-30 font-black uppercase tracking-widest mt-4">
        {t('game.reveal.decadeSuffix', {
          decade: yearFormatter.format(Math.floor(song.year / 10) * 10),
        })}
      </p>
    </motion.div>
  );
}

export function LyricsReveal({ song }: { song: RevealSong }) {
  const { t } = useTranslation();

  const fakeLabel = useMemo(() => {
    const index = pickVariantIndex(
      `lyrics:${song.id}`,
      LYRICS_FAKE_LABEL_KEYS.length
    );
    return t(LYRICS_FAKE_LABEL_KEYS[index]!);
  }, [song.id, t]);

  if (!song.lyrics) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-7 text-center bg-white/5 border border-white/10"
      >
        <p className="text-2xl font-black mb-2">{song.title}</p>
        <p className="opacity-60">{song.artist}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-7 space-y-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(244,63,94,0.06))',
        border: '2px solid rgba(239,68,68,0.35)',
      }}
    >
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 opacity-80 mb-3">
          <ModeArt mode="lyrics" size={40} /> {fakeLabel}
        </p>
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base font-mono italic text-red-300 leading-relaxed px-2"
        >
          &ldquo;{song.lyrics.fake}&rdquo;
        </motion.p>
      </div>
      <div className="flex justify-center">
        <span className="px-4 py-1.5 bg-green-500/20 text-green-400 text-[10px] font-black rounded-full border border-green-500/25 uppercase tracking-widest">
          {t('game.reveal.lyrics.othersReal')}
        </span>
      </div>
      <SongAttribution song={song} />
    </motion.div>
  );
}

export function VibeCheckReveal({ song }: { song: RevealSong }) {
  const { t } = useTranslation();

  const headline = useMemo(() => {
    const index = pickVariantIndex(`cover:${song.id}`, VIBE_HEADLINE_KEYS.length);
    return t(VIBE_HEADLINE_KEYS[index]!);
  }, [song.id, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))',
        border: '2px solid rgba(34,197,94,0.35)',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400 opacity-80 mb-5">
        <ModeArt mode="vibe-check" size={40} /> {headline}
      </p>
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {song.mood.map((m, i) => (
          <motion.span
            key={m}
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 18,
              delay: 0.1 + i * 0.08,
            }}
            className="px-6 py-3 rounded-full font-black text-lg text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
            }}
          >
            {m}
          </motion.span>
        ))}
      </div>
      <SongAttribution song={song} />
    </motion.div>
  );
}

export function SurvivorReveal({ song }: { song: RevealSong }) {
  const { t } = useTranslation();
  const isOHW = song.isOneHitWonder;

  const headline = useMemo(() => {
    const keys = isOHW ? SURVIVOR_YES_KEYS : SURVIVOR_NO_KEYS;
    const variants = keys.length;
    const index = pickVariantIndex(
      `survivor:${song.id}:${isOHW ? 'yes' : 'no'}`,
      variants
    );
    return t(keys[index]!, { artist: song.artist });
  }, [isOHW, song.id, song.artist, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={
        isOHW
          ? {
              background:
                'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(244,63,94,0.08))',
              border: '2px solid rgba(239,68,68,0.4)',
            }
          : {
              background:
                'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(234,179,8,0.08))',
              border: '2px solid rgba(250,204,21,0.4)',
            }
      }
    >
      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
        className="text-6xl mb-4"
      >
        <Icon name={isOHW ? 'person' : 'star'} size={16} />
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">
        {t('game.reveal.survivor.label')}
      </p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-xl font-black leading-snug mb-5"
        style={{ color: isOHW ? '#fca5a5' : '#fde68a' }}
      >
        {headline}
      </motion.p>
      <SongAttribution song={song} />
    </motion.div>
  );
}

export function CoverConfusionReveal({ song }: { song: RevealSong }) {
  const { t } = useTranslation();

  const headline = useMemo(() => {
    const index = pickVariantIndex(`cover:${song.id}`, COVER_HEADLINE_KEYS.length);
    return t(COVER_HEADLINE_KEYS[index]!);
  }, [song.id, t]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-3xl p-8 text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(var(--color-accent-rgb),0.15), rgba(var(--color-accent-rgb),0.05))',
        border: '2px solid rgba(var(--color-accent-rgb),0.4)',
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-4">
        <ModeArt mode="cover-confusion" size={40} /> {headline}
      </p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-black mb-2"
        style={{ color: 'var(--color-accent)' }}
      >
        {song.artist}
      </motion.p>
      <p className="text-lg font-bold opacity-70 mb-4">{song.title}</p>
      {song.links.coverLink && (
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
          {t('game.reveal.cover.coverVersionHeard')}
        </span>
      )}
    </motion.div>
  );
}

// ─── Small helper component: discreet song attribution ────────────

export function SongAttribution({ song }: { song: RevealSong }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest opacity-25 mt-2">
      {song.title} &middot; {song.artist}
    </p>
  );
}
