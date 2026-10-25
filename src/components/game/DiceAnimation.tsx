/**
 * DiceAnimation Component
 * 
 * Zeigt rollende Würfel und eine "Sorry"-Meldung,
 * wenn ein Video defekt ist oder neu gezogen (Reroll) wird.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo } from 'react';

interface DiceAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const DICE_ICON = '🎲';
const DICE_COUNT = 3;

export function DiceAnimation({ isVisible, onComplete }: DiceAnimationProps) {
  const diceOffsets = useMemo(
    () =>
      Array.from({ length: DICE_COUNT }).map((_, index) => {
        const seed = (index + 1) * 97;
        return {
          yInitial: (seed % 200) - 100,
          yAnimate: ((seed * 1.7) % 200) - 100,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          {/* Animated Dice Rolling Across */}
          {Array.from({ length: DICE_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: -500 - (i * 100),
                y: diceOffsets[i]?.yInitial ?? 0,
                rotate: 0,
                opacity: 0,
              }}
              animate={{
                x: 1000,
                y: diceOffsets[i]?.yAnimate ?? 0,
                rotate: 1080 + (i * 360),
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 4.4,
                delay: i * 0.25,
                ease: 'easeOut',
              }}
              className="absolute text-8xl drop-shadow-2xl"
            >
              {DICE_ICON}
            </motion.div>
          ))}

          {/* Animated "Sorry" Text */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1.2, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -100 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
            className="flex flex-col items-center gap-4 text-center z-10"
          >
            <div className="bg-red-500 text-white px-8 py-4 rounded-[2rem] shadow-2xl border-4 border-white">
              <h3 className="text-6xl font-black italic uppercase tracking-tighter mix-blend-difference">SORRY!</h3>
            </div>
            <p className="text-white text-xl font-bold drop-shadow-lg">Video geht gerade nicht. Wir würfeln neu...</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
