/**
 * RevealPhase
 *
 * Shows exclusively the resolution relevant for the respective game mode.
 * No generic song dump — every mode answer gets its own visual language.
 */
'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhomuSong } from '@/types/song';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import type { GameMode } from '@/config/game-config';
import {
  CORRECT_MESSAGES,
  WRONG_MESSAGES,
  getSpicyColor,
} from '@/utils/feedback-messages';
import {
  COVER_HEADLINE_KEYS,
  FEEDBACK_CORRECT_KEYS,
  FEEDBACK_WRONG_KEYS,
  HINT_SUBLINE_KEYS,
  LYRICS_FAKE_LABEL_KEYS,
  NEXT_ROUND_KEYS,
  SCORING_HEADER_KEYS,
  SURVIVOR_NO_KEYS,
  SURVIVOR_YES_KEYS,
  TIMELINE_DECADE_KEYS,
  TIMELINE_GENERIC_KEYS,
  VIBE_HEADLINE_KEYS,
  type TranslationKey,
} from '@/i18n/variant-keys';

// ─── Props ────────────────────────────────────────────────────────

interface RevealPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  answers: PlayerAnswer[];
  players: Player[];
  teams: Team[];
  winCondition: number;
  endingCondition: 'rounds' | 'points' | 'time';
  isGameOver: boolean;
  onNextRound: () => void;
  onEndGame: () => void;
  onOverrideCorrect?: () => void;
  onOverrideRedraw?: () => void;
  overrideGovernance?: 'host' | 'co-host' | 'majority';
}

// ─── Juicy CTA variants ──────────────────────────────────────────
// The texts live in the translation. The key lists are typed
// and generated from `src/i18n/locales/de.json` (see `src/i18n/variant-keys.ts`),
// so that a typo shows up at compile time and the number of variants
// does not have to be maintained in two places.

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickIndex(seed: string, length: number): number {
  if (length <= 0) throw new Error('Cannot pick from empty range');
  return hashSeed(seed) % length;
}

// ─── Mode-specific reveal cards ─────────────────────────────

/**
 * Builds the translation keys of the timeline headlines.
 * The text itself comes from the translation (placeholder: {{year}}).
 */
function buildTimelineHeadlineKeys(year: number): TranslationKey[] {
  const decade = Math.floor(year / 10) * 10;
  return [...TIMELINE_GENERIC_KEYS, ...(TIMELINE_DECADE_KEYS[decade] ?? [])];
}

function TimelineReveal({ song }: { song: PhomuSong }) {
  const { t, i18n } = useTranslation();
  // Years without a thousands separator (Intl with the active locale)
  const yearFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  const headline = useMemo(() => {
    const keys = buildTimelineHeadlineKeys(song.year);
    const key = keys[pickIndex(`timeline:${song.id}`, keys.length)]!;
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

function HintMasterReveal({ song }: { song: PhomuSong }) {
  const { t, i18n } = useTranslation();
  const yearFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  const subline = useMemo(() => {
    const index = pickIndex(`hint:${song.id}`, HINT_SUBLINE_KEYS.length);
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
        🕵️ {subline}
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

function LyricsReveal({ song }: { song: PhomuSong }) {
  const { t } = useTranslation();

  const fakeLabel = useMemo(() => {
    const index = pickIndex(`lyrics:${song.id}`, LYRICS_FAKE_LABEL_KEYS.length);
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
          📝 {fakeLabel}
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

function VibeCheckReveal({ song }: { song: PhomuSong }) {
  const { t } = useTranslation();

  const headline = useMemo(() => {
    const index = pickIndex(`cover:${song.id}`, VIBE_HEADLINE_KEYS.length);
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
        😎 {headline}
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

function SurvivorReveal({ song }: { song: PhomuSong }) {
  const { t } = useTranslation();
  const isOHW = song.isOneHitWonder;

  const headline = useMemo(() => {
    const keys = isOHW ? SURVIVOR_YES_KEYS : SURVIVOR_NO_KEYS;
    const variants = keys.length;
    const index = pickIndex(
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
        {isOHW ? '✋' : '🌟'}
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

function CoverConfusionReveal({ song }: { song: PhomuSong }) {
  const { t } = useTranslation();

  const headline = useMemo(() => {
    const index = pickIndex(`cover:${song.id}`, COVER_HEADLINE_KEYS.length);
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
        🎭 {headline}
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

function SongAttribution({ song }: { song: PhomuSong }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest opacity-25 mt-2">
      {song.title} &middot; {song.artist}
    </p>
  );
}

// ─── Main component ─────────────────────────────────────────────

export function RevealPhase({
  song,
  currentMode,
  answers,
  players,
  teams,
  winCondition,
  endingCondition,
  isGameOver,
  onNextRound,
  onEndGame,
  onOverrideCorrect,
  onOverrideRedraw,
  overrideGovernance = 'host',
}: RevealPhaseProps) {
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const { t, i18n } = useTranslation();

  // Format points and ranks with the active locale (Intl)
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  const scoringHeader = useMemo(() => {
    const index = pickIndex(
      `score:${song.id}:${currentMode}`,
      SCORING_HEADER_KEYS.length
    );
    return t(SCORING_HEADER_KEYS[index]!);
  }, [song.id, currentMode, t]);

  const nextRoundLabel = useMemo(() => {
    const index = pickIndex(
      `next:${song.id}:${answers.length}`,
      NEXT_ROUND_KEYS.length
    );
    return t(NEXT_ROUND_KEYS[index]!);
  }, [song.id, answers.length, t]);

  // Winner logic
  const showWinUI =
    isGameOver ||
    (endingCondition === 'points' &&
      (players.some((p) => p.score >= winCondition) ||
        teams.some((t) => t.score >= winCondition)));

  let winnerTitle: string | null = null;
  if (showWinUI) {
    const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
    const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];
    const isTeamMode = teams.length > 0;
    if (isTeamMode && topTeam) {
      winnerTitle = t('game.reveal.teamWinner', { name: topTeam.name });
    } else if (topPlayer) {
      winnerTitle = t('game.reveal.playerWinner', { name: topPlayer.name });
    }
  }

  // Points summary
  const scoringRows = answers
    .filter((a) => a.pointsAwarded > 0)
    .map((a) => {
      const player = players.find((p) => p.id === a.playerId);
      return { player, points: a.pointsAwarded };
    })
    .filter(
      (r): r is { player: Player; points: number } => r.player !== undefined
    );

  // Spicy feedback for the round (based on the first answer)
  const firstAnswer = answers[0];
  const spicyMessage = useMemo(() => {
    if (!firstAnswer) return null;
    const pool = firstAnswer.isCorrect ? CORRECT_MESSAGES : WRONG_MESSAGES;
    const keys = firstAnswer.isCorrect
      ? FEEDBACK_CORRECT_KEYS
      : FEEDBACK_WRONG_KEYS;
    const index = hashSeed(song.id) % pool.length;
    // The quip comes from the translation, the original text is only a fallback.
    return t(keys[index] ?? keys[0]!, {
      defaultValue: pool[index]!,
    });
  }, [firstAnswer, song.id, t]);
  const spicyColor = firstAnswer
    ? getSpicyColor(firstAnswer.isCorrect, song.id)
    : 'var(--color-text)';

  const governanceLabel = useMemo(() => {
    const key: TranslationKey =
      overrideGovernance === 'host'
        ? 'game.reveal.governanceHost'
        : overrideGovernance === 'co-host'
          ? 'game.reveal.governanceCoHost'
          : 'game.reveal.governanceMajority';
    return t(key);
  }, [overrideGovernance, t]);

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
      {/* ── Spicy Feedback Header ──────────────────────────────── */}
      {spicyMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2"
        >
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 mb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            {t('game.reveal.roundVerdict')}
          </div>
          <h2
            className="text-3xl font-black uppercase italic tracking-tighter drop-shadow-lg"
            style={{ color: spicyColor }}
          >
            {spicyMessage}
          </h2>
          <p className="text-sm font-bold opacity-50 mt-1 uppercase tracking-widest">
            {firstAnswer.isCorrect
              ? t('game.reveal.fullHit')
              : t('game.reveal.noHit')}
          </p>
        </motion.div>
      )}

      {/* ── Mode-specific resolution ───────────────────────── */}
      {currentMode === 'timeline' && <TimelineReveal song={song} />}
      {currentMode === 'hint-master' && <HintMasterReveal song={song} />}
      {currentMode === 'lyrics' && <LyricsReveal song={song} />}
      {currentMode === 'vibe-check' && <VibeCheckReveal song={song} />}
      {currentMode === 'survivor' && <SurvivorReveal song={song} />}
      {currentMode === 'cover-confusion' && (
        <CoverConfusionReveal song={song} />
      )}

      {/* ── Points summary ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-black uppercase tracking-widest opacity-40">
            {scoringHeader}
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((player, rank) => {
              const earned =
                answers.find((a) => a.playerId === player.id)?.pointsAwarded ??
                0;
              const isTop = rank === 0;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={isTop ? { background: 'rgba(255,255,255,0.03)' } : {}}
                >
                  {/* Rang */}
                  <span className="text-[10px] font-black opacity-30 w-4 tabular-nums text-right shrink-0">
                    {numberFormatter.format(rank + 1)}
                  </span>
                  {/* Avatar */}
                  <span className="text-lg shrink-0" aria-hidden>
                    {player.avatar ?? '🎵'}
                  </span>
                  {/* Name */}
                  <span
                    className="flex-1 font-bold text-sm truncate"
                    style={{ color: player.color }}
                  >
                    {player.name}
                  </span>
                  {/* This-round delta */}
                  {earned > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: -12, scale: 1.4 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 20,
                        delay: 0.5 + rank * 0.07,
                      }}
                      className="font-black text-sm px-2 py-0.5 rounded-lg"
                      style={{
                        color: 'var(--color-success)',
                        backgroundColor: 'rgba(34,197,94,0.12)',
                      }}
                    >
                      {t('game.reveal.pointsAwarded', { count: earned })}
                    </motion.span>
                  )}
                  {/* Total points */}
                  <span className="font-black text-sm tabular-nums opacity-80 w-10 text-right shrink-0">
                    {numberFormatter.format(player.score)}
                  </span>
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* ── Power-user menu ───────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowPowerMenu((v) => !v)}
          className="text-[10px] opacity-20 hover:opacity-60 transition-opacity px-2 py-1"
          aria-label={t('game.reveal.powerActionsAria')}
        >
          ⋯
        </button>
      </div>

      {showPowerMenu && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 -mt-4">
          <p className="text-[10px] uppercase tracking-wider opacity-60">
            {t('game.reveal.governance', { mode: governanceLabel })}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onOverrideCorrect?.();
                setShowPowerMenu(false);
              }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              {t('game.reveal.overrideCorrect')}
            </button>
            <button
              onClick={() => {
                onOverrideRedraw?.();
                setShowPowerMenu(false);
              }}
              className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              {t('game.reveal.overrideRedraw')}
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-2"
      >
        {showWinUI ? (
          <>
            <p
              className="text-center font-black text-2xl"
              style={{ color: 'var(--color-secondary)' }}
            >
              {winnerTitle}
            </p>
            <button
              onClick={onEndGame}
              className="w-full py-4 rounded-2xl text-xl font-black shadow-lg"
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: '#000',
              }}
            >
              {t('game.reveal.toWinnerScreen')}
            </button>
          </>
        ) : (
          <button
            onClick={onNextRound}
            className="w-full py-4 rounded-2xl text-xl font-black shadow-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {nextRoundLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
}
