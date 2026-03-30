/**
 * PlayerCard
 *
 * Zeigt einen einzelnen Spieler in der Lobby-Übersicht.
 * Enthält Name, Emoji-Avatar, Farbe, Pilot-Badge und einen Entfernen-Button.
 */
'use client';

import { motion } from 'framer-motion';

interface PlayerCardProps {
  name: string;
  /** Emoji-Avatar des Spielers, z. B. '🎸' */
  avatar?: string;
  /** Hex-Farbe für die visuelle Unterscheidung, z. B. '#FF6B35' */
  color?: string;
  /** Ob dieser Spieler gerade der Pilot (Spielleiter) ist */
  isPilot: boolean;
  /** Wird aufgerufen, wenn der Spieler auf den Entfernen-Button klickt */
  onRemove: () => void;
}

export function PlayerCard({ name, avatar, color, isPilot, onRemove }: PlayerCardProps) {
  // Halbtransparente Varianten der Spielerfarbe für Hintergrund und Rahmen
  const borderColor = color ? `${color}55` : 'rgba(255,255,255,0.2)';
  const bgColor = color ? `${color}1a` : 'rgba(255,255,255,0.07)';
  const avatarBg = color ? `${color}33` : 'rgba(255,255,255,0.15)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative flex items-center gap-3 rounded-xl p-3 border"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      {/* Avatar-Kreis */}
      <div
        className="text-2xl w-10 h-10 rounded-full flex items-center justify-center shrink-0 select-none"
        style={{ backgroundColor: avatarBg }}
        aria-hidden
      >
        {avatar ?? '🎵'}
      </div>

      {/* Name + Pilot-Badge */}
      <div className="flex-1 min-w-0">
        <p
          className="font-bold truncate leading-tight"
          style={{ color: color ?? 'var(--color-text)' }}
        >
          {name}
        </p>
        {isPilot && (
          <span className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
            🎮 <span>Pilot</span>
          </span>
        )}
      </div>

      {/* Entfernen-Button */}
      <button
        onClick={onRemove}
        className="shrink-0 w-7 h-7 flex items-center justify-center text-sm rounded-lg
                   text-red-400 hover:text-red-300 hover:bg-red-400/20 transition-colors"
        aria-label={`${name} entfernen`}
        title={`${name} entfernen`}
      >
        ✕
      </button>
    </motion.div>
  );
}
