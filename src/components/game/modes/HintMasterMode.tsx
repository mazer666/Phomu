/**
 * Hint-Master-Modus
 *
 * Zeigt bis zu 5 Hinweise nacheinander.
 * Der Pilot tippt einen Song-Titel ein. Punkte: 5/4/3/2/1 je nach Hinweis-Ebene.
 * Der Pilot validiert die Antworten der anderen Spieler manuell.
 */
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { PHOMU_CONFIG } from '@/config/game-config';

interface HintMasterModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}

export function HintMasterMode({ song, onAnswer }: HintMasterModeProps) {
  const [shownHints, setShownHints] = useState(1);
  const [guessInput, setGuessInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const maxHints = song.hints.length;
  const points = PHOMU_CONFIG.HINT_MASTER_POINTS[shownHints - 1] ?? 1;

  const handleNextHint = useCallback(() => {
    if (shownHints < maxHints) setShownHints((n) => n + 1);
  }, [shownHints, maxHints]);

  const handleGuess = useCallback(() => {
    if (answered || !guessInput.trim()) return;

    // Normalisierte Vergleich: Groß-/Kleinschreibung ignorieren, Sonderzeichen
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '').trim();

    const correct = normalize(guessInput) === normalize(song.title);
    setIsCorrect(correct);
    setAnswered(true);
    onAnswer(correct, correct ? points : 0);
  }, [answered, guessInput, song.title, points, onAnswer]);

  return (
    <div className="flex flex-col px-6 gap-5 pt-4 max-w-lg mx-auto">

      {/* Hinweis-Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm opacity-50">
          Hinweis {shownHints} / {maxHints}
        </p>
        <p className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
          {points} {points === 1 ? 'Punkt' : 'Punkte'}
        </p>
      </div>

      {/* Hinweis-Karten */}
      <div className="space-y-2">
        <AnimatePresence>
          {song.hints.slice(0, shownHints).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl text-sm leading-relaxed"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                opacity: i < shownHints - 1 ? 0.6 : 1,
              }}
            >
              <span className="font-bold opacity-40 mr-2">#{i + 1}</span>
              {hint}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Nächster-Hinweis-Button (nur wenn noch Hinweise übrig) */}
      {!answered && shownHints < maxHints && (
        <button
          onClick={handleNextHint}
          className="py-2 rounded-xl text-sm font-semibold border opacity-60 hover:opacity-100 transition-opacity"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Nächster Hinweis → weniger Punkte
        </button>
      )}

      {/* Eingabefeld */}
      {!answered ? (
        <div className="flex gap-2 mt-2">
          <input
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            placeholder="Song-Titel eingeben …"
            className="flex-1 bg-white/10 border border-[var(--color-border)]
                       rounded-xl px-4 py-3 focus:outline-none
                       focus:border-[var(--color-accent)] transition-colors"
          />
          <button
            onClick={handleGuess}
            disabled={!guessInput.trim()}
            className="px-5 py-3 rounded-xl font-bold disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            ✓
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <p className="text-4xl mb-2">{isCorrect ? '✅' : '❌'}</p>
          <p className="font-bold">
            {isCorrect ? `Richtig! +${points} Punkte` : 'Leider falsch.'}
          </p>
          <p className="text-sm opacity-50 mt-1">Wartet auf das Reveal …</p>
        </motion.div>
      )}
    </div>
  );
}
