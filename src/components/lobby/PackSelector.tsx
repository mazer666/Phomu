'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { PHOMU_CONFIG } from '@/config/game-config';

interface PackSelectorProps {
  selectedPacks: string[];
  onChange: (packs: string[]) => void;
}

export function PackSelector({ selectedPacks, onChange }: PackSelectorProps) {
  const allPacks = PHOMU_CONFIG.SONG_PACKS;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, []);

  const togglePack = (packId: string) => {
    if (selectedPacks.includes(packId)) {
      if (selectedPacks.length === 1) return; // Mindestens ein Pack
      onChange(selectedPacks.filter((id) => id !== packId));
    } else {
      onChange([...selectedPacks, packId]);
    }
  };

  const selectAll = () => onChange(allPacks.map((p) => p.id));
  const selectNone = () => onChange([allPacks[0]!.id]);

  const allSelected = selectedPacks.length === allPacks.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest leading-none">
            Song Packs
          </p>
          <p className="text-[11px] font-black mt-0.5" style={{ color: 'var(--color-accent)' }}>
            {selectedPacks.length} von {allPacks.length} gewählt
          </p>
        </div>
        <button
          onClick={allSelected ? selectNone : selectAll}
          className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          {allSelected ? 'Abwählen' : 'Alle wählen'}
        </button>
      </div>

      {/* Pack Grid */}
      <div className="relative">
        {/* Scroll-fade hint at bottom */}
        <AnimatePresence>
          {canScrollMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10 flex flex-col items-center justify-end pb-1"
              style={{ background: 'linear-gradient(to top, var(--color-bg) 30%, transparent)' }}
            >
              <motion.span
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                className="text-[9px] font-black uppercase tracking-widest opacity-40"
              >
                ↓ mehr
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          className="grid grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto px-0.5 pb-2 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
        {allPacks.map((pack, index) => {
          const isSelected = selectedPacks.includes(pack.id);
          const isHovered = hoveredId === pack.id;
          const [gradFrom, gradTo] = pack.gradient;

          return (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025, type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => togglePack(pack.id)}
              onMouseEnter={() => setHoveredId(pack.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative text-left rounded-2xl overflow-hidden focus:outline-none"
              style={{ height: '120px' }}
            >
              {/* Background gradient — always visible, dimmed when not selected */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                  opacity: isSelected ? 1 : 0.25,
                }}
              />

              {/* Subtle noise texture overlay */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px 128px',
                }}
              />

              {/* Border */}
              <div
                className="absolute inset-0 rounded-2xl border-2 transition-all duration-300"
                style={{
                  borderColor: isSelected
                    ? `${gradTo}cc`
                    : isHovered
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: isSelected
                    ? `0 0 24px ${gradFrom}55, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : 'none',
                }}
              />

              {/* Content */}
              <div className="relative z-10 p-3.5 h-full flex flex-col justify-between">
                {/* Top row: emoji + checkmark */}
                <div className="flex items-start justify-between">
                  <motion.span
                    className="text-2xl leading-none select-none"
                    animate={{ scale: isSelected ? 1.15 : isHovered ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {pack.emoji}
                  </motion.span>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 20 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg"
                        style={{ background: gradTo, color: '#fff' }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom: name + tagline */}
                <div>
                  <p
                    className="text-[11px] font-black uppercase tracking-tight leading-tight transition-opacity duration-200"
                    style={{ opacity: isSelected ? 1 : 0.7 }}
                  >
                    {pack.name}
                  </p>
                  <p
                    className="text-[9px] font-semibold leading-tight mt-0.5 transition-opacity duration-200 italic"
                    style={{ opacity: isSelected ? 0.75 : 0.35 }}
                  >
                    {pack.tagline}
                  </p>
                </div>
              </div>

              {/* Not-selected dim overlay */}
              {!isSelected && (
                <div className="absolute inset-0 bg-[#0a0a0c]/50 rounded-2xl transition-opacity duration-300 pointer-events-none" />
              )}
            </motion.button>
          );
        })}
        </div>
      </div>

      {/* Footer badge */}
      <div className="flex items-center gap-2 justify-center bg-white/5 py-2 rounded-xl border border-white/5">
        <span className="animate-pulse">✨</span>
        <p className="text-[9px] opacity-50 font-black uppercase tracking-wider">
          Über 1.000 Songs bereit zum Spielen
        </p>
      </div>
    </div>
  );
}
