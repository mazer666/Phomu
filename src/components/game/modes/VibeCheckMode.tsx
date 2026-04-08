/**
 * Vibe-Check-Modus
 *
 * Der Artist und die Dekade sind sichtbar — Spieler wählen eine Stimmung aus.
 * Punkte gibt es, wenn mindestens eine gewählte Stimmung in song.mood steht.
 * Alle 6 Stimmungs-Optionen werden angezeigt, damit kein Hinweis durch
 * eine reduzierte Liste entsteht.
 *
 * Cheat: Optionen halbieren (6 → 3), aber max. +1 Pkt statt +2 Pkt.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { getSpicyMessage, getSpicyColor } from '@/utils/feedback-messages';
import type { PhomuSong } from '@/types/song';
import { MusicPlayer } from '../MusicPlayer';

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
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
}

export function VibeCheckMode({ song, onAnswer }: VibeCheckModeProps) {
  const { config } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [cheatUsed, setCheatUsed] = useState(false);

  function handleCheat() {
    if (cheatUsed || answered) return;
    setCheatUsed(true);
  }

  function handleSelect(mood: string) {
    if (answered) return;
    const isCorrect = song.mood.includes(mood);
    setSelected(mood);
    setAnswered(true);
    const points = isCorrect ? (cheatUsed ? 1 : 2) : 0;
    onAnswer(isCorrect, points);
  }

  // Vorab zwei Optionslisten berechnen — stabil für diesen Song
  const { fullOptions, halfOptions } = useMemo(() => {
    const correctMood = song.mood[0];
    const wrong = ALL_MOODS.filter((m) => !song.mood.includes(m));
    const shuffledWrong = [...wrong].sort(() => Math.random() - 0.5);
    const full = [...shuffledWrong.slice(0, 5), correctMood].sort(() => Math.random() - 0.5);
    const half = [...shuffledWrong.slice(0, 2), correctMood].sort(() => Math.random() - 0.5);
    return { fullOptions: full, halfOptions: half };
  // song.id ist stabil solange derselbe Song angezeigt wird
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);

  const options = cheatUsed ? halfOptions : fullOptions;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-6">

      {/* Modus-Banner */}
      <div className="w-full max-w-sm flex items-center justify-between bg-teal-500/10 border border-teal-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">😎 Vibe Check</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400/60">Welche Stimmung?</span>
      </div>

      {/* Musik — läuft sofort, unverdeckt */}
      {!answered && (
        <div className="w-full max-w-sm mx-auto">
          <MusicPlayer
            songId={song.id}
            songTitle={song.title}
            songArtist={song.artist}
            songPack={song.packs[0]}
            youtubeLink={song.links.youtube}
            youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
            spotifyLink={song.links.spotify}
            spotifyFreePreview={song.links.spotifyFreePreview}
            amazonMusicLink={song.links.amazonMusic}
            amazonPrimePreview={song.links.amazonPrimePreview}
            startSeconds={song.previewTimestamp?.start ?? 0}
            blurred={false}
          />
        </div>
      )}

      {/* Artist-Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-3">
          <span className="px-3 py-1 rounded-full border border-[var(--color-accent)]/40 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
            {cheatUsed ? '+1 Pkt bei richtiger Stimmung' : '+2 Pkt bei richtiger Stimmung'}
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Song Info</p>
        <h3 className="text-3xl font-black mb-1">{song.artist}</h3>
        <p className="text-xl font-bold opacity-80">{song.title}</p>
        <p className="opacity-50 text-sm mt-1">{Math.floor(song.year / 10) * 10}er</p>
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

      {/* Cheat-Button */}
      <AnimatePresence>
        {!answered && !config.noCheatMode && (
          cheatUsed ? (
            <motion.div
              key="cheat-active"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500/70"
            >
              ✂️ Optionen halbiert — max. +1 Pkt
            </motion.div>
          ) : (
            <motion.button
              key="cheat-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              whileHover={{ opacity: 1 }}
              onClick={handleCheat}
              className="w-full max-w-sm py-2 rounded-xl border border-yellow-500/20 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500 hover:bg-yellow-500/5 transition-all"
            >
              ✂️ Cheat: Optionen halbieren (nur +1 Pkt)
            </motion.button>
          )
        )}
      </AnimatePresence>

      {/* Stimmungs-Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`grid gap-2 w-full max-w-sm ${cheatUsed ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}
      >
        {options.map((mood) => {
          const isSelected = selected === mood;
          const isCorrectMood = song.mood.includes(mood);

          let bgColor = 'rgba(255,255,255,0.03)';
          let borderColor = 'rgba(255,255,255,0.1)';
          let textColor = 'rgba(255,255,255,0.6)';
          let scale = 1;
          let shadow = 'none';

          if (answered) {
            if (isCorrectMood) {
              bgColor = 'rgba(34,197,94,0.2)';
              borderColor = '#22c55e';
              textColor = '#fff';
              scale = isSelected ? 1.05 : 1;
              shadow = '0 0 20px rgba(34,197,94,0.3)';
            } else if (isSelected) {
              bgColor = 'rgba(239,68,68,0.2)';
              borderColor = '#ef4444';
              textColor = '#fff';
              scale = 0.95;
            } else {
              // Verblasst andere
            }
          }

          return (
            <motion.button
              key={mood}
              onClick={() => handleSelect(mood)}
              disabled={answered}
              animate={{ scale, opacity: (answered && !isCorrectMood && !isSelected) ? 0.3 : 1 }}
              className="py-4 px-2 rounded-2xl border text-sm font-black transition-colors disabled:cursor-default"
              style={{
                backgroundColor: bgColor,
                borderColor,
                color: textColor,
                boxShadow: shadow
              }}
            >
              {mood}
            </motion.button>
          );
        })}
      </motion.div>

      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Main Reveal Card */}
          <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-green-500/20 to-blue-500/10 border-2 border-green-500/30 text-center shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 bg-white rounded-bl-3xl">✨</div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-green-400 mb-4 drop-shadow-md">
              Die Stimmung des Songs ist
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {song.mood.map((m, i) => (
                <motion.span
                  key={m}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-2xl shadow-[0_10px_30px_rgba(34,197,94,0.4)] border-b-4 border-black/20"
                >
                  {m}
                </motion.span>
              ))}
            </div>

            <p
              className="mt-6 text-xl font-black uppercase italic tracking-tighter"
              style={{ color: getSpicyColor(song.mood.includes(selected ?? ''), song.id) }}
            >
              {getSpicyMessage(song.mood.includes(selected ?? ''), song.id)}
            </p>

            <p className="mt-2 text-sm font-bold opacity-60">
              {song.mood.includes(selected ?? '')
                ? '😎 Volltreffer! Dein Vibe-Check war spot-on.'
                : '🌑 Fast... Dein Gefühl war ein anderes.'}
            </p>
          </div>

          {/* Music Integration */}
          <div className="p-1.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] border border-white/10 shadow-inner">
            <MusicPlayer
              songId={song.id}
              songTitle={song.title}
              songArtist={song.artist}
              songPack={song.packs[0]}
              youtubeLink={song.links.youtube}
              youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
              spotifyLink={song.links.spotify}
              spotifyFreePreview={song.links.spotifyFreePreview}
              amazonMusicLink={song.links.amazonMusic}
              amazonPrimePreview={song.links.amazonPrimePreview}
              startSeconds={song.previewTimestamp?.start ?? 0}
              endSeconds={(song.previewTimestamp?.start ?? 0) + 120}
              blurred={false}
            />
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
              {song.title} &middot; {song.artist} ({song.year})
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
