/**
 * Theme-Konstanten
 *
 * Hier stehen die Werte, die **an mehreren Stellen** gebraucht werden:
 * die Akzentfarbe jedes Themes und der Übersetzungsschlüssel seines
 * Anzeigenamens. Vorher standen die Farben in `NavBar.tsx` und
 * `ThemeSwitcher.tsx` doppelt — zwei Wahrheiten für eine Farbe.
 *
 * `src/config/game-config.ts` bleibt die Quelle für die *Liste* der Themes
 * (`AVAILABLE_THEMES`) und das Standardtheme. Diese Datei ergänzt die
 * Angaben, die zu jedem Theme dazugehören.
 */
import type { ThemeName } from './game-config';
import type { TranslationKey } from '@/i18n/types';

/** Akzentfarbe je Theme. */
export const THEME_COLORS: Record<ThemeName, string> = {
  jackbox: '#ff6b35',
  spotify: '#1db954',
  youtube: '#ff0000',
  musicwall: '#fe2c55',
};

/** Übersetzungsschlüssel des Anzeigenamens je Theme. */
export const THEME_LABEL_KEYS: Record<ThemeName, TranslationKey> = {
  jackbox: 'themes.jackbox',
  spotify: 'themes.spotify',
  youtube: 'themes.youtube',
  musicwall: 'themes.musicwall',
};
