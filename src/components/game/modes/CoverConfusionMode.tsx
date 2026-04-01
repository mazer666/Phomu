/**
 * Cover-Confusion-Modus
 *
 * Ein Cover-Song läuft. Ziel: Den Original-Interpreten erraten.
 *
 * Punktesystem (je weniger Hinweise, desto mehr Punkte):
 *   Kein Hinweis  → 5 Punkte (Ehrensystem: Spieler entscheidet selbst)
 *   1 Texthinweis → 4 Punkte (Ehrensystem)
 *   2 Texthinweise → 3 Punkte (Ehrensystem)
 *   3. Hinweis = 3 Auswahlmöglichkeiten → 2 Punkte (App entscheidet)
 *
 * Kein Tipp-Input: Ehrensystem oder Multiple-Choice.
 */
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';
import { MusicPlayer } from '../MusicPlayer';

const POINTS_BY_HINTS = [5, 4, 3, 2] as const;

type Phase = 'listening' | 'self-assess' | 'choice' | 'done';

interface CoverConfusionModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
  onReveal?: () => void;
}

export function CoverConfusionMode({ song, onAnswer, onReveal }: CoverConfusionModeProps) {
  const [hintsUsed, setHintsUsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('listening');
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  const points = POINTS_BY_HINTS[Math.min(hintsUsed, 3)];
  const playLink = song.links.coverLink || song.links.youtube;

  // 3 artists for multiple-choice: correct + 2 random wrong
  const choiceOptions = useMemo(() => {
    const others = Array.from(
      new Set(getAllSongs().map((s) => s.artist).filter((a) => a !== song.artist)),
    );
    const wrong = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
    return [...wrong, song.artist].sort(() => Math.random() - 0.5);
  }, [song.artist]);

  function handleGetHint() {
    if (hintsUsed < 2) {
      setHintsUsed((h) => h + 1);
    } else {
      // 3rd "hint" = multiple choice
      setHintsUsed(3);
      setPhase('choice');
    }
  }

  function handleSelfAssess(correct: boolean) {
    setWasCorrect(correct);
    onAnswer(correct, correct ? points : 0);
    setPhase('done');
  }

  function handleChoice(artist: string) {
    const correct = artist === song.artist;
    setWasCorrect(correct);
    onAnswer(correct, correct ? points : 0);
    setPhase('done');
  }

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">

      {/* Header */}
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <p className="text-[10px] font-black uppercase opacity-40">Cover Confusion 🎭</p>
          <p className="text-sm font-bold opacity-60">Wer ist der Original-Interpret?</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase opacity-40">Punkte möglich</p>
          <p className="text-xl font-black text-[var(--color-accent)]">
            {phase === 'done' ? (wasCorrect ? `+${points}` : '0') : `+${points}`}
          </p>
        </div>
      </div>

      {/* Music Player — gebluurt bis Antwort gegeben (Swipe zum Enthüllen) */}
      <MusicPlayer
        youtubeLink={playLink}
        startSeconds={song.previewTimestamp?.start ?? 0}
        blurred={phase !== 'done'}
      />
      {song.links.coverLink && (
        <p className="text-[10px] text-center -mt-2 font-black uppercase text-[var(--color-accent)] animate-pulse">
          COVER-VERSION AKTIV
        </p>
      )}

      {/* Text hints (shown cumulatively) */}
      <AnimatePresence initial={false}>
        {hintsUsed > 0 && hintsUsed <= 2 && (
          <div className="space-y-2">
            {song.hints.slice(0, hintsUsed).map((hint, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={[
                  'p-4 rounded-2xl text-sm leading-relaxed border',
                  i === hintsUsed - 1
                    ? 'border-[var(--color-accent)] bg-white/5'
                    : 'border-white/5 opacity-50',
                ].join(' ')}
              >
                <span className="font-black opacity-30 mr-2 text-xs">0{i + 1}</span>
                {hint}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Listening phase: Know it / Get hint ────────────────────── */}
      {phase === 'listening' && (
        <div className="space-y-3 mt-2">
          <button
            onClick={() => setPhase('self-assess')}
            className="w-full py-5 rounded-3xl bg-[var(--color-accent)] font-black text-lg text-white shadow-xl shadow-[var(--color-accent)]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Ich kenne ihn! ✋&nbsp;&nbsp;({points} Pkt)
          </button>

          <button
            onClick={handleGetHint}
            className="w-full py-4 rounded-2xl border-2 border-white/10 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all active:scale-95"
          >
            {hintsUsed < 2
              ? `Hinweis holen → ${POINTS_BY_HINTS[hintsUsed + 1]} Pkt`
              : `Letzter Hinweis: 3 Künstler zur Wahl → ${POINTS_BY_HINTS[3]} Pkt`}
          </button>
        </div>
      )}

      {/* ── Self-assess: show answer, player decides ──────────────── */}
      {phase === 'self-assess' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6"
        >
          <div>
            <p className="text-[10px] font-black uppercase opacity-40 mb-2">
              Der Original-Künstler war
            </p>
            <h3 className="text-2xl font-black">{song.artist}</h3>
            <p className="text-xs opacity-40 mt-1">
              {song.title} &middot; {song.year}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold italic opacity-50">Hattest du es gewusst?</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleSelfAssess(true)}
                className="flex-1 py-4 bg-green-500 rounded-2xl font-black text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all"
              >
                JA ✅
              </button>
              <button
                onClick={() => handleSelfAssess(false)}
                className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                NEIN ❌
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Multiple choice (3 artists) ───────────────────────────── */}
      {phase === 'choice' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs font-black uppercase tracking-widest text-center opacity-40">
            Wer ist der Original-Interpret?
          </p>
          {choiceOptions.map((artist) => (
            <button
              key={artist}
              onClick={() => handleChoice(artist)}
              className="w-full py-4 px-6 rounded-2xl border-2 border-white/10 bg-white/5 font-black text-sm hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all active:scale-95"
            >
              {artist}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Result card ───────────────────────────────────────────── */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={[
            'text-center p-5 rounded-3xl border space-y-2',
            wasCorrect
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10',
          ].join(' ')}
        >
          <p className="text-lg font-black">
            {wasCorrect ? 'Richtig! ✨' : 'Leider daneben 🌧️'}
          </p>
          <p className="text-sm opacity-60">
            Original: <span className="font-bold text-white">{song.artist}</span>
          </p>
          {wasCorrect && (
            <p className="text-xs font-black text-[var(--color-accent)]">+{points} Punkte</p>
          )}
        </motion.div>
      )}

      {/* ── Footer: WEITER after done ─────────────────────────────── */}
      {phase === 'done' && onReveal && (
        <footer className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-8 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
          <div className="max-w-md mx-auto">
            <button
              onClick={onReveal}
              className="w-full py-5 rounded-3xl font-black text-lg bg-[var(--color-accent)] text-white shadow-2xl active:scale-95 transition-all"
            >
              WEITER →
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
