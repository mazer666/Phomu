/**
 * FeedbackOverlay Component
 * 
 * Zeigt kurzzeitig eine humorvolle Einblendung (YDKJ/Känguru-Style),
 * wenn der Spieler eine Antwort abgegeben hat.
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CORRECT_MESSAGES, WRONG_MESSAGES } from '@/utils/feedback-messages';

interface FeedbackOverlayProps {
  isCorrect: boolean | null;
  triggerKey: number; // Wechselt bei jeder neuen Antwort
  onComplete?: () => void;
}

const COLORS_CORRECT = ['#4ade80', '#22c55e', '#6ee7b7', '#34d399', '#facc15'];
const COLORS_WRONG = ['#f87171', '#ef4444', '#fb923c', '#f43f5e', '#ec4899'];

export function FeedbackOverlay({ isCorrect, triggerKey, onComplete }: FeedbackOverlayProps) {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [color, setColor] = useState('#fff');
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isCorrect === null) {
      setActiveMessage(null);
      return;
    }

    const pool = isCorrect ? CORRECT_MESSAGES : WRONG_MESSAGES;
    const colors = isCorrect ? COLORS_CORRECT : COLORS_WRONG;
    
    const randomMsg = pool[Math.floor(Math.random() * pool.length)]!;
    const randomColor = colors[Math.floor(Math.random() * colors.length)]!;
    const randomRot = Math.random() * 10 - 5; // -5 to +5 degrees

    setActiveMessage(randomMsg);
    setColor(randomColor);
    setRotation(randomRot);

    const timer = setTimeout(() => {
      setActiveMessage(null);
      onComplete?.();
    }, 3600);

    return () => clearTimeout(timer);
  }, [isCorrect, triggerKey, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <AnimatePresence>
        {activeMessage && (
          <motion.div
            key={activeMessage + triggerKey}
            initial={{ scale: 0.05, opacity: 0, rotate: rotation - 20, y: 80 }}
            animate={{ scale: 1, opacity: 1, rotate: rotation, y: 0 }}
            exit={{ scale: 1.3, opacity: 0, y: -180, rotate: rotation + 10 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 14,
              opacity: { duration: 0.2 }
            }}
            className="px-8 py-6 rounded-3xl shadow-2xl backdrop-blur-xl border-4 w-full"
            style={{
              backgroundColor: 'rgba(0,0,0,0.88)',
              borderColor: color,
              boxShadow: `0 0 50px ${color}44`,
              maxWidth: '520px',
            }}
          >
            <p
              className="font-black italic uppercase tracking-tighter text-center break-words hyphens-auto"
              style={{
                color,
                fontSize: activeMessage.length > 30 ? 'clamp(1.4rem, 5vw, 2.5rem)' : 'clamp(1.8rem, 7vw, 3.5rem)',
              }}
            >
              {activeMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
