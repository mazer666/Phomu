/**
 * The sticker of a player.
 *
 * WHAT: the mark that stands for a player — a round sticker in the colour
 * of the player with the symbol of the instrument that belongs to it.
 *
 * WHY a sticker and not an emoji: the emoji of a player is the property of
 * the system of the phone — it looks different on every device and it
 * cannot carry the colour of the player. The sticker belongs to the game.
 *
 * WHY the kind and not the picture: the kind is stored with the player, so
 * the sticker of a player is the same in the lobby, in the game and in the
 * result. The colour comes from the player.
 *
 * EXAMPLE: `<PlayerSticker kind="guitar" color="#FF6B35" size={32} />`
 */
'use client';

/** The kinds of the stickers of the players. */
export const PLAYER_STICKER_KINDS = [
  'note',
  'guitar',
  'drum',
  'mic',
  'headphone',
  'star',
  'disc',
  'trumpet',
] as const;

/** The kind of a sticker. */
export type PlayerStickerKind = (typeof PLAYER_STICKER_KINDS)[number];

/** The props of the sticker of a player. */
export interface PlayerStickerProps {
  /**
   * The kind of the sticker.
   *
   * WHY the fallback: the state of an old game holds the emoji of the
   * player. An unknown kind falls back to the note — the game starts with
   * a player that has a mark, even from an old save.
   */
  kind?: string;
  /** The colour of the player. */
  color?: string;
  /** The width and the height in pixels. */
  size?: number;
  /** The classes of the sticker. */
  className?: string;
}

/**
 * The sticker of a player.
 *
 * @param props - The props of the sticker
 * @returns The sticker of the player
 */
export function PlayerSticker({
  kind = 'note',
  color = '#FF6B35',
  size = 28,
  className = '',
}: PlayerStickerProps) {
  const bekannt = (PLAYER_STICKER_KINDS as readonly string[]).includes(kind);
  const art = bekannt ? kind : 'note';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        boxShadow: `0 2px 10px ${color}55`,
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0b0b0f"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art === 'note' && (
          <>
            <path d="M9 18V6l10-2v12" />
            <circle cx="6.5" cy="18" r="2.6" fill="#0b0b0f" stroke="none" />
            <circle cx="16.5" cy="16" r="2.6" fill="#0b0b0f" stroke="none" />
          </>
        )}
        {art === 'guitar' && (
          <>
            <path d="M14.5 4.5 19.5 9.5" />
            <path d="M16 3 21 8" />
            <path d="M13 6c-3 1-4.5 3.5-4 6.5.4 2.4 2 4 4.2 4.3 3 .4 5.6-1.6 6.4-4.6.6-2-.4-4.5-2.4-5.8z" />
            <circle cx="13.5" cy="12" r="1.6" fill="#0b0b0f" stroke="none" />
          </>
        )}
        {art === 'drum' && (
          <>
            <path d="M4 10h16l-2 9H6z" />
            <path d="M4 10 6 4h12l2 6" />
            <path d="M9 4 8 2M15 4l1-2" />
          </>
        )}
        {art === 'mic' && (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M6 11a6 6 0 0 0 12 0" />
            <path d="M12 17v4M9 21h6" />
          </>
        )}
        {art === 'headphone' && (
          <>
            <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
            <rect x="3" y="13" width="4" height="7" rx="2" />
            <rect x="17" y="13" width="4" height="7" rx="2" />
          </>
        )}
        {art === 'star' && (
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        )}
        {art === 'disc' && (
          <>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.6" fill="#0b0b0f" stroke="none" />
          </>
        )}
        {art === 'trumpet' && (
          <>
            <path d="M3 10h11v4H3z" />
            <path d="M14 12h4l3-3v6l-3-3" />
            <path d="M6 14v4h4" />
          </>
        )}
      </svg>
    </span>
  );
}
