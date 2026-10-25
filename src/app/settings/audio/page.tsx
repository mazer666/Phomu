'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';
import type { MusicProvider } from '@/config/game-config';

const PROVIDERS: Array<{ value: MusicProvider; label: string; note: string }> = [
  { value: 'youtube', label: 'YouTube', note: 'Standard' },
  { value: 'spotify-premium', label: 'Spotify', note: 'Premium benötigt' },
  { value: 'spotify-free', label: 'Spotify Free', note: 'Preview-basiert' },
  { value: 'amazon-music', label: 'Amazon Music', note: 'Preview-basiert' },
];

export default function SettingsAudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLobby = searchParams.get('from') === 'lobby';
  const {
    preferredMusicProvider,
    setPreferredMusicProvider,
    preferredPlayer,
    setPreferredPlayer,
    musicEnabled,
    musicVolume,
    sfxEnabled,
    sfxVolume,
    setAudioSettings,
    currentRound,
  } = useGameStore();
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <Header
        title="🔊 Audio & Provider"
        onBack={() => router.push(fromLobby ? '/lobby' : '/settings')}
        backLabel={fromLobby ? '← Zurück zur Lobby' : 'Zur Übersicht'}
        gameIsActive={gameIsActive}
        onBackToGame={() => router.push('/game')}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <p className="text-xs uppercase tracking-widest font-black opacity-60">Musik-Anbieter</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreferredMusicProvider(p.value)}
              className={`text-left rounded-xl border p-3 transition-colors ${preferredMusicProvider === p.value ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 bg-black/20'}`}
            >
              <p className="font-black text-sm">{p.label}</p>
              <p className="text-xs opacity-65">{p.note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <p className="text-xs uppercase tracking-widest font-black opacity-60">YouTube Player Modus</p>
        <div className="flex bg-black/20 p-1 rounded-xl">
          <button
            onClick={() => setPreferredPlayer('standard')}
            className={`flex-1 py-2 rounded-lg text-xs font-black ${preferredPlayer === 'standard' ? 'bg-[var(--color-accent)] text-white' : 'opacity-60'}`}
          >
            Standard
          </button>
          <button
            onClick={() => setPreferredPlayer('music')}
            className={`flex-1 py-2 rounded-lg text-xs font-black ${preferredPlayer === 'music' ? 'bg-[var(--color-accent)] text-white' : 'opacity-60'}`}
          >
            Music
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
        <ToggleRow
          label="Hintergrundmusik"
          enabled={musicEnabled}
          onToggle={() => setAudioSettings({ musicEnabled: !musicEnabled })}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!musicEnabled}
          value={Math.round(musicVolume * 100)}
          onChange={(e) => setAudioSettings({ musicVolume: Number(e.target.value) / 100 })}
          className="w-full accent-[var(--color-accent)]"
        />

        <ToggleRow
          label="Soundeffekte"
          enabled={sfxEnabled}
          onToggle={() => setAudioSettings({ sfxEnabled: !sfxEnabled })}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!sfxEnabled}
          value={Math.round(sfxVolume * 100)}
          onChange={(e) => setAudioSettings({ sfxVolume: Number(e.target.value) / 100 })}
          className="w-full accent-[var(--color-accent)]"
        />
      </section>
    </main>
  );
}

function Header({ title, onBack, backLabel = 'Zur Übersicht', gameIsActive, onBackToGame }: { title: string; onBack: () => void; backLabel?: string; gameIsActive?: boolean; onBackToGame?: () => void }) {
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
          {backLabel}
        </button>
      </div>
    </header>
  );
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-black uppercase tracking-wider opacity-80">{label}</p>
      <button
        onClick={onToggle}
        className={`px-3 py-1 rounded-lg text-xs font-black ${enabled ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/70'}`}
      >
        {enabled ? 'AN' : 'AUS'}
      </button>
    </div>
  );
}
