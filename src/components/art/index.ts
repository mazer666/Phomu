/**
 * The graphics of the game.
 *
 * WHAT: the pictures of the modes, the symbols of the interface and the
 * stickers of the players — the drawings that belong to the product.
 *
 * WHY a barrel: the places that draw them need more than one of them, and
 * the import stays one line. The drawings themselves live in their own
 * files — they are big enough to deserve it.
 *
 * EXAMPLE: `import { Icon, ModeArt } from '@/components/art';`
 */
export { Icon, type IconName, type IconProps } from './Icon';
export { ModeArt, modeArtVariant, type ModeArtProps, type ModeArtVariant } from './ModeArt';
export {
  PlayerSticker,
  PLAYER_STICKER_KINDS,
  type PlayerStickerKind,
  type PlayerStickerProps,
} from './PlayerSticker';
