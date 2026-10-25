'use client';

/**
 * Sets the `lang` attribute of the HTML document to the active language.
 *
 * Why this is necessary: `src/app/layout.tsx` renders on the server, and the
 * server does not know the language chosen in the browser. Without this
 * attribute `document.documentElement.lang` keeps the server value — then
 * screen readers read the German interface with an English pronunciation, and
 * the automatic language detection of the browser does not kick in.
 *
 * Example:
 *   <LanguageHtmlAttribute />
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageHtmlAttribute() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;
  }, [i18n, i18n.resolvedLanguage, i18n.language]);

  return null;
}

export default LanguageHtmlAttribute;
