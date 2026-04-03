/**
 * Hint-Master-Modus (Refined Phase 5)
 *
 * Zeigt bis zu 5 Hinweise.
 * Ab Hinweis 4 kann Musik abgespielt werden.
 * Kein Tippen mehr nötig — der Spieler klickt auf "Lösung" und entscheidet selbst.
 */
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { PHOMU_CONFIG } from '@/config/game-config';
import { MusicPlayer } from '../MusicPlayer';
import { censorHint } from '@/utils/censor-utils';

interface HintMasterModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
}

export function HintMasterMode({ song, onAnswer }: HintMasterModeProps) {
  const [shownHints, setShownHints] = useState(1);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [done, setDone] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [cheatUsed, setCheatUsed] = useState(false);

  const maxHints = song.hints.length;
  const points = PHOMU_CONFIG.HINT_MASTER_POINTS[shownHints - 1] ?? 1;
  const startSecs = song.previewTimestamp?.start ?? 0;

  const handleNextHint = useCallback(() => {
    if (shownHints < maxHints) {
      setShownHints((n) => n + 1);
      // Ab Hinweis 4 Musik erlauben (oder automatisch abspielen)
      if (shownHints + 1 >= 4) setShowMusic(true);
    }
  }, [shownHints, maxHints]);

  const handleFinalDecision = (isCorrect: boolean) => {
    if (done) return;
    setWasCorrect(isCorrect);
    setDone(true);
    
    // Penalize if cheat was used
    const finalPoints = isCorrect ? Math.max(1, points - (cheatUsed ? 2 : 0)) : 0;
    onAnswer(isCorrect, finalPoints);
  };

  return (
    <div className="flex flex-col px-6 gap-6 pt-4 max-w-lg mx-auto min-h-[50vh]">

      {/* Header Info */}
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <p className="text-[10px] font-black uppercase opacity-40">Ebene</p>
          <p className="text-xl font-black">{shownHints} <span className="text-xs opacity-30">/ {maxHints}</span></p>
        </div>
        <div className="text-right relative">
          <p className="text-[10px] font-black uppercase opacity-40">Mögliche Punkte</p>
          <p className="text-xl font-black text-[var(--color-accent)]">
            +{points}
          </p>
          {cheatUsed && (
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

      {/* Musik-Hinweis (Triggered @ 4 or 5 OR upon manual reveal) */}
      <AnimatePresence>
        {(showMusic || isRevealed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className={`p-4 border rounded-2xl space-y-3 transition-colors ${isRevealed ? 'bg-green-500/10 border-green-500/20' : 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{isRevealed ? '🎵' : '🔊'}</span>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isRevealed ? 'text-green-500' : 'text-[var(--color-accent)]'}`}>
                  {isRevealed ? 'Offizielle Auflösung' : 'Audio-Hinweis Aktiv'}
                </p>
              </div>
              <MusicPlayer
                key={`${shownHints}-${isRevealed}`}
                youtubeLink={song.links.youtube}
                youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
                startSeconds={startSecs}
                endSeconds={(isRevealed || shownHints === 5) ? startSecs + 180 : startSecs + 30}
                blurred={!isRevealed}
              />
              {!isRevealed && (
                <p className="text-[9px] opacity-50 italic text-center">
                  {shownHints === 5 ? 'Ebene 5: Audio läuft weiter...' : 'Spielt 30 Sek. ab Anfang · Restart bei jedem Tipp'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hinweis-Liste */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {song.hints.slice(0, shownHints).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl text-sm leading-relaxed border transition-all ${i === shownHints - 1 ? 'border-[var(--color-accent)] bg-white/5' : 'border-white/5 opacity-40'}`}
            >
              <span className="font-black opacity-20 mr-3 text-xs">0{i + 1}</span>
              {censorHint(hint, song.artist, song.title)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation & Actions */}
      <div className="mt-auto space-y-4 pb-10">
        {!isRevealed && (
          <div className="grid grid-cols-1 gap-3">
            {shownHints < maxHints && (
              <button
                onClick={handleNextHint}
                className="w-full py-4 rounded-2xl border-2 border-white/10 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all outline-none"
              >
                Nächster Hinweis → {PHOMU_CONFIG.HINT_MASTER_POINTS[shownHints] ?? 1} Pkt
              </button>
            )}

            {/* Music Cheat Button (Only if music not already shown) */}
            {!showMusic && shownHints < 4 && (
              <button
                onClick={() => {
                  setShowMusic(true);
                  setCheatUsed(true);
                }}
                className="w-full py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 hover:bg-white/5 transition-all mb-1"
              >
                🕵️ Musik-Cheat: Audio jetzt (-2 Pkt)
              </button>
            )}

            <button
              onClick={() => setIsRevealed(true)}
              className="w-full py-5 rounded-3xl bg-[var(--color-accent)] font-black text-lg shadow-xl shadow-[var(--color-accent)]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              LÖSUNG ZEIGEN
            </button>
          </div>
        )}

        {isRevealed && !done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6"
          >
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 mb-2">Die Antwort war</p>
              <h3 className="text-2xl font-black">{song.title}</h3>
              <p className="text-sm opacity-60">{song.artist}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold italic opacity-60">Hast du es gewusst?</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleFinalDecision(true)}
                  className="flex-1 py-4 bg-green-500 rounded-2xl font-black text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                >
                  JA ✅
                </button>
                <button
                  onClick={() => handleFinalDecision(false)}
                  className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  NEIN ❌
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {done && (
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
              {wasCorrect ? 'Gewusst! ✨' : 'Nicht gewusst 🌧️'}
            </p>
            <p className="text-sm opacity-60">
              {song.title} &middot; {song.artist}
            </p>
            {wasCorrect && (
              <p className="text-xs font-black text-[var(--color-accent)]">+{points} Punkte</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
