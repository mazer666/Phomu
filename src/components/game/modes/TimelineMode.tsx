/**
 * Timeline-Modus — Gemeinsame wachsende Timeline
 *
 * Startet mit 3 zufälligen Jahreszahlen.
 * Richtig geraten → Jahreszahl des Songs wird hinzugefügt.
 * Ab 10 Jahreszahlen: Spieler darf eine entfernen.
 *   - Duplikat entstanden → wird automatisch entfernt
 *   - Kein Duplikat → Spieler wählt selbst
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';
import { useGameStore } from '@/stores/game-store';
import { MusicPlayer } from '../MusicPlayer';

function randomInitialYears(count: number): number[] {
  const all = [...new Set(getAllSongs().map((s) => s.year))];
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).sort((a, b) => a - b);
}

/**
 * Gibt alle akzeptierten Slot-Indizes zurück.
 * Wenn das Jahr bereits in der Timeline vorkommt, gelten beide Slots
 * um das Duplikat (davor und danach) als korrekt.
 */
function getValidSlots(songYear: number, sortedYears: number[]): Set<number> {
  const slots = new Set<number>();

  // Kanonischer Slot: erster Slot, wo songYear < sortedYears[i]
  let canonical = sortedYears.length;
  for (let i = 0; i < sortedYears.length; i++) {
    if (songYear < sortedYears[i]) {
      canonical = i;
      break;
    }
  }
  slots.add(canonical);

  // Für alle exakt gleichen Jahre: Slot davor und danach ebenfalls akzeptieren
  for (let i = 0; i < sortedYears.length; i++) {
    if (sortedYears[i] === songYear) {
      slots.add(i);
      slots.add(i + 1);
    }
  }

  return slots;
}

/** Kanonischer Slot für die Anzeige (grüner Hinweis bei falscher Antwort) */
function canonicalSlot(songYear: number, sortedYears: number[]): number {
  for (let i = 0; i < sortedYears.length; i++) {
    if (songYear < sortedYears[i]) return i;
  }
  return sortedYears.length;
}

interface TimelineModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
  onReveal?: () => void;
}

type RemovalState = 'none' | 'choosing' | 'done';

export function TimelineMode({ song, onAnswer, onReveal }: TimelineModeProps) {
  const { timelineYears, initTimeline, addTimelineYear, removeTimelineYear } = useGameStore();

  // Einmalig initialisieren, wenn Timeline noch leer ist
  useEffect(() => {
    if (timelineYears.length === 0) {
      initTimeline(randomInitialYears(3));
    }
  }, []);

  const validSlotSet = useMemo(
    () => getValidSlots(song.year, timelineYears),
    [song.year, timelineYears],
  );
  const correct = useMemo(
    () => canonicalSlot(song.year, timelineYears),
    [song.year, timelineYears],
  );

  const points = timelineYears.length + 1; // mehr Jahre = mehr Punkte

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [removalState, setRemovalState] = useState<RemovalState>('none');

  const numSlots = timelineYears.length + 1;

  // Nach korrekter Antwort: Jahr hinzufügen + ggf. Entfernungs-Logik
  function handleReveal() {
    if (selectedSlot === null || isRevealed) return;
    const isCorrect = validSlotSet.has(selectedSlot);
    setIsRevealed(true);
    onAnswer(isCorrect, isCorrect ? points : 0);

    if (!isCorrect) return;

    const newYear = song.year;
    const isDuplicate = timelineYears.includes(newYear);

    addTimelineYear(newYear);

    if (isDuplicate) {
      // Duplikat → direkt entfernen, kein Eingriff nötig
      removeTimelineYear(newYear);
    } else {
      // Spieler darf optional eine Jahreszahl entfernen
      setRemovalState('choosing');
    }
  }

  function handleRemoveYear(year: number) {
    removeTimelineYear(year);
    setRemovalState('done');
  }

  const canProceed = isRevealed;

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isRevealed) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && n <= numSlots) setSelectedSlot(n - 1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
        setSelectedSlot((p) => (p === null || p === 0 ? numSlots - 1 : p - 1));
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight')
        setSelectedSlot((p) => (p === null || p === numSlots - 1 ? 0 : p + 1));
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null) handleReveal();
    }
    window.addEventListener('keydown', onKey as any);
    return () => window.removeEventListener('keydown', onKey as any);
  }, [selectedSlot, isRevealed, numSlots]);

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">

      {/* Musik Player */}
      {song.links?.youtube && (
        <MusicPlayer youtubeLink={song.links.youtube} blurred={!isRevealed} />
      )}

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {!isRevealed
            ? 'Wann war dieser Song?'
            : selectedSlot !== null && validSlotSet.has(selectedSlot)
              ? 'Goldrichtig! ✨'
              : 'Leider daneben... 🌧️'}
        </h2>
        <p className="opacity-40 text-[9px] font-black uppercase tracking-[0.2em]">
          {!isRevealed
            ? `${numSlots} Positionen · ${points} Punkte`
            : 'Das war die Lösung'}
        </p>
      </div>

      {/* Optional: Jahreszahl entfernen nach richtigem Tipp */}
      {removalState === 'choosing' && (
        <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-center opacity-60">
            Eine Jahreszahl entfernen? (Optional)
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {timelineYears.map((year: number, i: number) => (
              <button
                key={`${year}-${i}`}
                onClick={() => handleRemoveYear(year)}
                className="px-4 py-2 rounded-xl border border-white/20 font-black text-sm hover:bg-red-500/20 hover:border-red-500/50 transition-all active:scale-95"
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {removalState === 'done' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-green-400">
            Jahreszahl entfernt ✓
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="w-full flex flex-col">
        {Array.from({ length: numSlots }, (_, slotIdx) => {
          const isTarget = selectedSlot === slotIdx;
          const yearAfter = timelineYears[slotIdx];

          return (
            <div key={slotIdx} className="flex flex-col">
              {/* Slot-Zeile */}
              <div className="flex items-center gap-3">
                <div className="w-12 shrink-0 flex flex-col items-center">
                  <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
                  <div className="w-2 h-2 rounded-full bg-white/20 my-0.5 shrink-0" />
                  <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
                </div>

                <button
                  onClick={() => handleDrop(slotIdx)}
                  disabled={isRevealed}
                  className={[
                    'flex-1 rounded-xl border-2 border-dashed flex items-center justify-center transition-all focus:outline-none',
                    numSlots <= 5 ? 'h-20' : numSlots <= 7 ? 'h-16' : 'h-12',
                    isTarget && !isRevealed
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : '',
                    !isTarget && !isRevealed
                      ? 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      : '',
                    isRevealed && validSlotSet.has(slotIdx) && (isTarget || slotIdx === correct)
                      ? 'border-green-500 bg-green-500/10'
                      : '',
                    isRevealed && isTarget && !validSlotSet.has(slotIdx)
                      ? 'border-red-500 bg-red-500/10'
                      : '',
                    isRevealed && !isTarget && !validSlotSet.has(slotIdx)
                      ? 'border-white/5 bg-transparent'
                      : '',
                  ].join(' ')}
                >
                  {isTarget && !isRevealed && (
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">🎵</span>
                      <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Eingesetzt
                      </p>
                    </div>
                  )}
                  {isTarget && isRevealed && (
                    <div className="flex items-center gap-3 px-3 text-left">
                      <div>
                        <p className="text-xs font-black uppercase truncate max-w-[160px]">
                          {song.artist}
                        </p>
                        <p className="text-[9px] opacity-40 uppercase truncate max-w-[160px] leading-none mb-0.5">
                          {song.title}
                        </p>
                        <p className="text-lg font-black">{song.year}</p>
                      </div>
                    </div>
                  )}
                  {!isTarget && !isRevealed && (
                    <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">
                      {slotIdx + 1}
                    </span>
                  )}
                  {isRevealed && !isTarget && validSlotSet.has(slotIdx) && slotIdx === correct && (
                    <div className="flex items-center gap-2 text-green-400 font-black px-3">
                      <span>←</span>
                      <span className="text-[10px] uppercase tracking-widest">Hier</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Jahreszahl zwischen Slots */}
              {yearAfter !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-12 shrink-0 flex justify-center py-0.5">
                    <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                      <p className="text-[11px] font-black text-white leading-none">{yearAfter}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-8 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
        <div className="max-w-md mx-auto">
          <button
            disabled={selectedSlot === null}
            onClick={canProceed ? onReveal : handleReveal}
            className={[
              'w-full py-5 rounded-3xl font-black text-lg transition-all shadow-2xl',
              selectedSlot !== null
                ? 'bg-[var(--color-accent)] text-white scale-[1.02] shadow-[0_10px_40px_-10px_rgba(var(--color-accent-rgb),0.5)]'
                : 'bg-white/5 opacity-20 text-white/40 cursor-not-allowed',
            ].join(' ')}
          >
            {isRevealed ? 'WEITER →' : 'AUFLÖSEN'}
          </button>
        </div>
      </footer>
    </div>
  );

  function handleDrop(slotIndex: number) {
    if (isRevealed) return;
    setSelectedSlot(slotIndex);
  }
}
