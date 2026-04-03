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

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';
import { useGameStore } from '@/stores/game-store';
import { MusicPlayer } from '../MusicPlayer';

// ─── Jahrzehnt-Hints für den Cheat ────────────────────────────────────────────

function getDecadeHint(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  const hints: Record<number, string[]> = {
    1950: [
      'Rock\'n\'Roll, Petticoats und Jukebox-Vibes.',
      'Als Grease noch Realität war.',
      'Vor dem Beatlemania. Klar vor dem Beatlemania.',
      'Die Fünfziger rufen. Haartolle inklusive.',
    ],
    1960: [
      'Flower Power, Mondlandung oder beides.',
      'Irgendwas mit langen Haaren und Aufbruch.',
      'Die 60er. Wahrscheinlich mit Gitarre.',
      'British Invasion? Oder Summer of Love? Oder beides.',
    ],
    1970: [
      'Disco, Glam oder Punk — die 70er hatten alles.',
      'Schlaghosen-Ära. Keine Fragen.',
      'Boogie Wonderland ruft — irgendwo in den 70ern.',
      'Saturday Night Fever ist auch irgendwo in dieser Dekade.',
    ],
    1980: [
      'Synthesizer, Schulterpolster, Schnurrbart.',
      'Irgendwas mit Neonlicht und New Wave.',
      'Die Achtziger. Definitiv die Achtziger.',
      'Wenn du Cassettenspieler kannst, weißt du wo das hingehört.',
      'MTV hat gerade erst erfunden was Musikvideo bedeutet.',
    ],
    1990: [
      'Grunge ODER Eurodance ODER beides gleichzeitig.',
      'Irgendwo zwischen Kurt Cobain und den Backstreet Boys.',
      'Die Neunziger. Schnauzbart optional.',
      'CD-Player, Discman, total analog aufgewachsen.',
      'Britpop oder Techno? Genau — die 90er.',
    ],
    2000: [
      'Nuller-Jahre. Tiefgeschnittene Jeans und Motorola Razr.',
      'Als MySpace noch cool war.',
      'Irgendwo in den 2000ern. iPod-Ära.',
      'Pop-Punk oder R&B — auf jeden Fall Anfang des Jahrtausends.',
      'Vor Spotify. Als Limewire noch das Ding war.',
    ],
    2010: [
      'Zehnerjahre. EDM-Drop incoming.',
      'Irgendwas mit Snapchat und Festival-Armbändern.',
      'Die Zehner — zwischen Dubstep und Streaming-Boom.',
      'Als alle plötzlich Bärte hatten.',
      'Post-Gangnam Style Ära. Irgendwo in den 2010s.',
    ],
    2020: [
      'Pandemie-Ära oder danach. Sehr frisch.',
      'Neulich. Richtig neulich.',
      'TikTok-Zeitalter — das ist aktuell.',
      'Streaming only. Definitiv nach 2019.',
    ],
  };
  const pool = hints[decade] ?? [`Irgendwann in den ${decade}ern.`];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

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
  onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void;
  onReveal?: () => void;
}

type RemovalState = 'none' | 'choosing' | 'done';

export function TimelineMode({ song, onAnswer, onReveal }: TimelineModeProps) {
  const { timelineYears, initTimeline, addTimelineYear, removeTimelineYear, config, awardPoints, turnOrder, currentTurnIndex } = useGameStore();

  // Einmalig initialisieren, wenn Timeline noch leer ist
  useEffect(() => {
    if (timelineYears.length === 0) {
      initTimeline(randomInitialYears(3));
    }
  }, [initTimeline, timelineYears.length]);

  const validSlotSet = useMemo(
    () => getValidSlots(song.year, timelineYears),
    [song.year, timelineYears],
  );
  const correct = useMemo(
    () => canonicalSlot(song.year, timelineYears),
    [song.year, timelineYears],
  );

  const points = Math.min(timelineYears.length + 1, config.timelineMaxPoints); // mehr Jahre = mehr Punkte, aber gecappt


  const questionStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [song.id]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [removalState, setRemovalState] = useState<RemovalState>('none');
  const [cheatActive, setCheatActive] = useState(false);
  const [cheatHint, setCheatHint] = useState<string>('');
  const [jokerUsed, setJokerUsed] = useState(false);
  const [jokerSlot, setJokerSlot] = useState<number | null>(null);

  const numSlots = timelineYears.length + 1;

  // Nach korrekter Antwort: Jahr hinzufügen + ggf. Entfernungs-Logik
  const handleReveal = useCallback(() => {
    if (selectedSlot === null || isRevealed) return;
    const isCorrect = validSlotSet.has(selectedSlot);
    setIsRevealed(true);
    const answeredInSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    
    // Penalize if cheat was used
    const finalPoints = isCorrect ? Math.max(1, points - (cheatActive ? 2 : 0)) : 0;
    onAnswer(isCorrect, finalPoints, answeredInSeconds);

    if (!isCorrect) return;

    const newYear = song.year;
    const isDuplicate = timelineYears.includes(newYear);

    addTimelineYear(newYear);

    if (isDuplicate) {
      // Duplikat → direkt entfernen, kein Eingriff nötig
      removeTimelineYear(newYear);
    } else if (timelineYears.length + 1 > 10) {
      // Mehr als 10 Jahreszahlen → Spieler darf optional eine entfernen
      setRemovalState('choosing');
    }
  }, [
    selectedSlot, 
    isRevealed, 
    validSlotSet, 
    onAnswer, 
    points, 
    cheatActive, 
    song.year, 
    timelineYears, 
    addTimelineYear, 
    removeTimelineYear
  ]);

  function handleRemoveYear(year: number) {
    removeTimelineYear(year);
    setRemovalState('done');
  }

  function handleJoker() {
    if (jokerUsed || isRevealed) return;
    // Find all wrong slots (not in validSlotSet)
    const wrongSlots: number[] = [];
    for (let i = 0; i < numSlots; i++) {
      if (!validSlotSet.has(i)) wrongSlots.push(i);
    }
    if (wrongSlots.length === 0) return;
    const pick = wrongSlots[Math.floor(Math.random() * wrongSlots.length)]!;
    setJokerSlot(pick);
    setJokerUsed(true);
    // Deduct 1 point from current player's accumulated score
    const pilotId = turnOrder[currentTurnIndex];
    if (pilotId) awardPoints(pilotId, -1);
    // Clear selection if the joker removed the selected slot
    if (selectedSlot === pick) setSelectedSlot(null);
  }

  const canProceed = isRevealed;

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isRevealed) return;
      const n = parseInt(e.key);
      if (!isNaN(n) && n >= 1 && n <= numSlots) setSelectedSlot(n - 1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
        setSelectedSlot((p) => (p === null || p === 0 ? numSlots - 1 : p - 1));
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight')
        setSelectedSlot((p) => (p === null || p === numSlots - 1 ? 0 : p + 1));
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null) handleReveal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSlot, isRevealed, numSlots, handleReveal]);

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">

      {/* Musik Player */}
      {song.links?.youtube && (
        <MusicPlayer
          youtubeLink={song.links.youtube}
          youtubeAlternatives={song.links.youtubeAlternatives ?? (song.links.fallbackYoutubeId ? [song.links.fallbackYoutubeId] : undefined)}
          blurred={!isRevealed}
        />
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
        
        {/* Cheat Button */}
        {!isRevealed && !cheatActive && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={() => { setCheatActive(true); setCheatHint(getDecadeHint(song.year)); }}
            className="text-[10px] font-black uppercase tracking-widest border border-white/10 py-1.5 px-3 rounded-full hover:bg-white/5 transition-all mb-2"
          >
            🕵️ Jahrzehnt-Hint (-2 Pkt)
          </motion.button>
        )}

        {/* Cheat Hint Bubble */}
        {!isRevealed && cheatActive && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mx-auto mt-1 mb-1 px-4 py-2 rounded-2xl text-center max-w-xs"
            style={{ background: 'rgba(251,146,60,0.12)', border: '1.5px solid rgba(251,146,60,0.4)' }}
          >
            <p className="text-[11px] font-black italic text-orange-300 leading-snug">
              🕵️ {cheatHint}
            </p>
          </motion.div>
        )}

        {/* Joker Button */}
        {!isRevealed && !jokerUsed && numSlots > 3 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={handleJoker}
            className="text-[10px] font-black uppercase tracking-widest border border-yellow-500/20 py-1.5 px-3 rounded-full hover:bg-yellow-500/5 transition-all mb-1"
            style={{ color: '#fbbf24' }}
          >
            🃏 Joker: Falschen Slot entfernen (-1 Pkt)
          </motion.button>
        )}

        {/* Joker Used Badge */}
        {!isRevealed && jokerUsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            className="mx-auto mt-1 mb-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight text-black inline-block"
            style={{ backgroundColor: '#fbbf24', boxShadow: '0 2px 10px rgba(251,191,36,0.6)' }}
          >
            🃏 Joker eingesetzt — 1 Slot weg
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-2">
          <p className="opacity-40 text-[9px] font-black uppercase tracking-[0.2em]">
            {!isRevealed
              ? `${numSlots} Positionen · ${points} Punkte`
              : 'Das war die Lösung'}
          </p>
          {!isRevealed && cheatActive && (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-black shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#fb923c',
                transform: 'rotate(4deg)',
                boxShadow: '0 2px 10px rgba(251,146,60,0.7)',
                display: 'inline-block',
              }}
            >
              {Math.max(1, points - 2)} Pkt CHEAT
            </span>
          )}
        </div>
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
          const isAnswerCorrect = selectedSlot !== null && validSlotSet.has(selectedSlot);
          const isJokerSlot = jokerSlot === slotIdx && !isRevealed;

          // Joker slot: render as a visually removed / crossed-out slot, non-interactive
          if (isJokerSlot) {
            return (
              <div key={slotIdx} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-12 shrink-0 flex flex-col items-center">
                    <div className="w-0.5 flex-1 bg-white/5 min-h-[8px]" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/20 my-0.5 shrink-0" />
                    <div className="w-0.5 flex-1 bg-white/5 min-h-[8px]" />
                  </div>
                  <div
                    className={`flex-1 rounded-xl border-2 border-dashed flex items-center justify-center opacity-30 ${
                      numSlots <= 5 ? 'h-20' : numSlots <= 7 ? 'h-16' : 'h-12'
                    }`}
                    style={{ borderColor: '#fbbf24', background: 'rgba(251,191,36,0.05)' }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#fbbf24' }}>
                      🃏 Joker
                    </span>
                  </div>
                </div>
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
          }

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
                    // Correct: green only where user placed
                    isRevealed && isTarget && isAnswerCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : '',
                    // Wrong: red where user placed, dim green hint on canonical slot
                    isRevealed && isTarget && !isAnswerCorrect
                      ? 'border-red-500 bg-red-500/10'
                      : '',
                    isRevealed && !isTarget && slotIdx === correct && !isAnswerCorrect
                      ? 'border-green-500/50 bg-green-500/5'
                      : '',
                    isRevealed && !isTarget && !(slotIdx === correct && !isAnswerCorrect)
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
                  {isRevealed && !isTarget && slotIdx === correct && !isAnswerCorrect && (
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
