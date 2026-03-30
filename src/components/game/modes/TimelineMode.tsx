/**
 * Timeline-Modus (Redesigned Phase 5)
 *
 * Drei Anker-Songs mit sichtbaren Jahren werden angezeigt.
 * Die neue Karte ist "blank" — man hört nur die Musik.
 * Der Spieler zieht die Karte in den passenden Slot (Drag & Drop).
 * Erst bei "Reveal" werden Cover/Name/Jahr sichtbar.
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';

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
  roundNumber?: number; 
}

export function TimelineMode({ song, onAnswer, roundNumber = 1 }: TimelineModeProps) {
  const anchors = useMemo(() => pickAnchors(song.id), [song.id]);
  const correct = useMemo(() => correctSlot(song, anchors), [song, anchors]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [canDiscard, setCanDiscard] = useState(roundNumber % 10 === 0);

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
      
      // Numbers 1-4 for slots
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleDrop(parseInt(e.key) - 1);
      }
      
      // Arrows for slots
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setSelectedSlot(prev => (prev === null || prev === 0) ? 3 : prev - 1);
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setSelectedSlot(prev => (prev === null || prev === 3) ? 0 : prev + 1);
      }

      // Enter/Space to reveal
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null) {
        handleReveal();
      }
    }

    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [selectedSlot, isRevealed]);

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-xl mx-auto min-h-[80vh] pb-40">
      
      {/* Dynamic Header / Instruction */}
      <div className="text-center space-y-4 w-full">
        <div className="flex flex-col items-center gap-2">
           <h2 className="text-2xl font-black uppercase tracking-tight">
             {!isRevealed ? "Hör genau hin!" : selectedSlot === correct ? "Goldrichtig! ✨" : "Leider daneben... 🌧️"}
           </h2>
           
           {/* New 'Now Listening' Indicator that replaces the floating card */}
           <AnimatePresence mode="wait">
             {!selectedSlot && !isRevealed && (
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.8, opacity: 0 }}
                 className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full"
               >
                 <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Suchen...</p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
        
        <p className="opacity-40 text-[9px] font-black uppercase tracking-[0.2em]">
          {!isRevealed ? "Wo passt diesen Song zeitlich am besten hin?" : "Das war die Lösung"}
        </p>
      </div>

      {/* Timeline Layout */}
      <div className="w-full relative flex flex-col mt-8">
        {/* The Vertical Line - Moved to Left for cleaner layout */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-white/5 rounded-full" />

        <div className="space-y-12">
          {[0, 1, 2, 3].map((slotIdx) => {
            const isTarget = selectedSlot === slotIdx;
            
            return (
              <div key={slotIdx} className="relative pl-16">
                {/* Slot Area */}
                <button 
                  onClick={() => handleDrop(slotIdx)}
                  className={`
                    w-full h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/50
                    ${isTarget ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-102' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}
                    ${isRevealed && slotIdx === correct ? 'border-green-500 bg-green-500/20' : ''}
                    ${isRevealed && isTarget && slotIdx !== correct ? 'border-red-500 bg-red-500/20' : ''}
                  `}
                >
                  {isTarget && (
                    <div className="text-center p-4">
                      {!isRevealed ? (
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">🎵</div>
                           <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Eingesetzt</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                           <img src={song.coverUrl || '/placeholder-cd.png'} className="w-16 h-16 rounded-lg object-cover shadow-2xl" alt="Cover" />
                           <div className="text-left">
                             <p className="text-xs font-black uppercase truncate max-w-[150px]">{song.artist}</p>
                             <p className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[150px] leading-none mb-1">{song.title}</p>
                             <p className="text-xl font-black text-white">{song.year}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!isTarget && !isRevealed && (
                    <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">Position {slotIdx + 1}</span>
                  )}
                  {isRevealed && !isTarget && slotIdx === correct && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 font-black flex items-center gap-2">
                       <span className="text-[10px]">HIER</span>
                       <span className="text-2xl">←</span>
                    </div>
                  )}
                </button>

                {/* Anchor Card - Moved to the Left on the Line */}
                {slotIdx < 3 && anchors[slotIdx] && (
                  <div className="absolute -bottom-10 left-0 -translate-x-1/2 z-20">
                    <div className="w-16 h-16 bg-[var(--color-bg-card)] border-2 border-white/10 rounded-full flex flex-col items-center justify-center shadow-2xl ring-4 ring-black/40">
                      <p className="text-sm font-black text-white leading-none">{anchors[slotIdx].year}</p>
                    </div>
                    {/* Visual Hint for the Anchor */}
                    <div className="absolute top-1/2 left-20 -translate-y-1/2 w-4 h-[1px] bg-white/20" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4 pb-4">
          {canDiscard && !isRevealed && (
            <button 
              onClick={() => onAnswer(false, 0)}
              className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all"
            >
              Abgeben
            </button>
          )}
          
          <button 
            disabled={selectedSlot === null || isRevealed}
            onClick={handleReveal}
            className={`
              col-span-full py-5 rounded-3xl font-black text-lg transition-all shadow-2xl
              ${selectedSlot !== null && !isRevealed ? 'bg-[var(--color-accent)] shadow-[0_10px_40px_-10px_rgba(var(--color-accent-rgb),0.5)] scale-105 text-white' : 'bg-white/5 opacity-20 text-white/40'}
            `}
          >
            {isRevealed ? "FERTIG" : "AUFLÖSEN"}
          </button>
        </div>
      </footer>
    </div>
  );
}
