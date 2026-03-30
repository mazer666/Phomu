/**
 * Vibe-Check-Modus
 *
 * Der Artist und die Dekade sind sichtbar — Spieler wählen eine Stimmung aus.
 * Punkte gibt es, wenn mindestens eine gewählte Stimmung in song.mood steht.
 * Alle 6 Stimmungs-Optionen werden angezeigt, damit kein Hinweis durch
 * eine reduzierte Liste entsteht.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { PhomuSong } from '@/types/song';

// Alle möglichen Stimmungen (aus dem PhomuSong-Schema)
const ALL_MOODS = [
  'Dance Floor',
  'Nostalgic',
  'Party Anthem',
  'Heartbreak',
  'Epic',
  'Chill',
  'Rebellious',
  'Euphoric',
  'Melancholic',
  'Feel Good',
  'Dark',
  'Romantic',
] as const;

interface VibeCheckModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}

export function VibeCheckMode({ song, onAnswer }: VibeCheckModeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSelect(mood: string) {
    if (answered) return;
    const isCorrect = song.mood.includes(mood);
    setSelected(mood);
    setAnswered(true);
    // Vibe-Check: 2 Punkte für richtige Stimmung
    onAnswer(isCorrect, isCorrect ? 2 : 0);
  }

  // Sechs zufällige Stimmungen (inkl. mind. einer richtigen) — einmalig stabilisiert
  const options = useMemo(() => {
    const correctMood = song.mood[0];
    const wrong = ALL_MOODS.filter((m) => !song.mood.includes(m));
    const shuffled = [...wrong].sort(() => Math.random() - 0.5).slice(0, 5);
    return [...shuffled, correctMood].sort(() => Math.random() - 0.5);
  // song.id ist stabil solange derselbe Song angezeigt wird
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-6">

      {/* Artist-Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Artist & Dekade</p>
        <h3 className="text-3xl font-black mb-1">{song.artist}</h3>
        <p className="opacity-50 text-sm">{Math.floor(song.year / 10) * 10}er</p>
      </motion.div>

      {/* Frage */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-lg font-bold text-center"
      >
        Welche Stimmung passt zu diesem Song?
      </motion.p>

      {/* Stimmungs-Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-sm"
      >
        {options.map((mood) => {
          const isSelected = selected === mood;
          const isCorrectMood = song.mood.includes(mood);

          let bgColor = 'var(--color-bg-card)';
          let borderColor = 'var(--color-border)';
          if (answered && isSelected && isCorrectMood) bgColor = 'var(--color-success)';
          else if (answered && isSelected && !isCorrectMood) bgColor = 'var(--color-error)';
          else if (answered && isCorrectMood) borderColor = 'var(--color-success)';

          return (
            <button
              key={mood}
              onClick={() => handleSelect(mood)}
              disabled={answered}
              className="py-3 px-2 rounded-xl border text-sm font-bold transition-all disabled:cursor-default"
              style={{ backgroundColor: bgColor, borderColor }}
            >
              {mood}
            </button>
          );
        })}
      </motion.div>

      {answered && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm opacity-50"
        >
          {song.mood.includes(selected ?? '') ? '✅ Richtig!' : '❌ Falsch!'} Wartet auf das Reveal …
        </motion.p>
      )}
    </div>
  );
}
