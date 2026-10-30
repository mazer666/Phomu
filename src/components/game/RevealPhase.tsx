/**
 * RevealPhase
 *
 * Shows exclusively the resolution relevant for the respective game mode.
 * No generic song dump — every mode answer gets its own visual language.
 *
 * WHAT: the phase that releases the solution. It shows the quip of the
 * round, the card of the mode, the points of the table and the buttons that
 * end the round.
 *
 * WHY the cards live apart: the card of a mode is the presentation of the
 * solution, and the six cards are the biggest part of the phase. They live
 * in `reveal/reveal-cards.tsx`, and the rules of the phase live in
 * `reveal/reveal-logic.ts`.
 */
'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RevealSong } from '@/core/types';
import type { PlayerAnswer } from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import type { GameMode } from '@/config/game-config';
import {
  CORRECT_MESSAGES,
  WRONG_MESSAGES,
  getSpicyColor,
  hashSeed,
} from '@/utils/feedback-messages';
import {
  FEEDBACK_CORRECT_KEYS,
  FEEDBACK_WRONG_KEYS,
  NEXT_ROUND_KEYS,
  SCORING_HEADER_KEYS,
  type TranslationKey,
} from '@/i18n/variant-keys';
import {
  CoverConfusionReveal,
  HintMasterReveal,
  LyricsReveal,
  SurvivorReveal,
  TimelineReveal,
  VibeCheckReveal,
} from './reveal/reveal-cards';
import {
  pickVariantIndex,
  pointsOfRound,
  resolveWinner,
} from './reveal/reveal-logic';
import { PlayerSticker } from '@/components/art/PlayerSticker';

// ─── Props ────────────────────────────────────────────────────────

interface RevealPhaseProps {
  song: RevealSong;
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
    const index = pickVariantIndex(
      `score:${song.id}:${currentMode}`,
      SCORING_HEADER_KEYS.length
    );
    return t(SCORING_HEADER_KEYS[index]!);
  }, [song.id, currentMode, t]);

  const nextRoundLabel = useMemo(() => {
    const index = pickVariantIndex(
      `next:${song.id}:${answers.length}`,
      NEXT_ROUND_KEYS.length
    );
    return t(NEXT_ROUND_KEYS[index]!);
  }, [song.id, answers.length, t]);

  // Winner logic
  const winner = resolveWinner({
    players,
    teams,
    winCondition,
    endingCondition,
    isGameOver,
  });
  const showWinUI = winner.showWinUI;
  const winnerTitle =
    winner.kind === 'team'
      ? t('game.reveal.teamWinner', { name: winner.name ?? '' })
      : winner.kind === 'player'
        ? t('game.reveal.playerWinner', { name: winner.name ?? '' })
        : null;

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
              const earned = pointsOfRound(answers, player.id);
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
                    <PlayerSticker kind={player.avatar} color={player.color} size={26} />
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
