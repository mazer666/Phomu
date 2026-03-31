/**
 * ModeSelector
 *
 * Multi-Select-Komponente für die 5 Phomu-Spielmodi.
 * Jeder Modus wird mit Icon, Titel und Kurzbeschreibung angezeigt.
 * Mindestens ein Modus muss immer aktiv bleiben.
 */
'use client';

import { motion } from 'framer-motion';
import type { GameMode } from '@/config/game-config';

// ─── Modus-Metadaten ──────────────────────────────────────────────

interface ModeInfo {
  id: GameMode;
  icon: string;
  title: string;
  description: string;
}

/** Beschreibungen für alle 5 Spielmodi auf Deutsch */
const MODES: ModeInfo[] = [
  {
    id: 'timeline',
    icon: '📅',
    title: 'Chronologische Timeline',
    description:
      'Sortiere Songs nach ihrem Erscheinungsjahr. Wer die perfekteste Zeitlinie baut, gewinnt!',
  },
  {
    id: 'hint-master',
    icon: '🕵️',
    title: 'Hint-Master',
    description:
      'Erkenne den Song anhand von bis zu 5 Hinweisen. Je früher du rätst, desto mehr Punkte!',
  },
  {
    id: 'lyrics',
    icon: '📝',
    title: 'Lyrics Labyrinth',
    description:
      'Welcher Liedtext ist echt, welcher ist frei erfunden? Entlarve die falschen Lyrics!',
  },
  {
    id: 'vibe-check',
    icon: '😎',
    title: 'Vibe-Check',
    description:
      'Ordne jeden Song einer Stimmung zu — Punkte gibt es, wenn ihr alle gleich fühlt.',
  },
  {
    id: 'survivor',
    icon: '🏆',
    title: 'Survivor',
    description:
      'One-Hit-Wonder oder Dauerstar? Erkenne, ob ein Artist nur diesen einen Hit hatte.',
  },
  {
    id: 'cover-confusion',
    icon: '🎭',
    title: 'Cover Confusion',
    description:
      'Hör einen Cover-Song und errate den Original-Interpreten — mit oder ohne Hinweise.',
  },
];

// ─── Props ────────────────────────────────────────────────────────

interface ModeSelectorProps {
  /** Aktuell ausgewählte Modi */
  selectedModes: GameMode[];
  /** Wird aufgerufen, wenn sich die Auswahl ändert */
  onChange: (modes: GameMode[]) => void;
}

// ─── Komponente ───────────────────────────────────────────────────

export function ModeSelector({ selectedModes, onChange }: ModeSelectorProps) {
  function toggleMode(modeId: GameMode) {
    if (selectedModes.includes(modeId)) {
      // Letzten aktiven Modus nicht abwählen
      if (selectedModes.length === 1) return;
      onChange(selectedModes.filter((m) => m !== modeId));
    } else {
      onChange([...selectedModes, modeId]);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {MODES.map((mode) => {
        const isSelected = selectedModes.includes(mode.id);

        return (
          <motion.button
            key={mode.id}
            onClick={() => toggleMode(mode.id)}
            whileTap={{ scale: 0.97 }}
            className={[
              'text-left p-4 rounded-xl border-2 transition-colors',
              isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)]/50 hover:border-white/40 hover:bg-white/10',
            ].join(' ')}
            aria-pressed={isSelected}
          >
            {/* Icon + Titel */}
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5" aria-hidden>
                {mode.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">{mode.title}</p>
                <p className="text-xs opacity-60 mt-1 leading-snug">{mode.description}</p>
              </div>
            </div>

            {/* Aktiv-Badge */}
            {isSelected && (
              <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">
                ✓ Aktiv
              </p>
            )}

            {/* Hinweis: letzter Modus kann nicht deaktiviert werden */}
            {isSelected && selectedModes.length === 1 && (
              <p className="mt-1 text-xs opacity-40">Mindestens ein Modus erforderlich</p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
