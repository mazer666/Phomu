'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { ModeSelector } from '@/components/lobby/ModeSelector';
import { PackSelector } from '@/components/lobby/PackSelector';
import type { GameMode } from '@/config/game-config';

export default function SettingsGameRulesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { config, setConfig, currentRound } = useGameStore();
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            🎮 {t('settings.gameRules.title')}
          </h1>
          {gameIsActive && (
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mt-1">
              {t('settings.gameRules.keepPoints')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {gameIsActive && (
            <button
              onClick={() => router.push('/game')}
              className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-black"
            >
              {t('settings.toGame')}
            </button>
          )}
          <button
            onClick={() => router.push(gameIsActive ? '/settings' : '/lobby')}
            className="px-4 py-2 rounded-xl border border-white/15 text-white text-sm font-black hover:bg-white/5"
          >
            {gameIsActive
              ? t('settings.backToOverview')
              : t('settings.backToLobby')}
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest opacity-50 px-1">
          {t('settings.gameRules.activeModes')}
        </h2>
        <ModeSelector
          selectedModes={config.selectedModes}
          onChange={(modes: GameMode[]) => setConfig({ selectedModes: modes })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest opacity-50 px-1">
          {t('settings.gameRules.songPacks')}
        </h2>
        <PackSelector
          selectedPacks={config.selectedPacks}
          onChange={(packs) => setConfig({ selectedPacks: packs })}
        />
      </section>

      {gameIsActive && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200 font-bold">
          ℹ️ {t('settings.gameRules.changeNotice')}
        </div>
      )}
    </main>
  );
}
