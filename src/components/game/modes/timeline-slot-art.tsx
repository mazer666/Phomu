/**
 * The drawing of a slot.
 *
 * WHAT: the class of the box of a slot and the content that stands in it —
 * the placement of the player, the song after the reveal, the number of a
 * free slot and the hint of the correct one.
 *
 * WHY a module of its own: the drawing of a slot is the same on both axes —
 * the vertical one of the portrait and the horizontal one of the landscape.
 * What differs is only the place where the box stands.
 *
 * EXAMPLE: `slotBoxClass('placed')` gives the box of the player.
 */
'use client';

import { useTranslation } from 'react-i18next';
import type { SongIdentity } from '@/core/types';
import { Icon } from '@/components/art/Icon';
import type { TimelineSlotKind } from './timeline-logic';

/**
 * The class of the box of a slot.
 *
 * @param kind - The kind of the slot
 * @returns The class of the box
 */
export function slotBoxClass(kind: TimelineSlotKind): string {
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

/** What the content of a slot needs to draw itself. */
export interface SlotContentProps {
  /** The kind of the slot. */
  kind: TimelineSlotKind;
  /** The index of the slot. */
  index: number;
  /** The identity of the song — after the reveal. */
  identity: SongIdentity | null;
  /** The format of the years of the active locale. */
  yearFormat: Intl.NumberFormat;
  /** The format of the numbers of the active locale. */
  numberFormat: Intl.NumberFormat;
}

/**
 * The content of a slot.
 *
 * WHY a component and not a function: it reads a text of the interface, and
 * a hook may only stand in a component.
 *
 * @param props - What the content needs to draw itself
 * @returns The content of the box
 */
export function SlotContent({
  kind,
  index,
  identity,
  yearFormat,
  numberFormat,
}: SlotContentProps) {
  const { t } = useTranslation();

  if (kind === 'placed') {
    return (
      <div className="flex items-center gap-2 px-3">
        <Icon name="note" size={16} className="text-[var(--color-accent)]" />
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
        {numberFormat.format(index + 1)}
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
