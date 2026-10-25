/**
 * GameHeader
 *
 * Shows at the top edge of the game:
 * - round number
 * - current game mode with icon
 * - the player whose turn it is (pilot)
 * - countdown timer (if configured)
 * - exit button back to the lobby
 */
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameMode } from '@/config/game-config';
import type { TranslationKey } from '@/i18n/types';

// ─── Mode icons ──────────────────────────────────────────────────

const MODE_ICONS: Record<GameMode, string> = {
  timeline: '📅',
  'hint-master': '🕵️',
  lyrics: '📝',
  'vibe-check': '😎',
  survivor: '🏆',
  'cover-confusion': '🎭',
};

/** Translation keys of the mode display names (order = MODE_ICONS). */
const MODE_LABEL_KEYS: Record<GameMode, TranslationKey> = {
  timeline: 'game.header.modeLabel.timeline',
  'hint-master': 'game.header.modeLabel.hintMaster',
  lyrics: 'game.header.modeLabel.lyrics',
  'vibe-check': 'game.header.modeLabel.vibeCheck',
  survivor: 'game.header.modeLabel.survivor',
  'cover-confusion': 'game.header.modeLabel.coverConfusion',
};

// ─── Props ────────────────────────────────────────────────────────

interface GameHeaderProps {
  roundNumber: number;
  currentMode: GameMode;
  pilotName?: string;
  pilotAvatar?: string;
  pilotColor?: string;
  /** Seconds until the timer expires — null = no timer */
  timeLimitSeconds: number | null;
  /** Fortschritt in Prozent (0-100) */
  progressPercentage?: number;
  /** Optional label for the progress target (e.g. "10", "100 pts") */
  targetLabel?: string;
  /** Called when the timer expires */
  onTimeUp?: () => void;
  /** Called when the user presses "Exit" */
  onExit?: () => void;
}

// ─── Component ───────────────────────────────────────────────────

interface TimerCountdownProps {
  initialSeconds: number;
  onTimeUp?: () => void;
}

function TimerCountdown({ initialSeconds, onTimeUp }: TimerCountdownProps) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp?.();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onTimeUp]);

  const timerColor =
    secondsLeft > 20
      ? 'var(--color-success)'
      : secondsLeft > 10
        ? 'var(--color-secondary)'
        : 'var(--color-error)';

  return (
    <div
      className="text-3xl font-black tabular-nums min-w-[2.5ch] text-right"
      style={{
        color: timerColor,
        filter: `drop-shadow(0 0 8px ${timerColor}44)`,
      }}
      aria-label={t('game.header.secondsLeft', { seconds: secondsLeft })}
    >
      {secondsLeft}
    </div>
  );
}

export function GameHeader({
  roundNumber,
  currentMode,
  pilotName,
  pilotAvatar,
  pilotColor = 'var(--color-primary)',
  timeLimitSeconds,
  progressPercentage = 0,
  targetLabel,
  onTimeUp,
  onExit,
}: GameHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      router.push('/lobby');
    }
  }, [onExit, router]);

  const displayProgressLabel = useMemo(() => {
    if (!targetLabel) return t('game.header.round', { round: roundNumber });
    // If targetLabel is e.g. "10" -> "Round 3 / 10"
    const target = Number(targetLabel);
    if (!isNaN(target)) {
      return t('game.header.roundOf', { round: roundNumber, total: target });
    }
    // If targetLabel is e.g. "100 pts" -> "45 / 100 pts"
    return t('game.header.roundOfTarget', {
      round: roundNumber,
      target: targetLabel,
    });
  }, [roundNumber, targetLabel, t]);

  return (
    <header
      className="flex flex-col sticky top-0 z-40 backdrop-blur-md pt-safe"
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Subtle Progress Bar */}
      <div className="w-full h-[3px] bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 px-4 py-3 border-b border-white/5">
        {/* Exit button */}
        <button
          onClick={handleExit}
          className="w-11 h-11 flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
          aria-label={t('game.header.exitAriaLabel')}
          title={t('game.header.exitTitle')}
        >
          ✕
        </button>

        {/* Mode badge (desktop-only details) */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black shrink-0"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span aria-hidden className="text-sm">
            {MODE_ICONS[currentMode]}
          </span>
          <span className="hidden md:inline uppercase tracking-widest opacity-60">
            {t(MODE_LABEL_KEYS[currentMode])}
          </span>
        </div>

        {/* --- Pilot display (the star) --- */}
        <div className="flex-1 flex items-center justify-center min-w-0 mx-2">
          {pilotName ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner max-w-full">
              {/* Pilot indicator dot/avatar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 shadow-lg"
                style={{
                  backgroundColor: pilotColor,
                  boxShadow: `0 0 12px ${pilotColor}44`,
                  color: '#fff',
                }}
              >
                {pilotAvatar || '👤'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40 leading-none mb-0.5">
                  {t('game.header.pilotLabel')}
                </span>
                <span className="text-xs font-black truncate">{pilotName}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-black uppercase tracking-widest opacity-20">
              {t('game.header.waiting')}
            </div>
          )}
        </div>

        {/* Round + timer */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[9px] font-black uppercase opacity-30 tracking-widest leading-none mb-0.5">
              {t('game.header.progress')}
            </span>
            <span className="text-[11px] font-black tabular-nums">
              {displayProgressLabel}
            </span>
          </div>

          {timeLimitSeconds !== null && (
            <TimerCountdown
              key={`${roundNumber}-${timeLimitSeconds}`}
              initialSeconds={timeLimitSeconds}
              onTimeUp={onTimeUp}
            />
          )}
        </div>
      </div>
    </header>
  );
}
