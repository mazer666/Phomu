'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';

interface InGameSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveParty: () => void;
  onOpenFullSettings: () => void;
}

function Slider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-widest opacity-70">{label}</span>
        <span className="text-xs font-black tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Math.max(0, Math.min(1, Number(e.target.value) / 100)))}
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

export function InGameSettingsPanel({
  isOpen,
  onClose,
  onLeaveParty,
  onOpenFullSettings,
}: InGameSettingsPanelProps) {
  const router = useRouter();
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111217] text-white p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black uppercase tracking-wider">⚙ Spiel-Einstellungen</h2>
              <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100" aria-label="Schließen">
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest">Hintergrundmusik</span>
                  <button
                    onClick={() => setAudioSettings({ musicEnabled: !musicEnabled })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${musicEnabled ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
                  >
                    {musicEnabled ? 'AN' : 'AUS'}
                  </button>
                </div>
                <Slider
                  label="Musik-Lautstärke"
                  value={musicVolume}
                  disabled={!musicEnabled}
                  onChange={(value) => setAudioSettings({ musicVolume: value })}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest">Soundeffekte</span>
                  <button
                    onClick={() => setAudioSettings({ sfxEnabled: !sfxEnabled })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${sfxEnabled ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
                  >
                    {sfxEnabled ? 'AN' : 'AUS'}
                  </button>
                </div>
                <Slider
                  label="SFX-Lautstärke"
                  value={sfxVolume}
                  disabled={!sfxEnabled}
                  onChange={(value) => setAudioSettings({ sfxVolume: value })}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Musik-Anbieter</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <button
                    onClick={() => setPreferredMusicProvider('youtube')}
                    className={`py-2 rounded-lg text-xs font-black ${preferredMusicProvider === 'youtube' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
                  >
                    YouTube
                  </button>
                  <button
                    onClick={() => setPreferredMusicProvider('spotify-premium')}
                    className={`py-2 rounded-lg text-xs font-black ${preferredMusicProvider === 'spotify-premium' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
                  >
                    Spotify
                  </button>
                  <button
                    onClick={() => setPreferredMusicProvider('spotify-free')}
                    className={`py-2 rounded-lg text-xs font-black ${preferredMusicProvider === 'spotify-free' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
                  >
                    Spotify Free
                  </button>
                  <button
                    onClick={() => setPreferredMusicProvider('amazon-music')}
                    className={`py-2 rounded-lg text-xs font-black ${preferredMusicProvider === 'amazon-music' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100 bg-black/30'}`}
                  >
                    Amazon Prime
                  </button>
                </div>
                <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">YouTube Player</p>
                <div className="flex bg-black/30 p-1 rounded-xl">
                  <button
                    onClick={() => setPreferredPlayer('standard')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black ${preferredPlayer === 'standard' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100'}`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setPreferredPlayer('music')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black ${preferredPlayer === 'music' ? 'bg-[var(--color-accent)] text-white' : 'opacity-50 hover:opacity-100'}`}
                  >
                    Music
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest">Strict Mode</span>
                    <p className="text-[10px] opacity-40 mt-0.5">Deaktiviert alle Cheats &amp; Joker</p>
                  </div>
                  <button
                    onClick={() => setConfig({ noCheatMode: !config.noCheatMode })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${config.noCheatMode ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}
                  >
                    {config.noCheatMode ? 'AN' : 'AUS'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={onOpenFullSettings}
                className="py-2.5 rounded-xl border border-white/15 text-xs font-black hover:bg-white/5"
              >
                Erweiterte Settings
              </button>
              <button
                onClick={() => { onClose(); router.push('/settings/game-rules'); }}
                className="py-2.5 rounded-xl border border-white/15 text-xs font-black hover:bg-white/5 sm:col-span-2"
              >
                🎮 Modi &amp; Packs ändern
              </button>
              <button
                onClick={() => window.open('/projector', '_blank')}
                className="py-2.5 rounded-xl border border-white/15 text-xs font-black hover:bg-white/5 sm:col-span-3"
              >
                📺 Projector-Modus öffnen
              </button>
              <button
                onClick={onLeaveParty}
                className="py-2.5 rounded-xl border border-red-400/30 text-red-300 text-xs font-black hover:bg-red-500/10"
              >
                Party verlassen
              </button>
              <button
                onClick={onClose}
                className="py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-black"
              >
                Zurück zum Spiel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
