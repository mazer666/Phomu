'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';

export default function SettingsAccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { resetProgress, currentRound } = useGameStore();
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <Header
        title={`📄 ${t('settings.account.title')}`}
        onBack={() => router.push('/settings')}
        gameIsActive={gameIsActive}
        onBackToGame={() => router.push('/game')}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-black">
          {t('settings.account.legalSection')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/privacy"
            className="px-4 py-2 rounded-xl bg-white/10 text-sm font-black hover:bg-white/20"
          >
            {t('legal.privacy.linkLabel')}
          </Link>
          <Link
            href="/terms"
            className="px-4 py-2 rounded-xl bg-white/10 text-sm font-black hover:bg-white/20"
          >
            {t('legal.terms.linkLabel')}
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-red-400/30 bg-red-500/5 p-5 space-y-3">
        <h2 className="text-lg font-black text-red-300">
          {t('settings.account.dangerZone')}
        </h2>
        <p className="text-sm opacity-80">
          {t('settings.account.resetDescription')}
        </p>
        <button
          onClick={() => {
            if (confirm(t('settings.account.resetConfirm'))) {
              resetProgress();
              alert(t('settings.account.resetDone'));
            }
          }}
          className="px-4 py-2 rounded-xl border border-red-400/40 text-red-300 text-sm font-black hover:bg-red-500/10"
        >
          {t('settings.account.resetButton')}
        </button>
      </section>
    </main>
  );
}

function Header({
  title,
  onBack,
  gameIsActive,
  onBackToGame,
}: {
  title: string;
  onBack: () => void;
  gameIsActive?: boolean;
  onBackToGame?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-black">{title}</h1>
      <div className="flex gap-2">
        {gameIsActive && onBackToGame && (
          <button
            onClick={onBackToGame}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-black"
          >
            {t('settings.toGame')}
          </button>
        )}
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-white/15 text-white text-sm font-black hover:bg-white/5"
        >
          {t('settings.backToOverview')}
        </button>
      </div>
    </header>
  );
}
