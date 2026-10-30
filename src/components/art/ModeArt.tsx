/**
 * The picture of a game mode.
 *
 * WHAT: the illustration that stands for one of the six modes — in the
 * lobby, in the drawing phase and in the guide.
 *
 * WHY a picture and not an emoji: an emoji is the same on every device, it
 * belongs to the system of the phone and not to the game, and it cannot
 * carry the colour of the mode. The picture belongs to the product, it is
 * drawn in the colours of the mode, and it has variants — so the lobby
 * does not look the same every time.
 *
 * WHY the variants: a party plays many games. The picture of a mode
 * changes from game to game, so the selection keeps a little surprise
 * without ever flickering during a game.
 *
 * EXAMPLE: `<ModeArt mode="timeline" variant={2} size={48} />`
 */
'use client';

import type { GameMode } from '@/config/game-config';

/** The variants of the picture of a mode. */
export type ModeArtVariant = 1 | 2 | 3;

/** The props of the picture of a mode. */
export interface ModeArtProps {
  /** The mode the picture stands for. */
  mode: GameMode;
  /** The variant of the picture. */
  variant?: ModeArtVariant;
  /** The width and the height of the picture in pixels. */
  size?: number;
  /** The classes of the picture. */
  className?: string;
}

/**
 * The variant of the picture of a mode.
 *
 * WHY the seed: the picture has to stay the same during a game — a
 * picture that changes under the finger of the player is a picture that
 * was not there. The seed of the session changes with every game, and with
 * it the picture.
 *
 * @param mode - The mode the picture stands for
 * @param seed - The seed of the session
 * @returns The variant of the picture
 */
export function modeArtVariant(
  mode: GameMode,
  seed: string
): ModeArtVariant {
  let hash = 2166136261;
  for (const zeichen of `${seed}:${mode}`) {
    hash ^= zeichen.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return ((hash % 3) + 1) as ModeArtVariant;
}

/**
 * The picture of a game mode.
 *
 * @param props - The props of the picture
 * @returns The picture of the mode
 */
export function ModeArt({
  mode,
  variant = 1,
  size = 48,
  className = '',
}: ModeArtProps) {
  return (
    // WHY the empty text: the picture stands next to the name of the mode —
    // it repeats what the text already says.
    <img
      src={`/art/modes/${mode}-${variant}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`object-contain select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
    />
  );
}
