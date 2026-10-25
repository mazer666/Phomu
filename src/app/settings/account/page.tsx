'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';

export default function SettingsAccountPage() {
  const router = useRouter();
  const { resetProgress, currentRound } = useGameStore();
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <Header title="📄 Legal & Konto" onBack={() => router.push('/settings')} gameIsActive={gameIsActive} onBackToGame={() => router.push('/game')} />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-black">Rechtliches</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 rounded-xl bg-white/10 text-sm font-black hover:bg-white/20">
            Privacy Notice
          </Link>
          <Link href="/terms" className="px-4 py-2 rounded-xl bg-white/10 text-sm font-black hover:bg-white/20">
            Terms of Service
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-red-400/30 bg-red-500/5 p-5 space-y-3">
        <h2 className="text-lg font-black text-red-300">Gefahrzone</h2>
        <p className="text-sm opacity-80">Setzt den lokalen Fortschritt (XP) zurück.</p>
        <button
          onClick={() => {
            if (confirm('Möchtest du wirklich deinen gesamten Fortschritt (XP) löschen?')) {
              resetProgress();
              alert('Fortschritt wurde zurückgesetzt.');
            }
          }}
          className="px-4 py-2 rounded-xl border border-red-400/40 text-red-300 text-sm font-black hover:bg-red-500/10"
        >
          XP zurücksetzen
        </button>
      </section>
    </main>
  );
}

function Header({ title, onBack, gameIsActive, onBackToGame }: { title: string; onBack: () => void; gameIsActive?: boolean; onBackToGame?: () => void }) {
  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-black">{title}</h1>
      <div className="flex gap-2">
        {gameIsActive && onBackToGame && (
          <button onClick={onBackToGame} className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-black">
            ▶ Zum Spiel
          </button>
        )}
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-white/15 text-white text-sm font-black hover:bg-white/5">
          Zur Übersicht
        </button>
      </div>
    </header>
  );
}
