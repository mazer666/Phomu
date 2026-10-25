'use client';

/**
 * ThemeSwitcher Component
 *
 * A row of buttons that lets the user switch between the 4 Phomu themes.
 * The active theme gets a highlighted border.
 */
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { PHOMU_CONFIG, type ThemeName } from '@/config/game-config';

/** Color dots representing each theme's primary color */
const THEME_COLORS: Record<ThemeName, string> = {
  jackbox: '#ff6b35',
  spotify: '#1db954',
  youtube: '#ff0000',
  musicwall: '#fe2c55',
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {t('settings.theme')}
      </span>
      <div className="flex gap-2">
        {PHOMU_CONFIG.AVAILABLE_THEMES.map((themeName) => (
          <button
            key={themeName}
            onClick={() => setTheme(themeName)}
            title={t(`themes.${themeName}`)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
            style={{
              backgroundColor: THEME_COLORS[themeName],
              border:
                theme === themeName
                  ? '3px solid var(--color-text)'
                  : '3px solid transparent',
              transform: theme === themeName ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={t(`themes.${themeName}`)}
            aria-pressed={theme === themeName}
          />
        ))}
      </div>
    </div>
  );
}
