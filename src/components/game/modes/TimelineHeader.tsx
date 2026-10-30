/**
 * The header of the Timeline mode.
 *
 * WHAT: the question of the mode, the quip of the answer, the buttons of the
 * cheats and the badges that show what the player bought.
 *
 * WHY a component of its own: the header shows every state of the round —
 * the question, the cheats, the joker, the answer — and it is the part of
 * the mode that changes the most often. The mode itself keeps the state.
 *
 * WHY the quip is picked here: the quip depends on the answer and on the
 * song, and it belongs to the drawing of the answer.
 */
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getSpicyColor } from '@/utils/feedback-messages';
import { useSpicyMessage } from '../useSpicyMessage';
import { Icon } from '@/components/art/Icon';

interface TimelineHeaderProps {
  /** Whether the round was revealed. */
  isRevealed: boolean;
  /** Whether the answer of the player was right. */
  isCorrect: boolean;
  /** The identifier of the song of the round. */
  songId: string;
  /** Whether the decade hint was bought. */
  cheatActive: boolean;
  /** The hint of the decade. */
  cheatHint: string;
  /** Whether the joker was used. */
  jokerUsed: boolean;
  /** The number of slots of the timeline. */
  numSlots: number;
  /** Whether the cheats are switched off in the lobby. */
  noCheatMode: boolean;
  /** The points the round is worth. */
  points: number;
  /** The handler of the decade hint. */
  onCheat: () => void;
  /** The handler of the joker. */
  onJoker: () => void;
}

export function TimelineHeader({
  isRevealed,
  isCorrect,
  songId,
  cheatActive,
  cheatHint,
  jokerUsed,
  numSlots,
  noCheatMode,
  points,
  onCheat,
  onJoker,
}: TimelineHeaderProps) {
  const { t, i18n } = useTranslation();
  const spicyMessage = useSpicyMessage(isCorrect, songId);

  // Number format of the active locale.
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  return (
    <div className="text-center space-y-1">
      <h2 className="text-2xl font-black uppercase tracking-tight">
        {!isRevealed ? (
          t('modes.timeline.question')
        ) : (
          <>
            <p
              className="text-xl font-black uppercase italic tracking-tighter mb-1"
              style={{
                color: getSpicyColor(isCorrect, songId),
              }}
            >
              {spicyMessage}
            </p>
            <p className="text-sm opacity-60">
              {isCorrect
                ? t('modes.timeline.correct')
                : t('modes.timeline.wrong')}
            </p>
          </>
        )}
      </h2>

      {/* Cheat Button */}
      {!isRevealed && !cheatActive && !noCheatMode && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          onClick={onCheat}
          className="text-[10px] font-black uppercase tracking-widest border border-red-500/20 py-1.5 px-3 rounded-full hover:bg-red-500/5 text-red-500 transition-all mb-2 min-h-[44px]"
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
            <Icon name="magnifier" size={13} /> {cheatHint}
          </p>
        </motion.div>
      )}

      {/* Joker Button */}
      {!isRevealed && !jokerUsed && numSlots > 3 && !noCheatMode && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          onClick={onJoker}
          className="text-[10px] font-black uppercase tracking-widest border border-orange-500/20 py-1.5 px-3 rounded-full hover:bg-orange-500/5 transition-all mb-1 min-h-[44px]"
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
  );
}
