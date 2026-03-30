/**
 * Timeline-Modus
 *
 * Drei Anker-Songs mit sichtbaren Jahren werden angezeigt.
 * Die neue Karte ist "blank" — man hört nur die Musik.
 * Der Spieler wählt den passenden Slot. Erst bei "Auflösen" wird das Jahr sichtbar.
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';
import { MusicPlayer } from '../MusicPlayer';

const TIMELINE_POINTS = 5;

function pickAnchors(currentSongId: string): PhomuSong[] {
  const pool = getAllSongs().filter((s) => s.id !== currentSongId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).sort((a, b) => a.year - b.year);
}

function correctSlot(song: PhomuSong, anchors: PhomuSong[]): number {
  if (song.year < (anchors[0]?.year ?? Infinity)) return 0;
  if (song.year <= (anchors[1]?.year ?? Infinity)) return 1;
  if (song.year <= (anchors[2]?.year ?? Infinity)) return 2;
  return 3;
}

interface TimelineModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
  onReveal?: () => void;
  roundNumber?: number;
}

export function TimelineMode({ song, onAnswer, onReveal, roundNumber = 1 }: TimelineModeProps) {
  const anchors = useMemo(() => pickAnchors(song.id), [song.id]);
  const correct = useMemo(() => correctSlot(song, anchors), [song, anchors]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const canDiscard = roundNumber % 10 === 0;

  function handleDrop(slotIndex: number) {
    if (isRevealed) return;
    setSelectedSlot(slotIndex);
  }

  function handleReveal() {
    if (selectedSlot === null || isRevealed) return;
    const isCorrect = selectedSlot === correct;
    setIsRevealed(true);
    onAnswer(isCorrect, isCorrect ? TIMELINE_POINTS : 0);
  }

  // Keyboard Navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isRevealed) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleDrop(parseInt(e.key) - 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setSelectedSlot(prev => (prev === null || prev === 0) ? 3 : prev - 1);
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setSelectedSlot(prev => (prev === null || prev === 3) ? 0 : prev + 1);
      }
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null) {
        handleReveal();
      }
    }
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [selectedSlot, isRevealed]);

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto min-h-[80vh] pb-40">

      {/* Musik Player — Video geblendet bis Enthüllen */}
      {song.links?.youtube && (
        <MusicPlayer youtubeLink={song.links.youtube} blurred={!isRevealed} />
      )}

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {!isRevealed ? 'Hör genau hin!' : selectedSlot === correct ? 'Goldrichtig! ✨' : 'Leider daneben... 🌧️'}
        </h2>
        <p className="opacity-40 text-[9px] font-black uppercase tracking-[0.2em]">
          {!isRevealed ? 'Wo passt dieser Song zeitlich hin?' : 'Das war die Lösung'}
        </p>
      </div>

      {/* Timeline — Flexbox-Zeilen, kein absolute für Kreise */}
      <div className="w-full flex flex-col">

        {[0, 1, 2, 3].map((slotIdx) => {
          const isTarget = selectedSlot === slotIdx;
          const anchor = anchors[slotIdx]; // undefined for slotIdx === 3

          return (
            <div key={slotIdx} className="flex flex-col">

              {/* Slot-Zeile: Kreis-Spalte + Button */}
              <div className="flex items-center gap-3">

                {/* Linke Zeitspalte (immer gleich breit) */}
                <div className="w-14 shrink-0 flex flex-col items-center">
                  <div className="w-1 flex-1 bg-white/10 min-h-[12px]" />
                  <div className="w-2 h-2 rounded-full bg-white/20 my-1 shrink-0" />
                  <div className="w-1 flex-1 bg-white/10 min-h-[12px]" />
                </div>

                {/* Slot Button */}
                <button
                  onClick={() => handleDrop(slotIdx)}
                  className={`
                    flex-1 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50
                    ${isTarget && !isRevealed ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : ''}
                    ${!isTarget && !isRevealed ? 'border-white/10 bg-white/[0.02] hover:border-white/20' : ''}
                    ${isRevealed && slotIdx === correct ? 'border-green-500 bg-green-500/10' : ''}
                    ${isRevealed && isTarget && slotIdx !== correct ? 'border-red-500 bg-red-500/10' : ''}
                    ${isRevealed && !isTarget && slotIdx !== correct ? 'border-white/5 bg-transparent' : ''}
                  `}
                >
                  {isTarget && !isRevealed && (
                    <div className="flex items-center gap-2 px-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">🎵</div>
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Eingesetzt</p>
                    </div>
                  )}
                  {isTarget && isRevealed && (
                    <div className="flex items-center gap-3 px-3">
                      <div className="text-left">
                        <p className="text-xs font-black uppercase truncate max-w-[160px]">{song.artist}</p>
                        <p className="text-[9px] opacity-40 uppercase truncate max-w-[160px] leading-none mb-1">{song.title}</p>
                        <p className="text-lg font-black">{song.year}</p>
                      </div>
                    </div>
                  )}
                  {!isTarget && !isRevealed && (
                    <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">Position {slotIdx + 1}</span>
                  )}
                  {isRevealed && !isTarget && slotIdx === correct && (
                    <div className="flex items-center gap-2 text-green-400 font-black">
                      <span className="text-lg">←</span>
                      <span className="text-[10px] uppercase tracking-widest">Hier wär's richtig</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Jahreszahl unter dem Slot (zwischen Slot und nächstem Slot) */}
              {anchor && (
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 flex justify-center py-1">
                    <div className="px-3 py-1 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-lg">
                      <p className="text-xs font-black text-white leading-none">{anchor.year}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-[1px] bg-white/5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-8 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          {canDiscard && !isRevealed && (
            <button
              onClick={() => onAnswer(false, 0)}
              className="py-3 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all"
            >
              Abgeben
            </button>
          )}

          <button
            disabled={selectedSlot === null}
            onClick={isRevealed ? onReveal : handleReveal}
            className={`
              w-full py-5 rounded-3xl font-black text-lg transition-all shadow-2xl
              ${selectedSlot !== null
                ? 'bg-[var(--color-accent)] text-white scale-[1.02] shadow-[0_10px_40px_-10px_rgba(var(--color-accent-rgb),0.5)]'
                : 'bg-white/5 opacity-20 text-white/40 cursor-not-allowed'}
            `}
          >
            {isRevealed ? 'WEITER →' : 'AUFLÖSEN'}
          </button>
        </div>
      </footer>
    </div>
  );
}
