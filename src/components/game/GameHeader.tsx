/**
 * GameHeader
 *
 * Zeigt am oberen Rand des Spiels:
 * - Runden-Nummer
 * - Aktuellen Spielmodus mit Icon
 * - Spieler, der gerade dran ist (Pilot)
 * - Countdown-Timer (wenn konfiguriert)
 * - Exit-Button zurück zur Lobby
 */
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { GameMode } from '@/config/game-config';

// ─── Modus-Icons ──────────────────────────────────────────────────

const MODE_ICONS: Record<GameMode, string> = {
  timeline:    '📅',
  'hint-master': '🕵️',
  lyrics:      '📝',
  'vibe-check': '😎',
  survivor:    '🏆',
  'cover-confusion': '🎭',
};

const MODE_LABELS: Record<GameMode, string> = {
  timeline:    'Timeline',
  'hint-master': 'Hint-Master',
  lyrics:      'Lyrics',
  'vibe-check': 'Vibe-Check',
  survivor:    'Survivor',
  'cover-confusion': 'Cover Confusion',
};

// ─── Props ────────────────────────────────────────────────────────

interface GameHeaderProps {
  roundNumber: number;
  currentMode: GameMode;
  pilotName?: string;
  pilotAvatar?: string;
  pilotColor?: string;
  /** Sekunden bis der Timer abläuft — null = kein Timer */
  timeLimitSeconds: number | null;
  /** Fortschritt in Prozent (0-100) */
  progressPercentage?: number;
  /** Optionales Label für das Fortschritts-Ziel (z.B. "10", "100 Pkt") */
  targetLabel?: string;
  /** Wird aufgerufen, wenn der Timer abläuft */
  onTimeUp?: () => void;
  /** Wird aufgerufen, wenn der Nutzer "Exit" drückt */
  onExit?: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────


interface TimerCountdownProps {
  initialSeconds: number;
  onTimeUp?: () => void;
}

function TimerCountdown({ initialSeconds, onTimeUp }: TimerCountdownProps) {
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
    secondsLeft > 20 ? 'var(--color-success)'
      : secondsLeft > 10 ? 'var(--color-secondary)'
        : 'var(--color-error)';

  return (
    <div
      className="text-3xl font-black tabular-nums min-w-[2.5ch] text-right"
      style={{ color: timerColor, filter: `drop-shadow(0 0 8px ${timerColor}44)` }}
      aria-label={`${secondsLeft} Sekunden übrig`}
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

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      router.push('/lobby');
    }
  }, [onExit, router]);


  const displayProgressLabel = useMemo(() => {
    if (!targetLabel) return `Runde ${roundNumber}`;
    // Wenn targetLabel z.B. "10" ist -> "Runde 3 / 10"
    if (!isNaN(Number(targetLabel))) {
      return `Runde ${roundNumber} / ${targetLabel}`;
    }
    // Wenn targetLabel z.B. "100 Pkt" -> "45 / 100 Pkt"
    return `${roundNumber} / ${targetLabel}`;
  }, [roundNumber, targetLabel]);

  return (
    <header
      className="flex flex-col sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Subtle Progress Bar */}
      <div className="w-full h-[3px] bg-white/10 overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="h-full"
           style={{ backgroundColor: 'var(--color-accent)' }}
         />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 px-4 py-3 border-b border-white/5">
        {/* Exit-Button */}
        <button
          onClick={handleExit}
          className="text-lg opacity-40 hover:opacity-100 transition-opacity shrink-0 pr-1"
          aria-label="Spiel verlassen"
          title="Zur Lobby"
        >
          ✕
        </button>

        {/* Modus-Badge (Desktop only details) */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black shrink-0"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <span aria-hidden className="text-sm">{MODE_ICONS[currentMode]}</span>
          <span className="hidden md:inline uppercase tracking-widest opacity-60">{MODE_LABELS[currentMode]}</span>
        </div>

        {/* --- Pilot Display (The Star) --- */}
        <div className="flex-1 flex items-center justify-center min-w-0 mx-2">
          {pilotName ? (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner max-w-full"
            >
              {/* Pilot Indicator dot/avatar */}
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 shadow-lg"
                style={{ 
                  backgroundColor: pilotColor, 
                  boxShadow: `0 0 12px ${pilotColor}44`,
                  color: '#fff' 
                }}
              >
                {pilotAvatar || '👤'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40 leading-none mb-0.5">Pionier</span>
                <span className="text-xs font-black truncate">{pilotName}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-black uppercase tracking-widest opacity-20">Warten...</div>
          )}
        </div>

        {/* Runde + Timer */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end mr-1">
             <span className="text-[9px] font-black uppercase opacity-30 tracking-widest leading-none mb-0.5">Fortschritt</span>
             <span className="text-[11px] font-black tabular-nums">{displayProgressLabel}</span>
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
