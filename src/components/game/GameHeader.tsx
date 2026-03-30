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

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GameMode } from '@/config/game-config';

// ─── Modus-Icons ──────────────────────────────────────────────────

const MODE_ICONS: Record<GameMode, string> = {
  timeline:    '📅',
  'hint-master': '🕵️',
  lyrics:      '📝',
  'vibe-check': '😎',
  survivor:    '🏆',
};

const MODE_LABELS: Record<GameMode, string> = {
  timeline:    'Timeline',
  'hint-master': 'Hint-Master',
  lyrics:      'Lyrics',
  'vibe-check': 'Vibe-Check',
  survivor:    'Survivor',
};

// ─── Props ────────────────────────────────────────────────────────

interface GameHeaderProps {
  roundNumber: number;
  currentMode: GameMode;
  pilotName?: string;
  /** Sekunden bis der Timer abläuft — null = kein Timer */
  timeLimitSeconds: number | null;
  /** Wird aufgerufen, wenn der Timer abläuft */
  onTimeUp?: () => void;
  /** Wird aufgerufen, wenn der Nutzer "Exit" drückt */
  onExit?: () => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function GameHeader({
  roundNumber,
  currentMode,
  pilotName,
  timeLimitSeconds,
  onTimeUp,
  onExit,
}: GameHeaderProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(timeLimitSeconds);

  // Timer zurücksetzen wenn neue Runde beginnt (timeLimitSeconds ändert sich)
  useEffect(() => {
    setSecondsLeft(timeLimitSeconds);
  }, [timeLimitSeconds, roundNumber]);

  // Countdown-Logik
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      if (secondsLeft === 0) onTimeUp?.();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onTimeUp]);

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      router.push('/lobby');
    }
  }, [onExit, router]);

  // Timer-Farbe: grün → gelb → rot
  const timerColor =
    secondsLeft === null ? 'var(--color-text)'
    : secondsLeft > 20 ? 'var(--color-success)'
    : secondsLeft > 10 ? 'var(--color-secondary)'
    : 'var(--color-error)';

  return (
    <header
      className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Exit-Button */}
      <button
        onClick={handleExit}
        className="text-lg opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Spiel verlassen"
        title="Zur Lobby"
      >
        ✕
      </button>

      {/* Modus-Badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shrink-0"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <span aria-hidden>{MODE_ICONS[currentMode]}</span>
        <span>{MODE_LABELS[currentMode]}</span>
      </div>

      {/* Runde + Pilot */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">Runde {roundNumber}</p>
        {pilotName && (
          <p className="text-xs opacity-50 truncate">🎮 {pilotName}</p>
        )}
      </div>

      {/* Timer */}
      {secondsLeft !== null && (
        <div
          className="shrink-0 text-2xl font-black tabular-nums min-w-[3ch] text-right"
          style={{ color: timerColor }}
          aria-label={`${secondsLeft} Sekunden übrig`}
        >
          {secondsLeft}
        </div>
      )}
    </header>
  );
}
