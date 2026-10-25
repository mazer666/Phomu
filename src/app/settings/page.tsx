'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/profile',
    title: 'Spieler & Profil',
    description: 'Namen, Avatare und Farben verwalten.',
    emoji: '👥',
  },
  {
    href: '/settings/audio',
    title: 'Audio & Provider',
    description: 'YouTube, Spotify, Amazon + Lautstärke.',
    emoji: '🔊',
  },
  {
    href: '/settings/governance',
    title: 'Governance',
    description: 'Override, Hint-Freigabe und KI-Strategie.',
    emoji: '🧠',
  },
  {
    href: '/settings/account',
    title: 'Legal & Konto',
    description: 'Privacy, Terms und Fortschritt zurücksetzen.',
    emoji: '📄',
  },
  {
    href: '/guide',
    title: 'Spielhilfe',
    description: 'Kurz, visuell und sofort spielbereit.',
    emoji: '🧭',
  },
];

export default function SettingsHubPage() {
  const router = useRouter();
  const { totalXP, players, currentRound } = useGameStore();
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-4 md:p-10 space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">⚙️ Einstellungen</h1>
          <p className="text-xs uppercase tracking-widest opacity-60 font-bold mt-1">
            Klarer Flow in vier Bereichen
          </p>
        </div>
        <div className="flex gap-2">
          {gameIsActive && (
            <button
              onClick={() => router.push('/game')}
              className="px-6 py-3 rounded-2xl bg-[var(--color-accent)] text-white font-black text-sm"
            >
              ▶ Zurück zum Spiel
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-2xl border border-white/15 text-white font-black text-sm hover:bg-white/5"
          >
            Zurück
          </button>
        </div>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Spieler" value={String(players.length)} />
        <StatCard label="XP Gesamt" value={totalXP.toLocaleString()} />
        <StatCard label="Level" value={String(currentLevel)} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
          >
            <p className="text-2xl mb-3">{section.emoji}</p>
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="text-sm opacity-70 mt-1">{section.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-widest font-black opacity-50">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}
