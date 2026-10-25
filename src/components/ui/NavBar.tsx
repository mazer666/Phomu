/**
 * NavBar
 *
 * Kompakte Navigationsleiste:
 * - Hauptleiste: Logo | Lobby | Browse | [⚙️]
 * - Einstellungs-Panel (auf/zu): Sprache, Theme, Admin-Link
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
  PHOMU_CONFIG,
  type Language,
  type ThemeName,
} from '@/config/game-config';
import { THEME_COLORS, THEME_LABEL_KEYS } from '@/config/themes';

const NAV_LINKS = [
  { href: '/lobby', labelKey: 'ui.nav.lobby' },
  { href: '/browse', labelKey: 'ui.nav.browse' },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const currentLang = i18n.language as Language;

  // Dokumenttitel und <html lang> an die aktive Sprache koppeln.
  // Der Static Export backt nur eine Sprache in den <head>; der Client hält
  // beides synchron zur gewählten Sprache.
  useEffect(() => {
    const applyLanguage = (lng: string) => {
      const fixedT = i18n.getFixedT(lng);
      document.title = `${fixedT('app.title')} – ${fixedT('app.subtitle')}`;
      document.documentElement.lang = lng;
    };

    applyLanguage(i18n.language);
    i18n.on('languageChanged', applyLanguage);
    return () => {
      i18n.off('languageChanged', applyLanguage);
    };
  }, [i18n]);

  return (
    <div
      className="sticky top-0 z-40"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* ── Hauptleiste ─────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-black tracking-tight shrink-0 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-primary)' }}
        >
          🎵 {t('common.appName')}
        </Link>

        {/* Seiten-Links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, labelKey }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isActive
                    ? 'var(--color-accent)33'
                    : 'transparent',
                  color: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>

        {/* Einstellungen-Button */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors"
          style={{
            backgroundColor: settingsOpen
              ? 'var(--color-accent)33'
              : 'var(--color-bg-card)',
            color: settingsOpen
              ? 'var(--color-accent)'
              : 'var(--color-text-secondary)',
          }}
          aria-label={t('common.settings')}
          aria-expanded={settingsOpen}
        >
          ⚙️
        </button>
      </div>

      {/* ── Einstellungs-Panel ───────────────────────────── */}
      {settingsOpen && (
        <div
          className="px-4 py-3 border-b flex flex-wrap items-center gap-4"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Sprache */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase opacity-50 tracking-wider">
              {t('common.language')}
            </span>
            <div
              className="flex overflow-hidden rounded-lg"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {PHOMU_CONFIG.SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className="px-3 py-1 text-sm font-bold transition-colors"
                  style={{
                    backgroundColor:
                      currentLang === lang
                        ? 'var(--color-primary)'
                        : 'transparent',
                    color:
                      currentLang === lang
                        ? '#fff'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase opacity-50 tracking-wider">
              {t('common.theme')}
            </span>
            <div className="flex gap-1.5">
              {PHOMU_CONFIG.AVAILABLE_THEMES.map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  title={t(THEME_LABEL_KEYS[themeName])}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    backgroundColor: THEME_COLORS[themeName],
                    border:
                      theme === themeName
                        ? '2px solid var(--color-text)'
                        : '2px solid transparent',
                    transform: theme === themeName ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Admin */}
          <Link
            href="/admin/songs"
            onClick={() => setSettingsOpen(false)}
            className="text-xs font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity ml-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ⚙ {t('ui.nav.admin')}
          </Link>
        </div>
      )}
    </div>
  );
}
