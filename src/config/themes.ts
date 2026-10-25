/**
 * Theme constants
 *
 * The values that are **needed in several places** live here: the accent
 * colour of every theme and the translation key of its display name. The
 * colours used to be duplicated in `NavBar.tsx` and `ThemeSwitcher.tsx` —
 * two truths for one colour.
 *
 * `src/config/game-config.ts` remains the source for the *list* of themes
 * (`AVAILABLE_THEMES`) and the default theme. This file adds the data that
 * belongs to each theme.
 */
import type { ThemeName } from './game-config';
import type { TranslationKey } from '@/i18n/types';

/** Accent colour per theme. */
export const THEME_COLORS: Record<ThemeName, string> = {
  jackbox: '#ff6b35',
  spotify: '#1db954',
  youtube: '#ff0000',
  musicwall: '#fe2c55',
};

/** Translation key of the display name per theme. */
export const THEME_LABEL_KEYS: Record<ThemeName, TranslationKey> = {
  jackbox: 'themes.jackbox',
  spotify: 'themes.spotify',
  youtube: 'themes.youtube',
  musicwall: 'themes.musicwall',
};
