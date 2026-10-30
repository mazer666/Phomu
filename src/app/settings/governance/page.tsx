'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import type {
  AIQueueStrategy,
  HintReleasePolicy,
  OverrideGovernance,
} from '@/types/game-state';
import { Icon } from '@/components/art/Icon';

export default function SettingsGovernancePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { config, setConfig, currentRound } = useGameStore();
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <Header
        title={`${t('settings.governance.title')}`}
        onBack={() => router.push('/settings')}
        gameIsActive={gameIsActive}
        onBackToGame={() => router.push('/game')}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <SelectRow
          label={t('settings.governance.overrideLabel')}
          value={config.overrideGovernance}
          onChange={(v) =>
            setConfig({ overrideGovernance: v as OverrideGovernance })
          }
          options={[
            { value: 'host', label: t('settings.governance.optionHost') },
            { value: 'co-host', label: t('settings.governance.optionCoHost') },
            {
              value: 'majority',
              label: t('settings.governance.optionMajority'),
            },
          ]}
        />

        <SelectRow
          label={t('settings.governance.hintPolicyLabel')}
          value={config.hintReleasePolicy}
          onChange={(v) =>
            setConfig({ hintReleasePolicy: v as HintReleasePolicy })
          }
          options={[
            {
              value: 'auto-publish',
              label: t('settings.governance.optionAutoPublish'),
            },
            {
              value: 'manual-review',
              label: t('settings.governance.optionManualReview'),
            },
          ]}
        />

        <SelectRow
          label={t('settings.governance.aiStrategyLabel')}
          value={config.aiQueueStrategy}
          onChange={(v) => setConfig({ aiQueueStrategy: v as AIQueueStrategy })}
          options={[
            {
              value: 'queue-retry-pending',
              label: t('settings.governance.optionQueueRetry'),
            },
            {
              value: 'fail-fast',
              label: t('settings.governance.optionFailFast'),
            },
          ]}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest opacity-60">
          <Icon name="brain" size={20} className="text-[var(--color-accent)]" />
          {t('settings.governance.gameRules')}
        </h2>
        <ToggleRow
          label={t('settings.governance.strictMode')}
          description={t('settings.governance.strictModeDescription')}
          value={config.noCheatMode}
          onChange={(v) => setConfig({ noCheatMode: v })}
        />
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

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-black">{label}</p>
        <p className="text-xs opacity-50 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 ${value ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
      >
        {value ? t('settings.on') : t('settings.off')}
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest font-black opacity-60 mb-2">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
