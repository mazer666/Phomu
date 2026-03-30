/**
 * Timeline-Modus
 *
 * Drei Anker-Songs mit sichtbaren Jahren werden angezeigt.
 * Die neue Karte zeigt nur Artist und Genre — das Jahr ist verborgen.
 * Der Spieler wählt, in welchen Slot die Karte zeitlich passt.
 * Punktzahl: 5 Punkte für richtige Einordnung.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { getAllSongs } from '@/utils/song-picker';

// ─── Konstanten ───────────────────────────────────────────────────

const TIMELINE_POINTS = 5;

// ─── Hilfsfunktion: 3 Anker-Songs wählen ─────────────────────────

/**
 * Wählt 3 zufällige Anker-Songs aus dem Pool, sortiert nach Jahr.
 * Schließt den aktuellen Song aus.
 */
function pickAnchors(currentSongId: string): PhomuSong[] {
  const pool = getAllSongs().filter((s) => s.id !== currentSongId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).sort((a, b) => a.year - b.year);
}

// ─── Slot-Beschriftungen ──────────────────────────────────────────

function getSlotLabels(anchors: PhomuSong[]): string[] {
  return [
    `Vor ${anchors[0]?.year ?? '?'}`,
    `Zwischen ${anchors[0]?.year ?? '?'} und ${anchors[1]?.year ?? '?'}`,
    `Zwischen ${anchors[1]?.year ?? '?'} und ${anchors[2]?.year ?? '?'}`,
    `Nach ${anchors[2]?.year ?? '?'}`,
  ];
}

/** Gibt den korrekten Slot-Index (0–3) für den Song zurück */
function correctSlot(song: PhomuSong, anchors: PhomuSong[]): number {
  if (song.year < (anchors[0]?.year ?? Infinity)) return 0;
  if (song.year <= (anchors[1]?.year ?? Infinity)) return 1;
  if (song.year <= (anchors[2]?.year ?? Infinity)) return 2;
  return 3;
}

// ─── Props ────────────────────────────────────────────────────────

interface TimelineModeProps {
  song: PhomuSong;
  onAnswer: (isCorrect: boolean, pointsAwarded: number) => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function TimelineMode({ song, onAnswer }: TimelineModeProps) {
  // Anker einmalig stabilisieren — nicht bei jedem Re-Render neu würfeln
  const anchors = useMemo(() => pickAnchors(song.id), [song.id]);
  const slotLabels = useMemo(() => getSlotLabels(anchors), [anchors]);
  const correct = useMemo(() => correctSlot(song, anchors), [song, anchors]);

  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSlotSelect(slotIndex: number) {
    if (answered) return;
    const isCorrect = slotIndex === correct;
    setSelected(slotIndex);
    setAnswered(true);
    onAnswer(isCorrect, isCorrect ? TIMELINE_POINTS : 0);
  }

  return (
    <div className="flex flex-col items-center px-4 py-6 gap-6 max-w-lg mx-auto">

      {/* Anker-Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <p className="text-xs uppercase tracking-widest opacity-50 text-center mb-3">
          Zeitlinie
        </p>
        <div className="relative flex items-center gap-2">
          {/* Verbindungslinie */}
          <div
            className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2"
            style={{ backgroundColor: 'var(--color-border)' }}
            aria-hidden
          />
          {anchors.map((anchor) => (
            <div
              key={anchor.id}
              className="relative z-10 flex-1 text-center"
            >
              <div
                className="mx-auto w-fit px-3 py-2 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p className="text-base font-black">{anchor.year}</p>
                <p className="opacity-60 leading-tight truncate max-w-[80px]">
                  {anchor.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Neue Karte (Jahr verborgen) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center px-6 py-5 rounded-2xl w-full"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '2px solid var(--color-accent)',
        }}
      >
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
          Wann erschien dieser Song?
        </p>
        <h3 className="text-2xl font-black mb-1">{song.artist}</h3>
        <p className="opacity-60 text-sm">{song.genre}</p>
        {answered && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-xl font-black"
            style={{ color: 'var(--color-accent)' }}
          >
            → {song.year}
          </motion.p>
        )}
      </motion.div>

      {/* Slot-Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 gap-2 w-full"
      >
        <AnimatePresence>
          {slotLabels.map((label, i) => {
            const isSelected = selected === i;
            const isCorrectSlot = answered && i === correct;
            const isWrong = answered && isSelected && !isCorrectSlot;

            return (
              <button
                key={i}
                onClick={() => handleSlotSelect(i)}
                disabled={answered}
                className="py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all
                           disabled:cursor-default text-center leading-snug"
                style={{
                  borderColor: isCorrectSlot
                    ? 'var(--color-success)'
                    : isWrong
                    ? 'var(--color-error)'
                    : isSelected
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  backgroundColor: isCorrectSlot
                    ? 'color-mix(in srgb, var(--color-success) 20%, transparent)'
                    : isWrong
                    ? 'color-mix(in srgb, var(--color-error) 20%, transparent)'
                    : 'var(--color-bg-card)',
                }}
              >
                {isCorrectSlot ? '✅ ' : isWrong ? '❌ ' : ''}
                {label}
              </button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {answered && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm opacity-50"
        >
          {selected === correct
            ? `✅ Richtig! +${TIMELINE_POINTS} Punkte`
            : '❌ Falsch!'}{' '}
          Wartet auf das Reveal …
        </motion.p>
      )}
    </div>
  );
}
