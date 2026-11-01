'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/art/Icon';

/** Use the available rail, so the gesture also works in a compact landscape player. */
export function isRevealSwipe(
  offset: number,
  railWidth: number,
  handleWidth: number
): boolean {
  const travel = railWidth - handleWidth;
  return travel > 0 && offset >= travel * 0.65;
}

export function SwipeToShow({ onReveal }: { onReveal: () => void }) {
  const { t } = useTranslation();
  const rail = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  return (
    <motion.div
      className="music-swipe-cover"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="music-swipe-cover"
    >
      <div className="music-swipe-art" aria-hidden="true">
        <Icon name="disc" size={40} />
      </div>
      <div className="music-swipe-rail" ref={rail}>
        <span className="music-swipe-label">
          {t('game.music.swipeToReveal')}
        </span>
        <motion.button
          type="button"
          ref={handle}
          className="music-swipe-handle"
          data-testid="music-swipe-handle"
          aria-label={t('game.music.openPlayer')}
          drag="x"
          dragConstraints={rail}
          dragElastic={0}
          dragSnapToOrigin
          style={{ touchAction: 'pan-y' }}
          onClick={(event) => {
            if (event.detail === 0) onReveal();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              onReveal();
            }
          }}
          onDragEnd={(_, info) => {
            if (
              isRevealSwipe(
                info.offset.x,
                rail.current?.clientWidth ?? 0,
                handle.current?.clientWidth ?? 0
              )
            )
              onReveal();
          }}
        >
          <Icon name="arrow-right" size={22} />
        </motion.button>
      </div>
    </motion.div>
  );
}
