'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameMode } from '@/config/game-config';

interface ModeInfo {
  id: GameMode;
  emoji: string;
  titleKey: string;
  taglineKey: string;
  flavourKey: string;
  gradient: readonly [string, string];
}

const MODES = [
  {
    id: 'timeline',
    emoji: '📅',
    titleKey: 'lobby.mode.timelineTitle',
    taglineKey: 'lobby.mode.timelineTagline',
    flavourKey: 'lobby.mode.timelineFlavour',
    gradient: ['#0891b2', '#2563eb'],
  },
  {
    id: 'hint-master',
    emoji: '🕵️',
    titleKey: 'lobby.mode.hintMasterTitle',
    taglineKey: 'lobby.mode.hintMasterTagline',
    flavourKey: 'lobby.mode.hintMasterFlavour',
    gradient: ['#7c3aed', '#db2777'],
  },
  {
    id: 'lyrics',
    emoji: '📝',
    titleKey: 'lobby.mode.lyricsTitle',
    taglineKey: 'lobby.mode.lyricsTagline',
    flavourKey: 'lobby.mode.lyricsFlavour',
    gradient: ['#dc2626', '#ea580c'],
  },
  {
    id: 'vibe-check',
    emoji: '😎',
    titleKey: 'lobby.mode.vibeCheckTitle',
    taglineKey: 'lobby.mode.vibeCheckTagline',
    flavourKey: 'lobby.mode.vibeCheckFlavour',
    gradient: ['#059669', '#0d9488'],
  },
  {
    id: 'survivor',
    emoji: '🏆',
    titleKey: 'lobby.mode.survivorTitle',
    taglineKey: 'lobby.mode.survivorTagline',
    flavourKey: 'lobby.mode.survivorFlavour',
    gradient: ['#b45309', '#d97706'],
  },
  {
    id: 'cover-confusion',
    emoji: '🎭',
    titleKey: 'lobby.mode.coverConfusionTitle',
    taglineKey: 'lobby.mode.coverConfusionTagline',
    flavourKey: 'lobby.mode.coverConfusionFlavour',
    gradient: ['#be185d', '#9333ea'],
  },
] as const satisfies readonly ModeInfo[];

interface ModeSelectorProps {
  selectedModes: GameMode[];
  onChange: (modes: GameMode[]) => void;
}

export function ModeSelector({ selectedModes, onChange }: ModeSelectorProps) {
  const { t } = useTranslation();

  function toggleMode(modeId: GameMode) {
    if (selectedModes.includes(modeId)) {
      if (selectedModes.length === 1) return;
      onChange(selectedModes.filter((m) => m !== modeId));
    } else {
      onChange([...selectedModes, modeId]);
    }
  }

  const allSelected = selectedModes.length === MODES.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest leading-none">
            {t('lobby.modes.label')}
          </p>
          <p
            className="text-[11px] font-black mt-0.5"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('lobby.modes.active', {
              count: selectedModes.length,
              total: MODES.length,
            })}
          </p>
        </div>
        <button
          onClick={() =>
            onChange(allSelected ? [MODES[0]!.id] : MODES.map((m) => m.id))
          }
          className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity border border-white/10 px-4 py-2.5 rounded-full hover:bg-white/5 min-h-[44px]"
        >
          {allSelected
            ? t('lobby.modes.deselectAll')
            : t('lobby.modes.selectAll')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MODES.map((mode, index) => {
          const isSelected = selectedModes.includes(mode.id);
          const isLast = isSelected && selectedModes.length === 1;
          const [gradFrom, gradTo] = mode.gradient;

          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.04,
                type: 'spring',
                stiffness: 380,
                damping: 28,
              }}
              onClick={() => toggleMode(mode.id)}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isSelected}
              className="relative text-left rounded-2xl overflow-hidden focus:outline-none"
            >
              {/* Gradient bg */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                  opacity: isSelected ? 1 : 0.18,
                }}
              />

              {/* Border glow */}
              <div
                className="absolute inset-0 rounded-2xl border-2 transition-all duration-300"
                style={{
                  borderColor: isSelected
                    ? `${gradTo}bb`
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: isSelected ? `0 0 20px ${gradFrom}44` : 'none',
                }}
              />

              {/* Dim overlay when off */}
              {!isSelected && (
                <div className="absolute inset-0 rounded-2xl bg-[#0a0a0c]/55 pointer-events-none" />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-4 px-4 py-4">
                {/* Emoji */}
                <motion.span
                  className="text-3xl leading-none shrink-0"
                  animate={{ scale: isSelected ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {mode.emoji}
                </motion.span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm uppercase tracking-tight leading-none">
                      {t(mode.titleKey)}
                    </p>
                    {isLast && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 opacity-50">
                        {t('lobby.modes.mandatory')}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] font-black italic mt-0.5 leading-tight transition-opacity duration-200"
                    style={{ opacity: isSelected ? 0.9 : 0.45 }}
                  >
                    {t(mode.taglineKey)}
                  </p>
                  <p
                    className="text-[10px] mt-1 leading-snug transition-opacity duration-200"
                    style={{ opacity: isSelected ? 0.6 : 0.25 }}
                  >
                    {t(mode.flavourKey)}
                  </p>
                </div>

                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 20 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 22,
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-lg"
                      style={{ background: gradTo }}
                    >
                      ✓
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
