'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameMode } from '@/config/game-config';

interface ModeInfo {
  id: GameMode;
  emoji: string;
  title: string;
  tagline: string;
  flavour: string;
  gradient: [string, string];
}

const MODES: ModeInfo[] = [
  {
    id: 'timeline',
    emoji: '📅',
    title: 'Timeline',
    tagline: 'Wann war das nochmal?',
    flavour: 'Songs nach Jahr sortieren. Klingt einfach. Ist es nicht.',
    gradient: ['#0891b2', '#2563eb'],
  },
  {
    id: 'hint-master',
    emoji: '🕵️',
    title: 'Hint-Master',
    tagline: 'Fünf Hinweise. Einer reicht dir.',
    flavour: 'Je früher du antwortest, desto mehr Punkte. Aber auch desto mehr Risiko.',
    gradient: ['#7c3aed', '#db2777'],
  },
  {
    id: 'lyrics',
    emoji: '📝',
    title: 'Lyrics Labyrinth',
    tagline: 'Einer von uns lügt.',
    flavour: 'Echter Text oder frei erfunden? Dein Ohrwurm-Gedächtnis gegen unsere KI.',
    gradient: ['#dc2626', '#ea580c'],
  },
  {
    id: 'vibe-check',
    emoji: '😎',
    title: 'Vibe Check',
    tagline: 'Fühlst du das, oder fühlst du das nicht?',
    flavour: 'Stimmt die Gruppe überein, gibt\'s Punkte. Gruppentherapie durch Musik.',
    gradient: ['#059669', '#0d9488'],
  },
  {
    id: 'survivor',
    emoji: '🏆',
    title: 'Survivor',
    tagline: 'One-Hit-Wonder oder Dauerstar?',
    flavour: 'Erkenne, ob der Artist mehr als diesen einen Song hatte. Peinlich wenn nicht.',
    gradient: ['#b45309', '#d97706'],
  },
  {
    id: 'cover-confusion',
    emoji: '🎭',
    title: 'Cover Confusion',
    tagline: 'Das Original ist nicht das, was du denkst.',
    flavour: 'Du hörst ein Cover. Wer hat\'s zuerst gemacht? Könnte alles sein.',
    gradient: ['#be185d', '#9333ea'],
  },
];

interface ModeSelectorProps {
  selectedModes: GameMode[];
  onChange: (modes: GameMode[]) => void;
}

export function ModeSelector({ selectedModes, onChange }: ModeSelectorProps) {
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
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest leading-none">Modi</p>
          <p className="text-[11px] font-black mt-0.5" style={{ color: 'var(--color-accent)' }}>
            {selectedModes.length} von {MODES.length} aktiv
          </p>
        </div>
        <button
          onClick={() => onChange(allSelected ? [MODES[0]!.id] : MODES.map(m => m.id))}
          className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          {allSelected ? 'Abwählen' : 'Alle wählen'}
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
              transition={{ delay: index * 0.04, type: 'spring', stiffness: 380, damping: 28 }}
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
                  borderColor: isSelected ? `${gradTo}bb` : 'rgba(255,255,255,0.07)',
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
                      {mode.title}
                    </p>
                    {isLast && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 opacity-50">
                        Pflicht
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] font-black italic mt-0.5 leading-tight transition-opacity duration-200"
                    style={{ opacity: isSelected ? 0.9 : 0.45 }}
                  >
                    {mode.tagline}
                  </p>
                  <p
                    className="text-[10px] mt-1 leading-snug transition-opacity duration-200"
                    style={{ opacity: isSelected ? 0.6 : 0.25 }}
                  >
                    {mode.flavour}
                  </p>
                </div>

                {/* Checkmark */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 20 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
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
