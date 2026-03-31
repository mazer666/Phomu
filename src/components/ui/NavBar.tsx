/**
 * NavBar
 *
 * Globale Navigationsleiste für alle Nicht-Spiel-Seiten.
 * Links: Logo → Home, Browse, Admin
 * Rechts: ThemeSwitcher, LanguageSwitcher
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';

const NAV_LINKS = [
  { href: '/lobby',       label: '🎮 Lobby'  },
  { href: '/browse',      label: '🎵 Browse' },
  { href: '/admin/songs', label: '⚙️ Admin'  },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-40 flex items-center gap-3 px-4 py-2 border-b"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="text-xl font-black mr-2 tracking-tight hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-primary)' }}
      >
        🎵 Phomu
      </Link>

      {/* Seiten-Links */}
      <div className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--color-accent)' + '33' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Theme + Sprache — ThemeSwitcher hidden on mobile (too wide) */}
      <div className="flex items-center gap-2 shrink-0">
        <LanguageSwitcher />
        <span className="hidden md:contents">
          <ThemeSwitcher />
        </span>
      </div>
    </nav>
  );
}
