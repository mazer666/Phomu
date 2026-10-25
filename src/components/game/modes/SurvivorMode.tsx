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
import { useGameStore } from '@/stores/game-store';
import { getSpicyMessage, getSpicyColor } from '@/utils/feedback-messages';
import type { PhomuSong } from '@/types/song';
import { MusicPlayer } from '../MusicPlayer';

interface SurvivorModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
}

export function SurvivorMode({ song, onAnswer }: SurvivorModeProps) {
  const { config, awardPoints, turnOrder, currentTurnIndex } = useGameStore();
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [cheatUsed, setCheatUsed] = useState(false);

  const currentPlayerId = turnOrder[currentTurnIndex];

  function handleChoice(guessedOneHit: boolean) {
    if (answered) return;
    const isCorrect = guessedOneHit === song.isOneHitWonder;
    setChoice(guessedOneHit);
    setAnswered(true);
    // Survivor: 3 Punkte Grundgewinn (Cheats wurden bereits abgezogen)
    onAnswer(isCorrect, isCorrect ? 3 : 0);
  }

  function handleCheat() {
    if (cheatUsed || answered || !currentPlayerId) return;
    setCheatUsed(true);
    // Sofortiger Abzug von 1 Punkt
    awardPoints(currentPlayerId, -1);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 gap-6">

      {/* Modus-Banner */}
      <div className="w-full max-w-sm flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">💀 Survivor</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400/60">One-Hit-Wonder?</span>
      </div>

      {/* Musik — läuft sofort, Artist bleibt verborgen */}
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
          blurred={!answered && !cheatUsed}
        />
      </div>

      {/* Song-Infos — Artist erst nach Antwort oder Cheat sichtbar */}
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
                backgroundColor: '#ef4444',
                transform: 'rotate(6deg)',
                boxShadow: '0 2px 8px rgba(239,68,68,0.6)',
              }}
            >
              -1 PKT CHEAT
            </span>
          )}
        </div>

        {!answered && !cheatUsed ? (
          <>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Artist</p>
            <h3 className="text-4xl font-black mb-1 opacity-20 select-none tracking-widest">???</h3>
            <p className="opacity-30 text-sm italic">wird nach deiner Antwort enthüllt</p>
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

          {/* Cheat: Artist früh enthüllen */}
          {!cheatUsed && !config.noCheatMode && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              onClick={handleCheat}
              className="text-[10px] font-black uppercase tracking-widest border border-white/10 py-3 rounded-xl hover:bg-white/5 transition-all min-h-[44px]"
            >
              🕵️ Cheat: Artist enthüllen (-1 Pkt)
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
              <p 
                className="font-black uppercase italic tracking-tighter text-xl mb-1"
                style={{ color: getSpicyColor(choice === song.isOneHitWonder, song.id) }}
              >
                {getSpicyMessage(choice === song.isOneHitWonder, song.id)}
              </p>
              <p className="font-bold opacity-80">
                {song.isOneHitWonder
                  ? 'Ja, ein One-Hit-Wonder!'
                  : 'Nein, ein echter Dauerstar!'}
              </p>
            </>
          ) : (
            <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              <p className="text-2xl mb-1">🕵️</p>
              <p className="text-sm font-bold uppercase tracking-tight text-red-500">Cheat benutzt</p>
              <p className="text-xs opacity-60">Infos wurden enthüllt (-1 Pkt gezahlt)</p>
            </div>
          )}
          <p className="text-sm opacity-50 mt-4 font-black uppercase tracking-[0.2em]">Wartet auf das Reveal …</p>
        </motion.div>
      )}
    </div>
  );
}
