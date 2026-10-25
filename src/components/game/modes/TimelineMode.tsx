/**
 * Timeline-Modus — Gemeinsame wachsende Timeline
 *
 * Startet mit 3 zufälligen Jahreszahlen.
 * Richtig geraten → Jahreszahl des Songs wird hinzugefügt.
 * Ab 10 Jahreszahlen: Spieler darf eine entfernen.
 *   - Duplikat entstanden → wird automatisch entfernt
 *   - Kein Duplikat → Spieler wählt selbst
 *
 * Alle sichtbaren Texte kommen aus `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';
import { useGameStore } from '@/stores/game-store';
import { getSpicyMessage, getSpicyColor } from '@/utils/feedback-messages';
import { MusicPlayer } from '../MusicPlayer';

// ─── Jahrzehnt-Hints für den Cheat ────────────────────────────────────────────

/**
 * Hinweis-Pool je Dekade — ein Schlüssel pro Variante.
 * Die Texte liegen in `src/i18n/locales/parts/modes.{de,en}.json`.
 */
function getDecadeHintPool(decade: number, t: TFunction): string[] {
  switch (decade) {
    case 1950:
      return [
        t('modes.timeline.decadeHints.1950.first'),
        t('modes.timeline.decadeHints.1950.second'),
        t('modes.timeline.decadeHints.1950.third'),
        t('modes.timeline.decadeHints.1950.fourth'),
      ];
    case 1960:
      return [
        t('modes.timeline.decadeHints.1960.first'),
        t('modes.timeline.decadeHints.1960.second'),
        t('modes.timeline.decadeHints.1960.third'),
        t('modes.timeline.decadeHints.1960.fourth'),
      ];
    case 1970:
      return [
        t('modes.timeline.decadeHints.1970.first'),
        t('modes.timeline.decadeHints.1970.second'),
        t('modes.timeline.decadeHints.1970.third'),
        t('modes.timeline.decadeHints.1970.fourth'),
      ];
    case 1980:
      return [
        t('modes.timeline.decadeHints.1980.first'),
        t('modes.timeline.decadeHints.1980.second'),
        t('modes.timeline.decadeHints.1980.third'),
        t('modes.timeline.decadeHints.1980.fourth'),
        t('modes.timeline.decadeHints.1980.fifth'),
      ];
    case 1990:
      return [
        t('modes.timeline.decadeHints.1990.first'),
        t('modes.timeline.decadeHints.1990.second'),
        t('modes.timeline.decadeHints.1990.third'),
        t('modes.timeline.decadeHints.1990.fourth'),
        t('modes.timeline.decadeHints.1990.fifth'),
      ];
    case 2000:
      return [
        t('modes.timeline.decadeHints.2000.first'),
        t('modes.timeline.decadeHints.2000.second'),
        t('modes.timeline.decadeHints.2000.third'),
        t('modes.timeline.decadeHints.2000.fourth'),
        t('modes.timeline.decadeHints.2000.fifth'),
      ];
    case 2010:
      return [
        t('modes.timeline.decadeHints.2010.first'),
        t('modes.timeline.decadeHints.2010.second'),
        t('modes.timeline.decadeHints.2010.third'),
        t('modes.timeline.decadeHints.2010.fourth'),
        t('modes.timeline.decadeHints.2010.fifth'),
      ];
    case 2020:
      return [
        t('modes.timeline.decadeHints.2020.first'),
        t('modes.timeline.decadeHints.2020.second'),
        t('modes.timeline.decadeHints.2020.third'),
        t('modes.timeline.decadeHints.2020.fourth'),
      ];
    default:
      return [];
  }
}

function getDecadeHint(year: number, t: TFunction): string {
  const decade = Math.floor(year / 10) * 10;
  const pool = getDecadeHintPool(decade, t);
  if (pool.length === 0)
    return t('modes.timeline.decadeHints.fallback', { decade });
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
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal?: () => void;
}

type RemovalState = 'none' | 'choosing' | 'done';

export function TimelineMode({ song, onAnswer, onReveal }: TimelineModeProps) {
  const { t, i18n } = useTranslation();
  const {
    timelineYears,
    initTimeline,
    addTimelineYear,
    removeTimelineYear,
    config,
    awardPoints,
    turnOrder,
    currentTurnIndex,
  } = useGameStore();

  const currentPlayerId = turnOrder[currentTurnIndex];

  // Zahlenformate der aktiven Sprache (Jahre ohne Tausendertrennung)
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );
  const yearFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  // Einmalig initialisieren, wenn Timeline noch leer ist
  useEffect(() => {
    if (timelineYears.length === 0) {
      initTimeline(randomInitialYears(3));
    }
  }, [initTimeline, timelineYears.length]);

  const validSlotSet = useMemo(
    () => getValidSlots(song.year, timelineYears),
    [song.year, timelineYears]
  );
  const correct = useMemo(
    () => canonicalSlot(song.year, timelineYears),
    [song.year, timelineYears]
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
    const answeredInSeconds = Math.max(
      1,
      Math.round((Date.now() - questionStartedAt.current) / 1000)
    );

    // Timeline: Punkte basierend auf Komplexität (Cheats/Joker wurden bereits abgezogen)
    onAnswer(isCorrect, isCorrect ? points : 0, answeredInSeconds);

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
    song.year,
    timelineYears,
    addTimelineYear,
    removeTimelineYear,
    onAnswer,
    points,
    validSlotSet,
  ]);

  function handleRemoveYear(year: number) {
    removeTimelineYear(year);
    setRemovalState('done');
  }

  function handleCheat() {
    if (cheatActive || isRevealed || !currentPlayerId) return;
    setCheatActive(true);
    setCheatHint(getDecadeHint(song.year, t));
    // Sofortiger Abzug von 2 Punkten für den Dekaden-Hint
    awardPoints(currentPlayerId, -2);
  }

  function handleJoker() {
    if (jokerUsed || isRevealed || !currentPlayerId) return;
    // Find all wrong slots (not in validSlotSet)
    const wrongSlots: number[] = [];
    for (let i = 0; i < numSlots; i++) {
      if (!validSlotSet.has(i)) wrongSlots.push(i);
    }
    if (wrongSlots.length === 0) return;
    const pick = wrongSlots[Math.floor(Math.random() * wrongSlots.length)]!;
    setJokerSlot(pick);
    setJokerUsed(true);
    // Sofortiger Abzug von 1 Punkt für den Joker
    awardPoints(currentPlayerId, -1);
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
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null)
        handleReveal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSlot, isRevealed, numSlots, handleReveal]);

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">
      {/* Modus-Banner */}
      <div className="w-full flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
          {t('modes.timeline.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/60">
          {t('modes.timeline.stats', {
            count: timelineYears.length,
            points: numberFormat.format(points),
          })}
        </span>
      </div>

      {/* Musik Player */}
      {song.links?.youtube && (
        <MusicPlayer
          songId={song.id}
          songTitle={song.title}
          songArtist={song.artist}
          songPack={song.packs[0]}
          youtubeLink={song.links.youtube}
          youtubeAlternatives={
            song.links.youtubeAlternatives ??
            (song.links.fallbackYoutubeId
              ? [song.links.fallbackYoutubeId]
              : undefined)
          }
          spotifyLink={song.links.spotify}
          spotifyFreePreview={song.links.spotifyFreePreview}
          amazonMusicLink={song.links.amazonMusic}
          amazonPrimePreview={song.links.amazonPrimePreview}
          blurred={!isRevealed}
        />
      )}

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {!isRevealed ? (
            t('modes.timeline.question')
          ) : (
            <>
              <p
                className="text-xl font-black uppercase italic tracking-tighter mb-1"
                style={{
                  color: getSpicyColor(
                    validSlotSet.has(selectedSlot!),
                    song.id
                  ),
                }}
              >
                {getSpicyMessage(validSlotSet.has(selectedSlot!), song.id)}
              </p>
              <p className="text-sm opacity-60">
                {validSlotSet.has(selectedSlot!)
                  ? t('modes.timeline.correct')
                  : t('modes.timeline.wrong')}
              </p>
            </>
          )}
        </h2>

        {/* Cheat Button */}
        {!isRevealed && !cheatActive && !config.noCheatMode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={handleCheat}
            className="text-[10px] font-black uppercase tracking-widest border border-red-500/20 py-1.5 px-3 rounded-full hover:bg-red-500/5 text-red-500 transition-all mb-2"
          >
            {t('modes.timeline.decadeHintButton')}
          </motion.button>
        )}

        {/* Cheat Hint Bubble */}
        {!isRevealed && cheatActive && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mx-auto mt-1 mb-1 px-4 py-2 rounded-2xl text-center max-w-xs"
            style={{
              background: 'rgba(251,146,60,0.12)',
              border: '1.5px solid rgba(251,146,60,0.4)',
            }}
          >
            <p className="text-[11px] font-black italic text-orange-300 leading-snug">
              🕵️ {cheatHint}
            </p>
          </motion.div>
        )}

        {/* Joker Button */}
        {!isRevealed && !jokerUsed && numSlots > 3 && !config.noCheatMode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={handleJoker}
            className="text-[10px] font-black uppercase tracking-widest border border-orange-500/20 py-1.5 px-3 rounded-full hover:bg-orange-500/5 transition-all mb-1"
            style={{ color: '#f97316' }}
          >
            {t('modes.timeline.jokerButton')}
          </motion.button>
        )}

        {/* Joker Used Badge */}
        {!isRevealed && jokerUsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            className="mx-auto mt-1 mb-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight text-black inline-block"
            style={{
              backgroundColor: '#fbbf24',
              boxShadow: '0 2px 10px rgba(251,191,36,0.6)',
            }}
          >
            {t('modes.timeline.jokerUsed')}
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-2">
          <p className="opacity-40 text-[9px] font-black uppercase tracking-[0.2em]">
            {!isRevealed
              ? t('modes.timeline.slots', {
                  count: numSlots,
                  points: numberFormat.format(points),
                })
              : t('modes.timeline.solution')}
          </p>
          {cheatActive && (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-white shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#ef4444',
                transform: 'rotate(4deg)',
                boxShadow: '0 2px 10px rgba(239,68,68,0.7)',
                display: 'inline-block',
              }}
            >
              {t('modes.timeline.cheatBadge')}
            </span>
          )}
          {jokerUsed && (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-white shadow-lg pointer-events-none ml-2"
              style={{
                backgroundColor: '#f97316',
                transform: 'rotate(-3deg)',
                boxShadow: '0 2px 10px rgba(249,115,22,0.7)',
                display: 'inline-block',
              }}
            >
              {t('modes.timeline.jokerBadge')}
            </span>
          )}
        </div>
      </div>

      {/* Optional: Jahreszahl entfernen nach richtigem Tipp */}
      {removalState === 'choosing' && (
        <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-center opacity-60">
            {t('modes.timeline.removePrompt')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {timelineYears.map((year: number, i: number) => (
              <button
                key={`${year}-${i}`}
                onClick={() => handleRemoveYear(year)}
                className="px-4 py-2 rounded-xl border border-white/20 font-black text-sm hover:bg-red-500/20 hover:border-red-500/50 transition-all active:scale-95"
              >
                {yearFormat.format(year)}
              </button>
            ))}
          </div>
        </div>
      )}

      {removalState === 'done' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-green-400">
            {t('modes.timeline.removed')}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="w-full flex flex-col">
        {Array.from({ length: numSlots }, (_, slotIdx) => {
          const isTarget = selectedSlot === slotIdx;
          const yearAfter = timelineYears[slotIdx];
          const isAnswerCorrect =
            selectedSlot !== null && validSlotSet.has(selectedSlot);
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
                    style={{
                      borderColor: '#fbbf24',
                      background: 'rgba(251,191,36,0.05)',
                    }}
                  >
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: '#fbbf24' }}
                    >
                      {t('modes.timeline.jokerSlot')}
                    </span>
                  </div>
                </div>
                {yearAfter !== undefined && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 shrink-0 flex justify-center py-0.5">
                      <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                        <p className="text-[11px] font-black text-white leading-none">
                          {yearFormat.format(yearAfter)}
                        </p>
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
                    isRevealed &&
                    !isTarget &&
                    slotIdx === correct &&
                    !isAnswerCorrect
                      ? 'border-green-500/50 bg-green-500/5'
                      : '',
                    isRevealed &&
                    !isTarget &&
                    !(slotIdx === correct && !isAnswerCorrect)
                      ? 'border-white/5 bg-transparent'
                      : '',
                  ].join(' ')}
                >
                  {isTarget && !isRevealed && (
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">🎵</span>
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        {t('modes.timeline.placed')}
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
                        <p className="text-lg font-black">
                          {yearFormat.format(song.year)}
                        </p>
                      </div>
                    </div>
                  )}
                  {!isTarget && !isRevealed && (
                    <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">
                      {numberFormat.format(slotIdx + 1)}
                    </span>
                  )}
                  {isRevealed &&
                    !isTarget &&
                    slotIdx === correct &&
                    !isAnswerCorrect && (
                      <div className="flex items-center gap-2 text-green-400 font-black px-3">
                        <span>←</span>
                        <span className="text-[10px] uppercase tracking-widest">
                          {t('modes.timeline.here')}
                        </span>
                      </div>
                    )}
                </button>
              </div>

              {/* Jahreszahl zwischen Slots */}
              {yearAfter !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-12 shrink-0 flex justify-center py-0.5">
                    <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                      <p className="text-[11px] font-black text-white leading-none">
                        {yearFormat.format(yearAfter)}
                      </p>
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
            {isRevealed ? t('modes.continue') : t('modes.timeline.reveal')}
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
