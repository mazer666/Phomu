/**
 * PlayerCard
 *
 * Displays a single player in the lobby overview.
 * Contains name, emoji avatar, colour, pilot badge and a remove button.
 */
'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/art/Icon';
import { PlayerSticker } from '@/components/art/PlayerSticker';

interface PlayerCardProps {
  name: string;
  /** The kind of the sticker of the player, e.g. 'guitar' */
  avatar?: string;
  /** Hex colour for visual distinction, e.g. '#FF6B35' */
  color?: string;
  /** Whether this player currently is the pilot (game master) */
  isPilot: boolean;
  /** Called when the player clicks the remove button */
  onRemove: () => void;
}

export function PlayerCard({
  name,
  avatar,
  color,
  isPilot,
  onRemove,
}: PlayerCardProps) {
  const { t } = useTranslation();

  // Semi-transparent variants of the player colour for background and border
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
      {/* Avatar circle */}
      <div
        className="text-2xl w-10 h-10 rounded-full flex items-center justify-center shrink-0 select-none"
        style={{ backgroundColor: avatarBg }}
        aria-hidden
      >
        <PlayerSticker kind={avatar} color={color} size={34} />
      </div>

      {/* Name + pilot badge */}
      <div className="flex-1 min-w-0">
        <p
          className="font-bold truncate leading-tight"
          style={{ color: color ?? 'var(--color-text)' }}
        >
          {name}
        </p>
        {isPilot && (
          <span className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
            <Icon name="controller" size={14} /> <span>{t('lobby.player.pilot')}</span>
          </span>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="shrink-0 w-11 h-11 flex items-center justify-center text-lg rounded-xl
                   text-red-400 hover:text-red-300 hover:bg-red-400/20 active:scale-90 transition-all"
        aria-label={t('lobby.player.removeAria', { name })}
        title={t('lobby.player.removeAria', { name })}
      >
        ✕
      </button>
    </motion.div>
  );
}
