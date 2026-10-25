/**
 * The slot list of the Timeline mode.
 *
 * WHAT: the slots of the timeline — the free ones, the placement of the
 * player, the slot of the joker and the hint of the correct slot.
 *
 * WHY a component of its own: the list is the biggest part of the mode, and
 * it changes with every state of the round. Keeping it apart leaves the
 * mode with the state of the round, and the list with the drawing.
 *
 * WHY the decision is not here: the pure layer of the mode decides how a
 * slot is drawn (`describeTimelineSlot`). This component maps the answer to
 * a class name — and to nothing else.
 */
'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongIdentity } from '@/core/types';
import {
  describeTimelineSlot,
  isTimelineSlotCorrect,
  timelineSlotCount,
} from './timeline-logic';

interface TimelineSlotsProps {
  /** The years that are on the timeline. */
  timelineYears: number[];
  /** The slot the player placed the song in. */
  selectedSlot: number | null;
  /** The slot the joker took away. */
  jokerSlot: number | null;
  /** The slot the base named as the correct one. */
  correctSlot: number | null;
  /** The slots the base accepts. */
  validSlotSet: ReadonlySet<number>;
  /** Whether the round was revealed. */
  isRevealed: boolean;
  /** The identity of the song, after the reveal. */
  identity: SongIdentity | null;
  /** The handler of a click on a slot. */
  onSelect: (slot: number) => void;
}

export function TimelineSlots({
  timelineYears,
  selectedSlot,
  jokerSlot,
  correctSlot,
  validSlotSet,
  isRevealed,
  identity,
  onSelect,
}: TimelineSlotsProps) {
  const { t, i18n } = useTranslation();

  // Number formats of the active locale (years without a thousands separator)
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );
  const yearFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  const numSlots = timelineSlotCount(timelineYears.length);
  const isAnswerCorrect = isTimelineSlotCorrect(selectedSlot, validSlotSet);

  return (
    <div className="w-full flex flex-col">
      {Array.from({ length: numSlots }, (_, slotIdx) => {
        const yearAfter = timelineYears[slotIdx];
        // The pure layer decides how the slot is drawn; the component only
        // maps the answer to a class name.
        const slot = describeTimelineSlot({
          index: slotIdx,
          selectedSlot,
          jokerSlot,
          correctSlot,
          isAnswerCorrect,
          isRevealed,
          yearAfter,
        });

        // Joker slot: render as a visually removed / crossed-out slot, non-interactive
        if (slot.kind === 'joker') {
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
              {slot.yearAfter !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-12 shrink-0 flex justify-center py-0.5">
                    <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                      <p className="text-[11px] font-black text-white leading-none">
                        {yearFormat.format(slot.yearAfter)}
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
            {/* Slot row */}
            <div className="flex items-center gap-3">
              <div className="w-12 shrink-0 flex flex-col items-center">
                <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
                <div className="w-2 h-2 rounded-full bg-white/20 my-0.5 shrink-0" />
                <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
              </div>

              <button
                onClick={() => onSelect(slotIdx)}
                disabled={isRevealed}
                className={[
                  'flex-1 rounded-xl border-2 border-dashed flex items-center justify-center transition-all focus:outline-none',
                  numSlots <= 5 ? 'h-20' : numSlots <= 7 ? 'h-16' : 'h-12',
                  // The player placed the song here
                  slot.kind === 'placed'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : '',
                  // A free slot before the reveal
                  slot.kind === 'open'
                    ? 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    : '',
                  // Correct: green only where user placed
                  slot.kind === 'correct'
                    ? 'border-green-500 bg-green-500/10'
                    : '',
                  // Wrong: red where user placed
                  slot.kind === 'wrong'
                    ? 'border-red-500 bg-red-500/10'
                    : '',
                  // Dim green hint on the canonical slot of a wrong answer
                  slot.kind === 'hint'
                    ? 'border-green-500/50 bg-green-500/5'
                    : '',
                  slot.kind === 'dimmed'
                    ? 'border-white/5 bg-transparent'
                    : '',
                ].join(' ')}
              >
                {slot.kind === 'placed' && (
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-sm">🎵</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {t('modes.timeline.placed')}
                    </p>
                  </div>
                )}
                {(slot.kind === 'correct' || slot.kind === 'wrong') && (
                  <div className="flex items-center gap-3 px-3 text-left">
                    <div>
                      <p className="text-xs font-black uppercase truncate max-w-[160px]">
                        {identity?.artist}
                      </p>
                      <p className="text-[9px] opacity-40 uppercase truncate max-w-[160px] leading-none mb-0.5">
                        {identity?.title}
                      </p>
                      <p className="text-lg font-black">
                        {yearFormat.format(identity?.year ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
                {slot.kind === 'open' && (
                  <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">
                    {numberFormat.format(slotIdx + 1)}
                  </span>
                )}
                {slot.kind === 'hint' && (
                  <div className="flex items-center gap-2 text-green-400 font-black px-3">
                    <span>←</span>
                    <span className="text-[10px] uppercase tracking-widest">
                      {t('modes.timeline.here')}
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Year between the slots */}
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
  );
}
