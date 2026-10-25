/**
 * Tooltip Component
 * 
 * A premium, animated tooltip using Framer Motion. 
 * Shows on hover or focus for keyboard accessibility.
 */
'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 0.3 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full mb-2 bottom-full left-1/2',
    bottom: '-translate-x-1/2 translate-y-full mt-2 top-full left-1/2',
    left: '-translate-y-1/2 -translate-x-full mr-2 right-full top-1/2',
    right: '-translate-y-1/2 translate-x-full ml-2 left-full top-1/2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-black/80',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-black/80',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-black/80',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-black/80',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay }}
            className={`absolute z-[200] whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
          >
            <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-2xl uppercase tracking-widest">
              {content}
              <div 
                className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
