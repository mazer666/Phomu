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
  const [cheatActive, setCheatActive] = useState(false);

  // 50% chance for "Original or Cover" variation - stabilized in state
  const [variation] = useState(() => Math.random() > 0.5 ? 'who-is-it' : 'original-or-cover');
  const [isCoverGuess, setIsCoverGuess] = useState<boolean | null>(null);

  const points = POINTS_BY_HINTS[Math.min(hintsUsed, 3)];
  const playLink = song.links.coverLink || song.links.youtube;

  // 3 artists for multiple-choice: correct + 2 random wrong - stabilized
  const [choiceOptions] = useState(() => {
    const others = Array.from(
      new Set(getAllSongs().map((s) => s.artist).filter((a) => a !== song.artist)),
    );
    const wrong = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
    return [...wrong, song.artist].sort(() => Math.random() - 0.5);
  });

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
    const finalPoints = correct ? Math.max(1, points - (cheatActive ? 2 : 0)) : 0;
    onAnswer(correct, finalPoints);
    setPhase('done');
  }

  function handleChoice(artist: string) {
    const correct = artist === song.artist;
    setWasCorrect(correct);
    const finalPoints = correct ? Math.max(1, points - (cheatActive ? 2 : 0)) : 0;
    onAnswer(correct, finalPoints);
    setPhase('done');
  }

  function handleChoiceVariation(guessCover: boolean) {
    const actuallyCover = !!song.links.coverLink;
    const correct = guessCover === actuallyCover;
    setWasCorrect(correct);
    onAnswer(correct, correct ? 3 : 0); // 3 Pkt für Variation
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
        <div className="text-right relative">
          <p className="text-[10px] font-black uppercase opacity-40">Punkte möglich</p>
          <p className="text-xl font-black text-[var(--color-accent)]">
            {phase === 'done' ? (wasCorrect ? `+${points}` : '0') : `+${points}`}
          </p>
          {cheatActive && (
            <span
              className="absolute -top-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-black shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#fb923c',
                transform: 'rotate(-5deg)',
                boxShadow: '0 2px 10px rgba(251,146,60,0.7)',
              }}
            >
              +{Math.max(1, points - 2)} CHEAT
            </span>
          )}
        </div>
      </div>

      {/* Music Player — gebluurt bis Antwort gegeben (Swipe zum Enthüllen) */}
      <MusicPlayer
        youtubeLink={playLink}
        youtubeAlternatives={
          song.links.coverLink
            ? undefined
            : (song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined))
        }
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
        <div className="space-y-4 mt-2">
          {variation === 'who-is-it' ? (
            <>
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

              {/* Music Cheat Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                whileHover={{ opacity: 1, scale: 1.05 }}
                onClick={() => {
                  setPhase('self-assess');
                  setCheatActive(true);
                }}
                className="text-[10px] font-black uppercase tracking-widest border border-white/10 py-2 rounded-xl hover:bg-white/5 transition-all mt-2 w-full"
              >
                🕵️ Musik-Cheat: Artist enthüllen (-2 Pkt)
              </motion.button>
            </>
          ) : (
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center space-y-6">
              <p className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)] opacity-80">
                Spezial-Variante
              </p>
              <h3 className="text-xl font-bold">Ist das ein Cover oder das Original?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoiceVariation(true)}
                  className="py-6 bg-blue-500 rounded-3xl font-black text-white shadow-lg active:scale-95 transition-all"
                >
                  COVER 🎭
                </button>
                <button
                  onClick={() => handleChoiceVariation(false)}
                  className="py-6 bg-purple-500 rounded-3xl font-black text-white shadow-lg active:scale-95 transition-all"
                >
                  ORIGINAL 💿
                </button>
              </div>
              <p className="text-[10px] opacity-40 uppercase font-black">+3 Punkte bei richtigem Tipp</p>
            </div>
          )}
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
