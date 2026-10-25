/**
 * Typisierte Übersetzungsschlüssel
 *
 * Durch diese Deklaration kennt TypeScript alle Schlüssel aus
 * `src/i18n/locales/de.json`. Ein Tippfehler in `t('game.doesNotExist')`
 * wird dadurch beim Compile zum Fehler statt erst zur Laufzeit — und die
 * Autovervollständigung funktioniert.
 *
 * Die Datei muss einmal importiert werden; das passiert in
 * `src/i18n/config.ts`.
 */
import 'i18next';

import type translation from './locales/de.json';

/**
 * Wandelt einen verschachtelten Ressourcenbaum in die flache Liste der
 * Punktpfade um, so wie i18next sie zur Laufzeit auflöst.
 *
 * `typeof translation` ist `{ game: { reveal: { label: string } } }`;
 * daraus wird `"game" | "game.reveal" | "game.reveal.label"`.
 */
export type FlatTranslationKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${FlatTranslationKey<T[K]>}`
      : K;
}[keyof T & string];

/** Jeder gültige Schlüssel der Übersetzung, als Punktpfad. */
export type TranslationKey = FlatTranslationKey<typeof translation>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof translation;
    };
  }
}
