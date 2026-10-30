/**
 * The small symbols of the interface.
 *
 * WHAT: the symbols that stand next to a text — the note of the music, the
 * disc of the player, the code of the card, the dice of the broken song,
 * the difficulty of the catalogue and the markers of the players.
 *
 * WHY they are drawn and not borrowed: an emoji is the property of the
 * system of the phone — it looks different on every device, it ignores the
 * colours of the game, and it cannot be drawn in the colour of the mode.
 * These symbols belong to the product: they use the colours of the theme
 * and they look the same everywhere.
 *
 * WHY one file: the symbols are small, and they are used in many places.
 * Together they are easier to keep consistent than in the places that use
 * them.
 *
 * EXAMPLE: `<Icon name="note" size={18} />`
 */
'use client';

/** The symbols of the interface. */
export type IconName =
  | 'note'
  | 'disc'
  | 'qr'
  | 'camera'
  | 'dice'
  | 'gift'
  | 'trophy'
  | 'medal'
  | 'crown'
  | 'flag'
  | 'card'
  | 'ban'
  | 'refresh'
  | 'search'
  | 'lock'
  | 'unlock'
  | 'speaker'
  | 'controller'
  | 'users'
  | 'person'
  | 'magnifier'
  | 'document'
  | 'compass'
  | 'film'
  | 'globe'
  | 'star'
  | 'guitar'
  | 'sun'
  | 'heart'
  | 'brain'
  | 'difficulty-easy'
  | 'difficulty-medium'
  | 'difficulty-hard'
  | 'difficulty-all';

/** The props of a symbol. */
export interface IconProps {
  /** The symbol. */
  name: IconName;
  /** The width and the height in pixels. */
  size?: number;
  /** The colour of the symbol — the colour of the theme by default. */
  className?: string;
}

/**
 * A symbol of the interface.
 *
 * @param props - The props of the symbol
 * @returns The symbol
 */
export function Icon({ name, size = 18, className = '' }: IconProps) {
  const strich = {
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const zeichen = (() => {
    switch (name) {
      case 'note':
        return (
          <>
            <path d="M9 18V6l10-2v12" {...strich} />
            <circle cx="6.5" cy="18" r="3" fill="currentColor" />
            <circle cx="16.5" cy="16" r="3" fill="currentColor" />
          </>
        );
      case 'disc':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <circle cx="12" cy="12" r="2.6" fill="currentColor" />
          </>
        );
      case 'qr':
        return (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" {...strich} />
            <rect x="14" y="3" width="7" height="7" rx="1.5" {...strich} />
            <rect x="3" y="14" width="7" height="7" rx="1.5" {...strich} />
            <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h1M19 14h1" {...strich} />
          </>
        );
      case 'camera':
        return (
          <>
            <path
              d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.4-2h7.2L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"
              {...strich}
            />
            <circle cx="12" cy="13" r="3.6" {...strich} />
          </>
        );
      case 'dice':
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="4" {...strich} />
            <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
            <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </>
        );
      case 'gift':
        return (
          <>
            <rect x="3" y="9" width="18" height="11" rx="2" {...strich} />
            <path d="M3 13h18M12 9v11" {...strich} />
            <path d="M12 9c-3-6-8-4-6-1.5C7 9 9 9 12 9zM12 9c3-6 8-4 6-1.5C17 9 15 9 12 9z" {...strich} />
          </>
        );
      case 'trophy':
        return (
          <>
            <path d="M7 4h10v5a5 5 0 0 1-10 0z" {...strich} />
            <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" {...strich} />
            <path d="M12 14v4M8 21h8M10 18h4" {...strich} />
          </>
        );
      case 'medal':
        return (
          <>
            <circle cx="12" cy="15" r="6" {...strich} />
            <path d="m12 12 2 1.6-2 1.4-2-1.4z" fill="currentColor" />
            <path d="M8 9 5 3h4l3 5M16 9l3-6h-4l-3 5" {...strich} />
          </>
        );
      case 'crown':
        return (
          <path
            d="m4 8 3.5 3L12 5l4.5 6L20 8l-1.6 9H5.6z"
            {...strich}
          />
        );
      case 'flag':
        return (
          <>
            <path d="M6 21V4" {...strich} />
            <path d="M6 4h11l-2 3 2 3H6z" {...strich} />
          </>
        );
      case 'card':
        return (
          <>
            <rect x="4" y="4" width="16" height="16" rx="3" {...strich} />
            <path d="M8 9h8M8 13h5" {...strich} />
          </>
        );
      case 'ban':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="m5.6 5.6 12.8 12.8" {...strich} />
          </>
        );
      case 'refresh':
        return (
          <>
            <path d="M20 12a8 8 0 1 1-2.4-5.7" {...strich} />
            <path d="M20 4v4h-4" {...strich} />
          </>
        );
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="6.5" {...strich} />
            <path d="m16 16 4.5 4.5" {...strich} />
          </>
        );
      case 'lock':
        return (
          <>
            <rect x="5" y="10" width="14" height="10" rx="2.5" {...strich} />
            <path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...strich} />
          </>
        );
      case 'unlock':
        return (
          <>
            <rect x="5" y="10" width="14" height="10" rx="2.5" {...strich} />
            <path d="M8 10V7.5a4 4 0 0 1 7.5-2" {...strich} />
          </>
        );
      case 'speaker':
        return (
          <>
            <path d="M4 9h3l4-3v12l-4-3H4z" {...strich} />
            <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" {...strich} />
          </>
        );
      case 'controller':
        return (
          <>
            <rect x="3" y="8" width="18" height="9" rx="4.5" {...strich} />
            <path d="M7 11v3M5.5 12.5h3" {...strich} />
            <circle cx="16" cy="11.5" r="1.1" fill="currentColor" />
            <circle cx="18" cy="13.5" r="1.1" fill="currentColor" />
          </>
        );
      case 'users':
        return (
          <>
            <circle cx="9" cy="8" r="3.5" {...strich} />
            <path d="M3 20a6 6 0 0 1 12 0" {...strich} />
            <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M17 20a6 6 0 0 0-2-4.5" {...strich} />
          </>
        );
      case 'person':
        return (
          <>
            <circle cx="12" cy="8" r="4" {...strich} />
            <path d="M4 21a8 8 0 0 1 16 0" {...strich} />
          </>
        );
      case 'magnifier':
        return (
          <>
            <circle cx="11" cy="11" r="6.5" {...strich} />
            <path d="m16 16 4.5 4.5" {...strich} />
            <circle cx="11" cy="11" r="2" fill="currentColor" />
          </>
        );
      case 'document':
        return (
          <>
            <path d="M6 3h8l4 4v14H6z" {...strich} />
            <path d="M14 3v4h4M9 12h6M9 16h6" {...strich} />
          </>
        );
      case 'compass':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="m15 9-2 4-4 2 2-4z" {...strich} />
          </>
        );
      case 'film':
        return (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2.5" {...strich} />
            <path d="M8 5v14M16 5v14M3 12h18" {...strich} />
          </>
        );
      case 'guitar':
        return (
          <>
            <path d="M14.5 4.5 19.5 9.5" {...strich} />
            <path d="M16 3 21 8" {...strich} />
            <path d="M13 6c-3 1-4.5 3.5-4 6.5.4 2.4 2 4 4.2 4.3 3 .4 5.6-1.6 6.4-4.6.6-2-.4-4.5-2.4-5.8z" {...strich} />
            <circle cx="13.5" cy="12" r="1.6" fill="currentColor" />
          </>
        );
      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="4.5" {...strich} />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" {...strich} />
          </>
        );
      case 'heart':
        return (
          <path
            d="M12 20s-7-4.4-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6C19 15.6 12 20 12 20z"
            {...strich}
          />
        );
      case 'star':
        return (
          <path
            d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"
            {...strich}
          />
        );
      case 'globe':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" {...strich} />
          </>
        );
      case 'brain':
        return (
          <>
            <path
              d="M12 5a3 3 0 0 0-5.8-1A3 3 0 0 0 4 8a3 3 0 0 0 .5 5.5A3 3 0 0 0 9 19a3 3 0 0 0 3-1.5zM12 5a3 3 0 0 1 5.8-1A3 3 0 0 1 20 8a3 3 0 0 1-.5 5.5A3 3 0 0 1 15 19a3 3 0 0 1-3-1.5z"
              {...strich}
            />
          </>
        );
      case 'difficulty-all':
        return (
          <>
            <path d="M3 18a9 9 0 0 1 18 0z" {...strich} />
            <circle cx="12" cy="6" r="2.4" fill="currentColor" />
          </>
        );
      case 'difficulty-easy':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="M8 14c1.2 1.6 2.5 2.4 4 2.4S14.8 15.6 16 14" {...strich} />
            <circle cx="9" cy="9.5" r="1.3" fill="currentColor" />
            <circle cx="15" cy="9.5" r="1.3" fill="currentColor" />
          </>
        );
      case 'difficulty-medium':
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="M9 15h6" {...strich} />
            <circle cx="9" cy="9.5" r="1.3" fill="currentColor" />
            <circle cx="15" cy="9.5" r="1.3" fill="currentColor" />
          </>
        );
      default:
        return (
          <>
            <circle cx="12" cy="12" r="9" {...strich} />
            <path d="M9 15c1.2 1.6 2.5 2.4 4 2.4" {...strich} />
            <path d="M15 9.5h1.5" {...strich} />
            <circle cx="9" cy="9.5" r="1.3" fill="currentColor" />
          </>
        );
    }
  })();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {zeichen}
    </svg>
  );
}
