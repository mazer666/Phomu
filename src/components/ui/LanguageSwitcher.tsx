'use client';

/**
 * LanguageSwitcher Component
 *
 * Toggle between German (DE) and English (EN).
 * The active language is highlighted.
 */
import { useTranslation } from 'react-i18next';
import { PHOMU_CONFIG, type Language } from '@/config/game-config';

const LANGUAGE_LABELS: Record<Language, string> = {
  de: 'DE',
  en: 'EN',
};

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const currentLang = i18n.language as Language;

  return (
    <div className="flex items-center gap-3">
      <span
        className="hidden md:inline text-sm font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {t('settings.language')}
      </span>
      <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
        {PHOMU_CONFIG.SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className="px-3 py-1.5 text-sm font-bold transition-colors"
            style={{
              backgroundColor:
                currentLang === lang
                  ? 'var(--color-primary)'
                  : 'transparent',
              color:
                currentLang === lang
                  ? '#ffffff'
                  : 'var(--color-text-secondary)',
            }}
            aria-pressed={currentLang === lang}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
