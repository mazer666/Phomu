'use client';

import { motion } from 'framer-motion';
import { PHOMU_CONFIG } from '@/config/game-config';

interface PackSelectorProps {
  selectedPacks: string[];
  onChange: (packs: string[]) => void;
}

export function PackSelector({ selectedPacks, onChange }: PackSelectorProps) {
  const allPacks = PHOMU_CONFIG.SONG_PACKS;

  const togglePack = (packId: string) => {
    if (selectedPacks.includes(packId)) {
      if (selectedPacks.length === 1) return; // Mindestens ein Pack muss gewählt sein
      onChange(selectedPacks.filter((id) => id !== packId));
    } else {
      onChange([...selectedPacks, packId]);
    }
  };

  const selectAll = () => {
    onChange(allPacks.map(p => p.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest leading-none">Packs</p>
          <p className="text-[10px] font-bold text-[var(--color-accent)] uppercase">Alle {allPacks.length} Packs verfügbar</p>
        </div>
        <button
          onClick={selectAll}
          className="text-[10px] font-black uppercase underline decoration-[var(--color-accent)] opacity-60 hover:opacity-100"
        >
          Alle wählen
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto px-1 pb-4 custom-scrollbar">
        {allPacks.map((pack, index) => {
          const isSelected = selectedPacks.includes(pack.id);
          
          return (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => togglePack(pack.id)}
              className={`
                relative p-4 rounded-2xl border-2 text-left transition-all h-24 flex flex-col justify-between overflow-hidden
                ${isSelected 
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' 
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }
              `}
            >
              <div className="z-10">
                <p className="text-[11px] font-black uppercase leading-tight line-clamp-2">
                  {pack.name}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg">
                  ✓
                </div>
              )}
              
              <div className="absolute -bottom-4 -right-4 text-4xl opacity-5 pointer-events-none italic font-black">
                {index + 1}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 justify-center bg-white/5 py-2 rounded-xl border border-white/5">
         <span className="animate-pulse">✨</span>
         <p className="text-[9px] opacity-50 font-black uppercase tracking-wider">
           Über 1.000 Songs bereit zum Spielen
         </p>
      </div>
    </div>
  );
}
