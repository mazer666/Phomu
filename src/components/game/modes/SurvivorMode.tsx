/**
 * Survivor-Modus
 *
 * Spieler entscheiden: Ist dieser Artist ein One-Hit-Wonder oder ein Dauerstar?
 * Die Song-Informationen sind verdeckt — nur Artist und Dekade sichtbar.
 * Richtige Antwort: isOneHitWonder aus den Song-Metadaten.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhomuSong } from '@/types/song';

interface SurvivorModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}

export function SurvivorMode({ song, onAnswer }: SurvivorModeProps) {
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);

  function handleChoice(guessedOneHit: boolean) {
    if (answered) return;
    const isCorrect = guessedOneHit === song.isOneHitWonder;
    setChoice(guessedOneHit);
    setAnswered(true);
    // Survivor: 3 Punkte für richtige Antwort
    onAnswer(isCorrect, isCorrect ? 3 : 0);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-8">

      {/* Song-Infos (Titel verborgen) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Artist</p>
        <h3 className="text-3xl font-black mb-1">{song.artist}</h3>
        <p className="opacity-50 text-sm">
          {Math.floor(song.year / 10) * 10}er · {song.genre}
        </p>
      </motion.div>

      {/* Frage */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-bold text-center"
      >
        War dieser Artist ein One-Hit-Wonder?
      </motion.p>

      {/* Antwort-Buttons */}
      {!answered ? (
        <motion.div
          className="flex gap-4 w-full max-w-xs"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => handleChoice(true)}
            className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-error)' }}
          >
            ✋ Ja
          </button>
          <button
            onClick={() => handleChoice(false)}
            className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            🌟 Nein
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-5xl mb-3">
            {choice === song.isOneHitWonder ? '✅' : '❌'}
          </p>
          <p className="font-bold">
            {song.isOneHitWonder
              ? 'Ja, ein One-Hit-Wonder!'
              : 'Nein, ein echter Dauerstar!'}
          </p>
          <p className="text-sm opacity-50 mt-1">Wartet auf das Reveal …</p>
        </motion.div>
      )}
    </div>
  );
}
