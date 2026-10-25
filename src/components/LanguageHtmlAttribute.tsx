'use client';

/**
 * Setzt das `lang`-Attribut des HTML-Dokuments auf die aktive Sprache.
 *
 * Warum das nötig ist: `src/app/layout.tsx` rendert serverseitig, und der
 * Server kennt die im Browser gewählte Sprache nicht. Ohne dieses Attribut
 * bleibt `document.documentElement.lang` auf dem Serverwert stehen — dann
 * lesen Screenreader die deutsche Oberfläche mit englischer Aussprache vor,
 * und die automatische Spracherkennung des Browsers greift nicht.
 *
 * Beispiel:
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
