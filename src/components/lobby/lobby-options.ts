/**
 * The options of the lobby.
 *
 * WHAT: the tables of the lobby — the avatars, the colours, the difficulty,
 * the time limit, the team modes and the list of the game modes.
 *
 * WHY the tables live in their own file: the lobby page is a known legacy
 * file above the soft limit of the file size gate, and the orientation work
 * has to stay inside the recorded state. The tables are data, not layout —
 * they belong next to each other.
 *
 * WHY the list of the modes is here and not in the selector: the selector
 * draws the modes and the preview of the lobby names them. Both read the
 * same table, so a mode cannot have two names.
 *
 * EXAMPLE: `import { LOBBY_MODES } from '@/components/lobby/lobby-options';`
 */
import type { GameMode } from '@/config/game-config';
import type { TranslationKey } from '@/i18n/types';
import type { TeamMode } from '@/types/player';

/**
 * The stickers that are handed out to the players.
 *
 * WHY a kind and not a picture: the kind is stored with the player, so the
 * sticker of a player is the same in the lobby, in the game and in the
 * result. The picture is drawn from the kind and the colour of the player.
 */
export const PLAYER_STICKERS = [
  'note',
  'guitar',
  'drum',
  'mic',
  'headphone',
  'star',
  'disc',
  'trumpet',
] as const;

/** The colours that are handed out to the players. */
export const PLAYER_COLORS = [
  '#FF6B35',
  '#FFD166',
  '#06D6A0',
  '#118AB2',
  '#EF476F',
  '#9B5DE5',
  '#00BBF9',
] as const;

/** The difficulties of the catalogue. */
export const DIFFICULTY_OPTIONS = [
  {
    value: 'all',
    labelKey: 'common.all',
    subKey: 'lobby.difficulty.allSub',
    icon: 'difficulty-all',
  },
  {
    value: 'easy',
    labelKey: 'lobby.difficulty.easyLabel',
    subKey: 'lobby.difficulty.easySub',
    icon: 'difficulty-easy',
  },
  {
    value: 'medium',
    labelKey: 'lobby.difficulty.mediumLabel',
    subKey: 'lobby.difficulty.mediumSub',
    icon: 'difficulty-medium',
  },
  {
    value: 'hard',
    labelKey: 'lobby.difficulty.hardLabel',
    subKey: 'lobby.difficulty.hardSub',
    icon: 'difficulty-hard',
  },
] as const;

/** The time limits of a round. */
export const TIME_LIMIT_OPTIONS = [
  { value: null, unit: 'none', subKey: 'lobby.timeLimit.noLimitSub' },
  { value: 30, unit: 'seconds', subKey: 'lobby.timeLimit.turboSub' },
  { value: 60, unit: 'seconds', subKey: 'lobby.timeLimit.normalSub' },
  { value: 120, unit: 'minutes', subKey: 'lobby.timeLimit.cozySub' },
] as const;

/** The ways the players can be organized. */
export const TEAM_MODE_OPTIONS = [
  {
    value: 'individual',
    labelKey: 'lobby.teamMode.individualLabel',
    descriptionKey: 'lobby.teamMode.individualDescription',
  },
  {
    value: 'fixed',
    labelKey: 'lobby.teamMode.fixedLabel',
    descriptionKey: 'lobby.teamMode.fixedDescription',
  },
  {
    value: 'shifting',
    labelKey: 'lobby.teamMode.shiftingLabel',
    descriptionKey: 'lobby.teamMode.shiftingDescription',
  },
] as const satisfies readonly {
  value: TeamMode;
  labelKey: string;
  descriptionKey: string;
}[];

/** Keys of the funny team names — the visible text comes from the translation. */
export const FUNNY_NAME_KEYS = [
  'lobby.team.funnyName1',
  'lobby.team.funnyName2',
  'lobby.team.funnyName3',
  'lobby.team.funnyName4',
  'lobby.team.funnyName5',
  'lobby.team.funnyName6',
  'lobby.team.funnyName7',
  'lobby.team.funnyName8',
  'lobby.team.funnyName9',
  'lobby.team.funnyName10',
  'lobby.team.funnyName11',
  'lobby.team.funnyName12',
  'lobby.team.funnyName13',
  'lobby.team.funnyName14',
  'lobby.team.funnyName15',
  'lobby.team.funnyName16',
  'lobby.team.funnyName17',
  'lobby.team.funnyName18',
  'lobby.team.funnyName19',
  'lobby.team.funnyName20',
  'lobby.team.funnyName21',
  'lobby.team.funnyName22',
  'lobby.team.funnyName23',
  'lobby.team.funnyName24',
] as const;

/** The colours of the teams that the lobby offers. */
export const CURATED_TEAM_COLORS = [
  { name: 'Phomu Blue', value: '#118AB2' },
  { name: 'Neon Purple', value: '#9B5DE5' },
  { name: 'Emerald', value: '#06D6A0' },
  { name: 'Sunset', value: '#FF6B35' },
  { name: 'Cyber Pink', value: '#EF476F' },
  { name: 'Gold Rush', value: '#FFD166' },
] as const;

/** The list of the game modes with their texts and their colours. */
export const LOBBY_MODES = [
  {
    id: 'timeline',
    titleKey: 'lobby.mode.timelineTitle',
    taglineKey: 'lobby.mode.timelineTagline',
    flavourKey: 'lobby.mode.timelineFlavour',
    gradient: ['#0891b2', '#2563eb'],
  },
  {
    id: 'hint-master',
    titleKey: 'lobby.mode.hintMasterTitle',
    taglineKey: 'lobby.mode.hintMasterTagline',
    flavourKey: 'lobby.mode.hintMasterFlavour',
    gradient: ['#7c3aed', '#db2777'],
  },
  {
    id: 'lyrics',
    titleKey: 'lobby.mode.lyricsTitle',
    taglineKey: 'lobby.mode.lyricsTagline',
    flavourKey: 'lobby.mode.lyricsFlavour',
    gradient: ['#dc2626', '#ea580c'],
  },
  {
    id: 'vibe-check',
    titleKey: 'lobby.mode.vibeCheckTitle',
    taglineKey: 'lobby.mode.vibeCheckTagline',
    flavourKey: 'lobby.mode.vibeCheckFlavour',
    gradient: ['#059669', '#0d9488'],
  },
  {
    id: 'survivor',
    titleKey: 'lobby.mode.survivorTitle',
    taglineKey: 'lobby.mode.survivorTagline',
    flavourKey: 'lobby.mode.survivorFlavour',
    gradient: ['#b45309', '#d97706'],
  },
  {
    id: 'cover-confusion',
    titleKey: 'lobby.mode.coverConfusionTitle',
    taglineKey: 'lobby.mode.coverConfusionTagline',
    flavourKey: 'lobby.mode.coverConfusionFlavour',
    gradient: ['#be185d', '#9333ea'],
  },
] as const satisfies readonly {
  id: GameMode;
  titleKey: TranslationKey;
  taglineKey: TranslationKey;
  flavourKey: TranslationKey;
  gradient: readonly [string, string];
}[];
