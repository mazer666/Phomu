/**
 * The content of the in-game settings.
 *
 * WHAT: the panels of the in-game settings — the audio, the music provider
 * and the actions that leave the round.
 *
 * WHY the content is a component of its own: in the portrait the settings
 * are a modal over the game, in the landscape they stand in the side column
 * next to the scoreboard. Both draw the same panels — without a component
 * of its own they would be written twice and the two would drift apart.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';

// ─── Props ────────────────────────────────────────────────────────

interface InGameSettingsContentProps {
  /** Closes the settings — the modal in the portrait, the disclosure in the landscape. */
  onClose: () => void;
  /** Leaves the party and returns to the lobby. */
  onLeaveParty: () => void;
  /** Opens the full settings of the shell. */
  onOpenFullSettings: () => void;
}

// ─── Slider ───────────────────────────────────────────────────────

function Slider({
  label,
  value,
  onChange,
  disabled,
  percentLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  percentLabel: string;
}) {
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-widest opacity-70">
          {label}
        </span>
        <span className="text-xs font-black tabular-nums">{percentLabel}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={Math.round(value * 100)}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(1, Number(e.target.value) / 100)))
        }
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

// ─── Komponente ───────────────────────────────────────────────────

export function InGameSettingsContent({
  onClose,
  onLeaveParty,
  onOpenFullSettings,
}: InGameSettingsContentProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // Format the percentage with the active locale (Intl, no toLocaleString without a locale)
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        style: 'percent',
        maximumFractionDigits: 0,
      }),
    [i18n.language]
  );
  const {
    preferredPlayer,
    setPreferredPlayer,
    preferredMusicProvider,
    setPreferredMusicProvider,
    musicEnabled,
    musicVolume,
    sfxEnabled,
    sfxVolume,
    setAudioSettings,
    config,
    setConfig,
  } = useGameStore();

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest">
              {t('game.settings.backgroundMusic')}
            </span>
            <button
              onClick={() => setAudioSettings({ musicEnabled: !musicEnabled })}
              className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-black ${musicEnabled ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
            >
              {musicEnabled ? t('game.settings.on') : t('game.settings.off')}
            </button>
          </div>
          <Slider
            label={t('game.settings.musicVolume')}
            value={musicVolume}
            percentLabel={percentFormatter.format(musicVolume)}
            disabled={!musicEnabled}
            onChange={(value) => setAudioSettings({ musicVolume: value })}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest">
              {t('game.settings.soundEffects')}
            </span>
            <button
              onClick={() => setAudioSettings({ sfxEnabled: !sfxEnabled })}
              className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-black ${sfxEnabled ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
            >
              {sfxEnabled ? t('game.settings.on') : t('game.settings.off')}
            </button>
          </div>
          <Slider
            label={t('game.settings.sfxVolume')}
            value={sfxVolume}
            percentLabel={percentFormatter.format(sfxVolume)}
            disabled={!sfxEnabled}
            onChange={(value) => setAudioSettings({ sfxVolume: value })}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">
            {t('game.settings.musicProvider')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => setPreferredMusicProvider('youtube')}
              className={`py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredMusicProvider === 'youtube' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
            >
              YouTube
            </button>
            <button
              onClick={() => setPreferredMusicProvider('spotify-premium')}
              className={`py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredMusicProvider === 'spotify-premium' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
            >
              Spotify
            </button>
            <button
              onClick={() => setPreferredMusicProvider('spotify-free')}
              className={`py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredMusicProvider === 'spotify-free' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
            >
              Spotify Free
            </button>
            <button
              onClick={() => setPreferredMusicProvider('amazon-music')}
              className={`py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredMusicProvider === 'amazon-music' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
            >
              Amazon Prime
            </button>
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">
            {t('game.settings.youtubePlayer')}
          </p>
          <div className="flex bg-black/30 p-1 rounded-xl">
            <button
              onClick={() => setPreferredPlayer('standard')}
              className={`flex-1 py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredPlayer === 'standard' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100'}`}
            >
              {t('game.settings.playerStandard')}
            </button>
            <button
              onClick={() => setPreferredPlayer('music')}
              className={`flex-1 py-2 min-h-[44px] rounded-lg text-xs font-black ${preferredPlayer === 'music' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100'}`}
            >
              {t('game.settings.playerMusic')}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest">
                {t('game.settings.strictMode')}
              </span>
              <p className="text-[10px] opacity-40 mt-0.5">
                {t('game.settings.strictModeHint')}
              </p>
            </div>
            <button
              onClick={() => setConfig({ noCheatMode: !config.noCheatMode })}
              className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-black ${config.noCheatMode ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
            >
              {config.noCheatMode
                ? t('game.settings.on')
                : t('game.settings.off')}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={onOpenFullSettings}
          className="py-2.5 min-h-[44px] rounded-xl border border-white/15 text-xs font-black hover:bg-white/5"
        >
          {t('game.settings.advancedSettings')}
        </button>
        <button
          onClick={() => {
            onClose();
            router.push('/settings/game-rules');
          }}
          className="py-2.5 min-h-[44px] rounded-xl border border-white/15 text-xs font-black hover:bg-white/5 sm:col-span-2"
        >
          {t('game.settings.changeModesPacks')}
        </button>
        <button
          onClick={() => window.open('/projector', '_blank')}
          className="py-2.5 min-h-[44px] rounded-xl border border-white/15 text-xs font-black hover:bg-white/5 sm:col-span-3"
        >
          {t('game.settings.openProjector')}
        </button>
        <button
          onClick={onLeaveParty}
          className="py-2.5 min-h-[44px] rounded-xl border border-red-400/30 text-red-300 text-xs font-black hover:bg-red-500/10"
        >
          {t('game.settings.leaveParty')}
        </button>
        <button
          onClick={onClose}
          className="py-2.5 min-h-[44px] rounded-xl bg-[var(--color-accent)] text-white text-xs font-black"
        >
          {t('game.settings.backToGame')}
        </button>
      </div>
    </>
  );
}
