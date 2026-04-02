/**
 * FeedbackOverlay Component
 * 
 * Zeigt kurzzeitig eine humorvolle Einblendung (YDKJ/Känguru-Style),
 * wenn der Spieler eine Antwort abgegeben hat.
 */
'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CORRECT_MESSAGES, WRONG_MESSAGES } from '@/utils/feedback-messages';

interface FeedbackOverlayProps {
  isCorrect: boolean | null;
  triggerKey: number; // Wechselt bei jeder neuen Antwort
  onComplete?: () => void;
}

const COLORS_CORRECT = ['#4ade80', '#22c55e', '#6ee7b7', '#34d399', '#facc15'];
const COLORS_WRONG = ['#f87171', '#ef4444', '#fb923c', '#f43f5e', '#ec4899'];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  const idx = hashSeed(seed) % items.length;
  return items[idx]!;
}

export function FeedbackOverlay({ isCorrect, triggerKey, onComplete }: FeedbackOverlayProps) {
  const payload = useMemo(() => {
    if (isCorrect === null) return null;

    const pool = isCorrect ? CORRECT_MESSAGES : WRONG_MESSAGES;
    const colors = isCorrect ? COLORS_CORRECT : COLORS_WRONG;
    const seedBase = `${isCorrect ? '1' : '0'}:${triggerKey}`;

    const message = pickDeterministic(pool, `msg:${seedBase}`);
    const color = pickDeterministic(colors, `color:${seedBase}`);
    const rotation = (hashSeed(`rot:${seedBase}`) % 11) - 5; // -5 ... +5

    return { message, color, rotation };
  }, [isCorrect, triggerKey]);

  useEffect(() => {
    if (isCorrect === null) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, 3600);

    return () => clearTimeout(timer);
  }, [isCorrect, triggerKey, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <AnimatePresence>
        {payload && (
          <motion.div
            key={`${payload.message}-${triggerKey}`}
            initial={{ scale: 0.05, opacity: 0, rotate: payload.rotation - 20, y: 80 }}
            animate={{ scale: 1, opacity: 1, rotate: payload.rotation, y: 0 }}
            exit={{ scale: 1.3, opacity: 0, y: -180, rotate: payload.rotation + 10 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 14,
              opacity: { duration: 0.2 },
            }}
            className="px-8 py-6 rounded-3xl shadow-2xl backdrop-blur-xl border-4 w-full"
            style={{
              backgroundColor: 'rgba(0,0,0,0.88)',
              borderColor: payload.color,
              boxShadow: `0 0 50px ${payload.color}44`,
              maxWidth: '520px',
            }}
          >
            <p
              className="font-black italic uppercase tracking-tighter text-center break-words hyphens-auto"
              style={{
                color: payload.color,
                fontSize: payload.message.length > 30 ? 'clamp(1.4rem, 5vw, 2.5rem)' : 'clamp(1.8rem, 7vw, 3.5rem)',
              }}
            >
              {payload.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
