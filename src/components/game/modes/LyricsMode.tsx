/**
 * Lyrics-Labyrinth-Modus
 *
 * Drei echte Zeilen und eine KI-generierte Fake-Zeile werden gemischt.
 * Der Spieler muss die FALSCHE Zeile identifizieren.
 *
 * Wenn song.lyrics null ist: Bonus-Runde ohne Lyrics-Daten.
 *
 * Punktzahl: 4 Punkte für korrekte Fake-Erkennung.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { PhomuSong } from '@/types/song';

// ─── Konstanten ───────────────────────────────────────────────────

const LYRICS_POINTS = 4;

/** Mischt ein Array zufällig */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Props ────────────────────────────────────────────────────────

interface LyricsModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}

// ─── Hauptkomponente ──────────────────────────────────────────────

export function LyricsMode({ song, onAnswer }: LyricsModeProps) {
  const lyrics = song.lyrics;

  // Fallback wenn keine Lyrics vorhanden
  if (!lyrics) {
    return <BonusRound song={song} onAnswer={onAnswer} />;
  }

  return <LyricsQuestion song={song} lyrics={lyrics} onAnswer={onAnswer} />;
}

// ─── Lyrics-Frage (wenn Daten vorhanden) ─────────────────────────

type SongLyrics = NonNullable<PhomuSong['lyrics']>;

function LyricsQuestion({
  song,
  lyrics,
  onAnswer,
}: {
  song: PhomuSong;
  lyrics: SongLyrics;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  // 3 echte + 1 fake Zeile mischen — einmalig stabilisiert
  const options = useMemo(() => {
    const items = [
      { text: lyrics.real[0], isFake: false },
      { text: lyrics.real[1], isFake: false },
      { text: lyrics.real[2], isFake: false },
      { text: lyrics.fake,    isFake: true  },
    ];
    return shuffle(items);
  // song.id ist stabil solange derselbe Song angezeigt wird
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);

  function handleSelect(index: number) {
    if (answered) return;
    const isCorrect = options[index]?.isFake ?? false;
    setSelected(index);
    setAnswered(true);
    onAnswer(isCorrect, isCorrect ? LYRICS_POINTS : 0);
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-lg mx-auto">

      {/* Artist-Hinweis */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Artist</p>
        <h3 className="text-2xl font-black">{song.artist}</h3>
        <p className="text-sm opacity-60 mt-1 font-medium">
          Welche Zeile ist <span style={{ color: 'var(--color-error)' }}>NICHT echt</span>?
        </p>
      </motion.div>

      {/* Lyrics-Optionen */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isFakeAndAnswered = answered && option.isFake;
          const isWrong = answered && isSelected && !option.isFake;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className="text-left p-4 rounded-xl border-2 text-sm leading-relaxed
                         font-mono transition-all disabled:cursor-default"
              style={{
                borderColor: isFakeAndAnswered
                  ? 'var(--color-success)'
                  : isWrong
                  ? 'var(--color-error)'
                  : isSelected
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
                backgroundColor: isFakeAndAnswered
                  ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                  : isWrong
                  ? 'color-mix(in srgb, var(--color-error) 15%, transparent)'
                  : 'var(--color-bg-card)',
              }}
            >
              <span className="font-sans font-bold opacity-40 mr-2 text-xs">
                {String.fromCharCode(65 + i)}.
              </span>
              &ldquo;{option.text}&rdquo;
              {isFakeAndAnswered && (
                <span
                  className="ml-2 text-xs font-sans font-bold"
                  style={{ color: 'var(--color-success)' }}
                >
                  ← FAKE
                </span>
              )}
              {isWrong && (
                <span
                  className="ml-2 text-xs font-sans font-bold"
                  style={{ color: 'var(--color-error)' }}
                >
                  ← Echt!
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {answered && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm opacity-50 text-center"
        >
          {options[selected ?? -1]?.isFake
            ? `✅ Richtig! +${LYRICS_POINTS} Punkte`
            : '❌ Falsch!'}{' '}
          Wartet auf das Reveal …
        </motion.p>
      )}
    </div>
  );
}

// ─── Bonus-Runde (keine Lyrics vorhanden) ────────────────────────

function BonusRound({
  song,
  onAnswer,
}: {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}) {
  const [claimed, setClaimed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] px-6 gap-6 text-center">
      <p className="text-5xl">🎁</p>
      <div>
        <h3 className="text-xl font-black mb-2">Bonus-Runde!</h3>
        <p className="opacity-60 text-sm max-w-xs leading-relaxed">
          Für <strong>{song.artist}</strong> sind noch keine Lyrics eingetragen.
          <br className="my-1" />
          Wer den Song erkennt und ihn laut nennt, bekommt 2 Bonus-Punkte!
        </p>
      </div>
      {!claimed ? (
        <div className="flex gap-3">
          <button
            onClick={() => { setClaimed(true); onAnswer(true, 2); }}
            className="px-6 py-3 rounded-xl font-black"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            ✅ Ich kenn&apos;s!
          </button>
          <button
            onClick={() => { setClaimed(true); onAnswer(false, 0); }}
            className="px-6 py-3 rounded-xl font-bold border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Kein Schimmer
          </button>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm opacity-50"
        >
          Wartet auf das Reveal …
        </motion.p>
      )}
    </div>
  );
}
