/**
 * The slot list of the Timeline mode.
 *
 * WHAT: the slots of the timeline — the free ones, the placement of the
 * player, the slot of the joker and the hint of the correct slot — on the
 * axis the mode draws them on.
 *
 * WHY a component of its own: the list is the biggest part of the mode, and
 * it changes with every state of the round. Keeping it apart leaves the
 * mode with the state of the round, and the list with the drawing.
 *
 * WHY two axes: the portrait is a phone that is held upright — a vertical
 * list of the years is read from top to bottom. The landscape is a tablet
 * on the table, and a timeline that runs from left to right is the picture
 * everybody expects: the years are the marks on a line, and the slots are
 * the gaps between them.
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
  type TimelineSlotKind,
} from './timeline-logic';

/** The axis the slots are drawn on. */
export type TimelineAxis = 'vertical' | 'horizontal';

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
  /**
   * Whether an answer of the player reached the base.
   *
   * WHY: a round without an answer carries no judgement — the slot must
   * not show a wrong placement and the year `0`.
   */
  hasAnswer: boolean;
  /** The identity of the song, after the reveal. */
  identity: SongIdentity | null;
  /** The axis of the timeline — the portrait draws it vertically. */
  axis?: TimelineAxis;
  /** The handler of a click on a slot. */
  onSelect: (slot: number) => void;
}

/**
 * The height of a slot on the horizontal axis.
 *
 * WHY a fixed height: the axis of the landscape runs under the slots, and
 * the line has to meet the marks of the years at the same height in every
 * column.
 */
const HORIZONTAL_SLOT_HEIGHT = 'h-24';

/**
 * The distance from the top of the axis to the line.
 *
 * WHY a number and not a class: the line is drawn over the whole width and
 * has to meet the marks of the years exactly — the height of the slot and
 * the tick below it are the two parts of the distance.
 */
const HORIZONTAL_AXIS_TOP = '6.75rem';

/**
 * The space above the line that the mark of a year needs.
 *
 * WHY: the mark of the year is a dot in the middle of the line — half of it
 * lies above it.
 */
const HORIZONTAL_MARK_SPACE = 'h-[6.75rem]';

export function TimelineSlots({
  timelineYears,
  selectedSlot,
  jokerSlot,
  correctSlot,
  validSlotSet,
  isRevealed,
  hasAnswer,
  identity,
  axis = 'vertical',
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

  // The pure layer decides how the slot is drawn; the component only
  // maps the answer to a class name.
  const slots = Array.from({ length: numSlots }, (_, slotIdx) =>
    describeTimelineSlot({
      index: slotIdx,
      selectedSlot,
      jokerSlot,
      correctSlot,
      isAnswerCorrect,
      isRevealed,
      hasAnswer,
      yearAfter: timelineYears[slotIdx],
    })
  );

  /**
   * The class of the box of a slot.
   *
   * @param kind - The kind of the slot
   * @returns The class of the box
   */
  function boxClass(kind: TimelineSlotKind): string {
    return [
      'rounded-xl border-2 border-dashed flex items-center justify-center transition-all focus:outline-none',
      // The player placed the song here
      kind === 'placed' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : '',
      // A free slot before the reveal
      kind === 'open' ? 'border-white/10 bg-white/[0.02] hover:border-white/20' : '',
      // Correct: green only where user placed
      kind === 'correct' ? 'border-green-500 bg-green-500/10' : '',
      // Wrong: red where user placed
      kind === 'wrong' ? 'border-red-500 bg-red-500/10' : '',
      // Dim green hint on the canonical slot of a wrong answer
      kind === 'hint' ? 'border-green-500/50 bg-green-500/5' : '',
      kind === 'dimmed' ? 'border-white/5 bg-transparent' : '',
    ].join(' ');
  }

  /**
   * The content of a slot.
   *
   * @param kind - The kind of the slot
   * @param slotIdx - The index of the slot
   * @returns The content of the box
   */
  function slotContent(kind: TimelineSlotKind, slotIdx: number) {
    if (kind === 'placed') {
      return (
        <div className="flex items-center gap-2 px-3">
          <span className="text-sm">🎵</span>
          <p className="text-[10px] font-black uppercase tracking-widest">
            {t('modes.timeline.placed')}
          </p>
        </div>
      );
    }
    if (kind === 'correct' || kind === 'wrong') {
      return (
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
      );
    }
    if (kind === 'open') {
      return (
        <span className="text-[9px] font-black opacity-10 uppercase tracking-widest">
          {numberFormat.format(slotIdx + 1)}
        </span>
      );
    }
    if (kind === 'hint') {
      return (
        <div className="flex items-center gap-2 text-green-400 font-black px-3">
          <span>←</span>
          <span className="text-[10px] uppercase tracking-widest">
            {t('modes.timeline.here')}
          </span>
        </div>
      );
    }
    return null;
  }

  // ── The vertical axis — the portrait ──────────────────────────
  if (axis === 'vertical') {
    return (
      <div className="w-full flex flex-col">
        {slots.map((slot) => {
          const yearAfter = slot.yearAfter;

          // Joker slot: render as a visually removed / crossed-out slot,
          // non-interactive
          if (slot.kind === 'joker') {
            return (
              <div key={slot.index} className="flex flex-col">
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
            <div key={slot.index} className="flex flex-col">
              {/* Slot row */}
              <div className="flex items-center gap-3">
                <div className="w-12 shrink-0 flex flex-col items-center">
                  <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
                  <div className="w-2 h-2 rounded-full bg-white/20 my-0.5 shrink-0" />
                  <div className="w-0.5 flex-1 bg-white/10 min-h-[8px]" />
                </div>

                <button
                  onClick={() => onSelect(slot.index)}
                  disabled={isRevealed}
                  className={[
                    'flex-1',
                    numSlots <= 5 ? 'h-20' : numSlots <= 7 ? 'h-16' : 'h-12',
                    boxClass(slot.kind),
                  ].join(' ')}
                >
                  {slotContent(slot.kind, slot.index)}
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

  // ── The horizontal axis — the landscape ────────────────────────
  //
  // The slots stand on a line, the years are the marks on it. The line
  // runs under the boxes and meets the mark of every year. A year is the
  // mark *between* two slots — the song belongs before it or after it.
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-stretch">
        {/* The line of the timeline */}
        <div
          className="absolute left-0 right-0 h-px bg-white/20"
          style={{ top: HORIZONTAL_AXIS_TOP }}
        />

        {slots.map((slot) => {
          const yearAfter = slot.yearAfter;

          // The joker took the slot away: it is crossed out and cannot be
          // chosen any more.
          if (slot.kind === 'joker') {
            return (
              <div key={`slot-${slot.index}`} className="flex items-stretch">
                <div className="flex flex-col items-center px-1">
                  <div
                    className="w-32 h-24 rounded-xl border-2 border-dashed flex items-center justify-center opacity-30"
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
                  {/* The tick from the slot down to the line */}
                  <div className="h-3 w-px bg-white/20" />
                </div>
                {yearAfter !== undefined && (
                  <div className="flex flex-col items-center">
                    <div className={HORIZONTAL_MARK_SPACE} />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/50 -mt-1.5 ring-4 ring-[var(--color-bg)]" />
                    <div className="h-2 w-px bg-white/10" />
                    <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                      <p className="text-[11px] font-black text-white leading-none">
                        {yearFormat.format(yearAfter)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={`slot-${slot.index}`} className="flex items-stretch">
              <div className="flex flex-col items-center px-1">
                <button
                  onClick={() => onSelect(slot.index)}
                  disabled={isRevealed}
                  className={['w-32', HORIZONTAL_SLOT_HEIGHT, boxClass(slot.kind)].join(' ')}
                >
                  {slotContent(slot.kind, slot.index)}
                </button>
                {/* The tick from the slot down to the line */}
                <div className="h-3 w-px bg-white/20" />
              </div>
              {yearAfter !== undefined && (
                <div className="flex flex-col items-center">
                  <div className={HORIZONTAL_MARK_SPACE} />
                  {/* The mark of the year on the line */}
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50 -mt-1.5 ring-4 ring-[var(--color-bg)]" />
                  <div className="h-2 w-px bg-white/10" />
                  <div className="px-2.5 py-0.5 bg-[var(--color-bg-card)] border border-white/15 rounded-full shadow-md">
                    <p className="text-[11px] font-black text-white leading-none">
                      {yearFormat.format(yearAfter)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
