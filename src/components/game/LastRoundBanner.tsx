/**
 * LastRoundBanner
 *
 * Fullscreen gong overlay that appears when the last round starts.
 * Shows a dramatic announcement that disappears automatically after ~3s.
 * Appears BETWEEN the reveal and the drawing phase — it does not disturb
 * any answer.
 */
'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LAST_ROUND_MESSAGES,
  type LastRoundMessage,
} from '@/utils/last-round-messages';
import {
  LAST_ROUND_HEADLINE_KEYS,
  LAST_ROUND_SUBLINE_KEYS,
} from '@/i18n/variant-keys';

interface LastRoundBannerProps {
  message: LastRoundMessage | null;
  onDismiss: () => void;
}

const DISPLAY_MS = 3200;

export function LastRoundBanner({ message, onDismiss }: LastRoundBannerProps) {
  const { t } = useTranslation();

  // Headline/subline come from the translation. The original text from
  // src/utils/last-round-messages.ts only serves as a fallback.
  const translated = useMemo(() => {
    if (!message) return null;
    const index = LAST_ROUND_MESSAGES.findIndex(
      (entry) => entry.headline === message.headline
    );
    if (index < 0) return message;
    return {
      emoji: message.emoji,
      headline: t(
        LAST_ROUND_HEADLINE_KEYS[index % LAST_ROUND_HEADLINE_KEYS.length]!,
        {
          defaultValue: message.headline,
        }
      ),
      subline: t(
        LAST_ROUND_SUBLINE_KEYS[index % LAST_ROUND_SUBLINE_KEYS.length]!,
        {
          defaultValue: message.subline,
        }
      ),
    };
  }, [message, t]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {translated && (
        <motion.div
          key={`${translated.headline}-${translated.emoji}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
          style={{
            backgroundColor: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Glowing ring */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.15, 1], opacity: [0, 1, 0.6] }}
            transition={{ duration: 0.6, times: [0, 0.5, 1] }}
            className="absolute w-64 h-64 rounded-full border-4 border-yellow-400"
            style={{ boxShadow: '0 0 80px rgba(250,204,21,0.4)' }}
          />

          {/* Emoji gong */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 18,
              delay: 0.1,
            }}
            className="text-7xl mb-6 select-none relative z-10"
          >
            {translated.emoji}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 22,
              delay: 0.15,
            }}
            className="text-5xl sm:text-7xl font-black italic uppercase tracking-tighter text-center px-4 relative z-10"
            style={{
              color: '#facc15',
              textShadow:
                '0 0 40px rgba(250,204,21,0.6), 0 4px 0 rgba(0,0,0,0.8)',
            }}
          >
            {translated.headline}
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="text-base sm:text-lg font-bold text-center max-w-sm px-6 mt-4 opacity-70 relative z-10"
          >
            {translated.subline}
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-1 bg-white/10 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: DISPLAY_MS / 1000, ease: 'linear' }}
              className="h-full bg-yellow-400 rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
