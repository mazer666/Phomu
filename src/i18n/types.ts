/**
 * Typed translation keys
 *
 * With this declaration TypeScript knows every key of
 * `src/i18n/locales/de.json`. A typo in `t('game.doesNotExist')` therefore
 * becomes a compile error instead of a runtime problem — and autocompletion
 * works.
 *
 * The file has to be imported once; that happens in `src/i18n/config.ts`.
 */
import 'i18next';

import type translation from './locales/de.json';

/**
 * Turns a nested resource tree into the flat list of dot paths, the way
 * i18next resolves them at runtime.
 *
 * `typeof translation` is `{ game: { reveal: { label: string } } }`;
 * from that it becomes `"game" | "game.reveal" | "game.reveal.label"`.
 */
export type FlatTranslationKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${FlatTranslationKey<T[K]>}`
      : K;
}[keyof T & string];

/** Every valid key of the translation, as a dot path. */
export type TranslationKey = FlatTranslationKey<typeof translation>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof translation;
    };
  }
}
