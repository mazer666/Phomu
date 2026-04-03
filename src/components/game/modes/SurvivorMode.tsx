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
import { MusicPlayer } from '../MusicPlayer';

interface SurvivorModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
}

export function SurvivorMode({ song, onAnswer }: SurvivorModeProps) {
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [cheatUsed, setCheatUsed] = useState(false);

  function handleChoice(guessedOneHit: boolean) {
    if (answered) return;
    const isCorrect = guessedOneHit === song.isOneHitWonder;
    setChoice(guessedOneHit);
    setAnswered(true);
    // Survivor: 3 Punkte, Cheat kostet -1 Pkt
    onAnswer(isCorrect, isCorrect ? (cheatUsed ? 2 : 3) : 0);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-8">

      {/* Song-Infos — Artist erst nach Antwort sichtbar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-3 relative">
          <span className="px-3 py-1 rounded-full border border-[var(--color-accent)]/40 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
            +3 Pkt bei richtiger Antwort
          </span>
          {cheatUsed && (
            <span
              className="absolute -top-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-black shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#fb923c',
                transform: 'rotate(6deg)',
                boxShadow: '0 2px 8px rgba(251,146,60,0.6)',
              }}
            >
              +2 Pkt CHEAT
            </span>
          )}
        </div>

        {!answered && !cheatUsed ? (
          <>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Hör genau hin …</p>
            <h3 className="text-3xl font-black mb-1 opacity-20 select-none">???</h3>
            <p className="opacity-30 text-sm italic">Artist wird nach deiner Antwort enthüllt</p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Artist</p>
            <h3 className="text-3xl font-black mb-1">{song.artist}</h3>
            <p className="text-lg font-bold opacity-70 mb-1">{song.title}</p>
            {answered && (
              <p className="opacity-50 text-sm">
                {Math.floor(song.year / 10) * 10}er · {song.genre}
              </p>
            )}
          </>
        )}

        <div className="mt-4 w-full max-w-sm mx-auto transition-opacity" style={{ opacity: (answered || cheatUsed) ? 1 : 0.4 }}>
          <MusicPlayer
            youtubeLink={song.links.youtube}
            youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
            startSeconds={song.previewTimestamp?.start ?? 0}
            blurred={!answered && !cheatUsed}
          />
        </div>
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
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => handleChoice(true)}
              className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90 shadow-lg shadow-red-500/20"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              ✋ Ja
            </button>
            <button
              onClick={() => handleChoice(false)}
              className="flex-1 py-5 rounded-2xl text-lg font-black transition-colors hover:opacity-90 shadow-lg shadow-green-500/20"
              style={{ backgroundColor: 'var(--color-success)' }}
            >
              🌟 Nein
            </button>
          </motion.div>
          
          {/* Music Cheat Button */}
          {!cheatUsed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              onClick={() => setCheatUsed(true)}
              className="text-[10px] font-black uppercase tracking-widest border border-white/10 py-2 rounded-xl hover:bg-white/5 transition-all mt-4"
            >
              🕵️ Musik-Cheat: Artist enthüllen (-1 Pkt)
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {choice !== null ? (
            <>
              <p className="text-5xl mb-3">
                {choice === song.isOneHitWonder ? '✅' : '❌'}
              </p>
              <p className="font-bold">
                {song.isOneHitWonder
                  ? 'Ja, ein One-Hit-Wonder!'
                  : 'Nein, ein echter Dauerstar!'}
              </p>
            </>
          ) : (
            <div className="bg-[var(--color-accent)]/10 p-4 rounded-2xl border border-[var(--color-accent)]/20">
              <p className="text-2xl mb-1">🕵️</p>
              <p className="text-sm font-bold uppercase tracking-tight text-[var(--color-accent)]">Cheat benutzt</p>
              <p className="text-xs opacity-60">Infos wurden enthüllt (-1 Pkt)</p>
            </div>
          )}
          <p className="text-sm opacity-50 mt-4 font-black uppercase tracking-[0.2em]">Wartet auf das Reveal …</p>
        </motion.div>
      )}
    </div>
  );
}
