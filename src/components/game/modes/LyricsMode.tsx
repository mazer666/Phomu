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
import { MusicPlayer } from '../MusicPlayer';

// ─── Konstanten ───────────────────────────────────────────────────

const LYRICS_POINTS = 4;

/** Mischt ein Array zufällig */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Props ────────────────────────────────────────────────────────

interface LyricsModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
  onReveal: () => void;
}

// ─── Hauptkomponente ──────────────────────────────────────────────

export function LyricsMode({ song, onAnswer, onReveal }: LyricsModeProps) {
  const lyrics = song.lyrics;

  // Fallback wenn keine Lyrics vorhanden
  if (!lyrics) {
    return <BonusRound song={song} onAnswer={onAnswer} onReveal={onReveal} />;
  }

  return <LyricsQuestion song={song} lyrics={lyrics} onAnswer={onAnswer} onReveal={onReveal} />;
}

// ─── Lyrics-Frage (wenn Daten vorhanden) ─────────────────────────

type SongLyrics = NonNullable<PhomuSong['lyrics']>;

function LyricsQuestion({
  song,
  lyrics,
  onAnswer,
  onReveal,
}: {
  song: PhomuSong;
  lyrics: SongLyrics;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
  onReveal: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [cheatActive, setCheatActive] = useState(false);

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
    setSelected(index);
  }

  function handleConfirm() {
    if (selected === null || isRevealing) return;
    setIsRevealing(true);
    const isCorrect = options[selected]?.isFake ?? false;
    // Lyrics-Cheat: Fix 1 Punkt, sonst 4 Punkte
    const points = isCorrect ? (cheatActive ? 1 : LYRICS_POINTS) : 0;
    onAnswer(isCorrect, points);
    onReveal();
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-lg mx-auto">

      {/* Artist-Hinweis */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Song</p>
        <h3 className="text-2xl font-black">{song.artist}</h3>
        <p className="text-lg font-bold opacity-70 mb-2">{song.title}</p>
        <p className="text-sm opacity-60 mt-1 font-medium">
          Welche Zeile ist <span style={{ color: 'var(--color-error)' }}>NICHT echt</span>?
        </p>

        {/* Cheat-Button */}
        {!isRevealing && !cheatActive && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCheatActive(true)}
            className="mt-4 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-yellow-500/30 text-yellow-500/60 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all mx-auto"
          >
            🔍 Musik hören (nur 1 Pkt Fix)
          </motion.button>
        )}

        {/* Cheat Player */}
        {cheatActive && !isRevealing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xs mx-auto mt-2"
          >
            <MusicPlayer 
              youtubeLink={song.links.youtube}
              youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
              startSeconds={song.previewTimestamp?.start ?? 0}
              blurred={false}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Lyrics-Optionen */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, i) => {
          const isSelected = selected === i;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleSelect(i)}
              disabled={false}
              className="text-left p-4 rounded-xl border-2 text-sm leading-relaxed
                         font-mono transition-all disabled:cursor-default"
              style={{
                borderColor: isSelected
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'var(--color-bg-card)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <span className="font-sans font-bold opacity-40 mr-2 text-xs">
                {String.fromCharCode(65 + i)}.
              </span>
              &ldquo;{option.text}&rdquo;
            </motion.button>
          );
        })}
      </div>

      {selected !== null && (
        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           className="mt-4 flex justify-center"
        >
           <button
             onClick={handleConfirm}
             className="px-8 py-4 w-full rounded-2xl text-xl font-black shadow-lg hover:opacity-90 transition-opacity"
             style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
           >
             Bestätigen & Auflösen
           </button>
        </motion.div>
      )}

      {isRevealing && (
        <div style={{ display: 'none' }}>
           <MusicPlayer
             youtubeLink={song.links.youtube}
             youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
           />
        </div>
      )}
    </div>
  );
}

// ─── Bonus-Runde (keine Lyrics vorhanden) ────────────────────────

function BonusRound({
  song,
  onAnswer,
  onReveal,
}: {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
  onReveal: () => void;
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
            onClick={() => { setClaimed(true); onAnswer(true, 2); onReveal(); }}
            className="px-6 py-3 rounded-xl font-black"
            style={{ backgroundColor: 'var(--color-success)' }}
          >
            ✅ Ich kenn&apos;s!
          </button>
          <button
            onClick={() => { setClaimed(true); onAnswer(false, 0); onReveal(); }}
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
