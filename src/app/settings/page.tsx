'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/profile',
    titleKey: 'settings.sections.profileTitle',
    descriptionKey: 'settings.sections.profileDescription',
    emoji: '👥',
  },
  {
    href: '/settings/audio',
    titleKey: 'settings.sections.audioTitle',
    descriptionKey: 'settings.sections.audioDescription',
    emoji: '🔊',
  },
  {
    href: '/settings/governance',
    titleKey: 'settings.sections.governanceTitle',
    descriptionKey: 'settings.sections.governanceDescription',
    emoji: '🧠',
  },
  {
    href: '/settings/account',
    titleKey: 'settings.sections.legalTitle',
    descriptionKey: 'settings.sections.legalDescription',
    emoji: '📄',
  },
  {
    href: '/guide',
    titleKey: 'settings.sections.guideTitle',
    descriptionKey: 'settings.sections.guideDescription',
    emoji: '🧭',
  },
] as const;

export default function SettingsHubPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { totalXP, players, currentRound } = useGameStore();
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const gameIsActive = currentRound > 0;

  // Zahlen werden lokalisiert formatiert (Intl, aktive Sprache)
  const numberFormat = new Intl.NumberFormat(i18n.language);

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-4 md:p-10 space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">⚙️ {t('common.settings')}</h1>
          <p className="text-xs uppercase tracking-widest opacity-60 font-bold mt-1">
            {t('settings.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {gameIsActive && (
            <button
              onClick={() => router.push('/game')}
              className="px-6 py-3 rounded-2xl bg-[var(--color-accent)] text-white font-black text-sm"
            >
              {t('settings.backToGame')}
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-2xl border border-white/15 text-white font-black text-sm hover:bg-white/5"
          >
            {t('common.back')}
          </button>
        </div>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <StatCard
          label={t('common.player')}
          value={numberFormat.format(players.length)}
        />
        <StatCard
          label={t('settings.statXp')}
          value={numberFormat.format(totalXP)}
        />
        <StatCard
          label={t('settings.statLevel')}
          value={numberFormat.format(currentLevel)}
        />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
          >
            <p className="text-2xl mb-3">{section.emoji}</p>
            <h2 className="text-lg font-black">{t(section.titleKey)}</h2>
            <p className="text-sm opacity-70 mt-1">
              {t(section.descriptionKey)}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-widest font-black opacity-50">
        {label}
      </p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}
