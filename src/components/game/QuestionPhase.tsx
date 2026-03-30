/**
 * QuestionPhase
 *
 * Router-Komponente für die Fragerunde.
 * Leitet je nach aktivem Spielmodus an die passende Modus-Komponente weiter.
 * Timeline und Lyrics sind Platzhalter — werden in Phase 4 implementiert.
 */
'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GameMode } from '@/config/game-config';
import type { PhomuSong } from '@/types/song';
import { SurvivorMode } from './modes/SurvivorMode';
import { VibeCheckMode } from './modes/VibeCheckMode';
import { HintMasterMode } from './modes/HintMasterMode';

// ─── Props ────────────────────────────────────────────────────────

interface QuestionPhaseProps {
  song: PhomuSong;
  currentMode: GameMode;
  /** Wird aufgerufen, wenn der Spieler fertig ist: isCorrect + Punkte */
  onAnswered: (isCorrect: boolean, pointsAwarded: number) => void;
  /** Wird aufgerufen, wenn alle bereit sind zum Reveal */
  onReveal: () => void;
}

// ─── Platzhalter für noch nicht implementierte Modi ────────────────

function PlaceholderMode({
  song,
  modeName,
  onReveal,
}: {
  song: PhomuSong;
  modeName: string;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-6 text-center">
      <p className="text-5xl">🚧</p>
      <div>
        <h3 className="text-xl font-black mb-2">{modeName}</h3>
        <p className="opacity-60 text-sm max-w-xs">
          Dieser Modus wird in Phase 4 implementiert.
          <br />
          Für jetzt: Diskutiert gemeinsam und entscheidet!
        </p>
      </div>
      <p className="opacity-40 text-sm">
        Song: <strong>{song.title}</strong> von {song.artist} ({song.year})
      </p>
      <button
        onClick={onReveal}
        className="px-8 py-4 rounded-2xl font-black text-lg"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        Weiter zum Reveal →
      </button>
    </div>
  );
}

// ─── Komponente ───────────────────────────────────────────────────

export function QuestionPhase({
  song,
  currentMode,
  onAnswered,
  onReveal,
}: QuestionPhaseProps) {
  // Nach Antwort: kurz warten, dann Reveal anbieten
  const handleAnswered = useCallback(
    (isCorrect: boolean, points: number) => {
      onAnswered(isCorrect, points);
    },
    [onAnswered],
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Modus-spezifischer Inhalt */}
      {currentMode === 'survivor' && (
        <SurvivorMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'vibe-check' && (
        <VibeCheckMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'hint-master' && (
        <HintMasterMode song={song} onAnswer={handleAnswered} />
      )}

      {currentMode === 'timeline' && (
        <PlaceholderMode
          song={song}
          modeName="📅 Chronologische Timeline"
          onReveal={onReveal}
        />
      )}

      {currentMode === 'lyrics' && (
        <PlaceholderMode
          song={song}
          modeName="📝 Lyrics Labyrinth"
          onReveal={onReveal}
        />
      )}

      {/* Reveal-Button (für Survivor, Vibe-Check, Hint-Master nach der Antwort) */}
      {(currentMode === 'survivor' ||
        currentMode === 'vibe-check' ||
        currentMode === 'hint-master') && (
        <motion.div
          className="flex justify-center mt-6 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={onReveal}
            className="px-8 py-3 rounded-xl font-bold border opacity-70 hover:opacity-100
                       transition-opacity text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Alle fertig → Reveal
          </button>
        </motion.div>
      )}
    </div>
  );
}
